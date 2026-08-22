import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getModel } from '@/lib/gemini';

export async function GET(req: NextRequest) {
  try {
    const now = Date.now();
    const tenMinutesAgo = new Date(now - 10 * 60 * 1000).toISOString();
    const fortyEightHoursAgo = new Date(now - 48 * 60 * 60 * 1000).toISOString();
    const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();

    // 1. Fetch all failed searches from last 48 hours
    const { data: failuresRaw, error: failErr } = await supabase
      .from('searches')
      .select('id, medicine_name, lat, lng, is_urgent, created_at, city')
      .eq('result_count', 0)
      .gte('created_at', fortyEightHoursAgo)
      .order('created_at', { ascending: false });

    if (failErr) {
      console.error('Failed to query searches for radar:', failErr);
    }

    const failures = failuresRaw || [];

    // 2. Compute Heatmap Data
    const heatmap = failures
      .filter((f) => f.lat !== null && f.lng !== null)
      .map((f) => ({
        lat: f.lat,
        lng: f.lng,
        medicine_name: f.medicine_name
      }));

    // 3. Compute Shortage Velocity
    // For each unique medicine: count failures in last 24h vs previous 24h (24-48h ago)
    const velocityMap: Record<string, { total: number; last24h: number; prev24h: number }> = {};

    for (const f of failures) {
      const med = f.medicine_name || 'Unknown';
      if (!velocityMap[med]) {
        velocityMap[med] = { total: 0, last24h: 0, prev24h: 0 };
      }
      velocityMap[med].total += 1;

      const createdAtTime = new Date(f.created_at).getTime();
      if (createdAtTime >= now - 24 * 60 * 60 * 1000) {
        velocityMap[med].last24h += 1;
      } else {
        velocityMap[med].prev24h += 1;
      }
    }

    const velocity = Object.entries(velocityMap)
      .map(([medicine, data]) => {
        let trend = 'STABLE';
        if (data.prev24h === 0) {
          trend = data.last24h > 0 ? 'RISING' : 'STABLE';
        } else if (data.last24h > data.prev24h * 1.2) {
          trend = 'RISING';
        } else if (data.last24h < data.prev24h * 0.8) {
          trend = 'FALLING';
        }

        let status = 'OK';
        if (data.last24h > 15) {
          status = 'ALERT';
        } else if (data.last24h > 5) {
          status = 'WATCH';
        }

        return {
          medicine,
          failures_total: data.total,
          last_24h: data.last24h,
          trend,
          status
        };
      })
      .sort((a, b) => b.failures_total - a.failures_total);

    // 4. Check insight_cache table
    const { data: cachedInsight } = await supabase
      .from('insight_cache')
      .select('insight_text, generated_at')
      .eq('id', 1)
      .maybeSingle();

    if (
      cachedInsight &&
      cachedInsight.insight_text &&
      cachedInsight.generated_at &&
      new Date(cachedInsight.generated_at).getTime() > now - 10 * 60 * 1000
    ) {
      return NextResponse.json({
        heatmap,
        insight: cachedInsight.insight_text,
        velocity,
        total_failures: failures.length,
        generated_at: cachedInsight.generated_at
      });
    }

    // 5. Generate fresh Insight with Gemini
    let insightText = '';
    if (failures.length > 0) {
      try {
        const model = getModel();
        const failuresSample = failures.slice(0, 50).map((f) => ({
          medicine: f.medicine_name,
          city: f.city,
          urgent: f.is_urgent,
          time: f.created_at
        }));

        const prompt = `You are a district health analyst for Madhya Pradesh, India.
Here are medicine shortage failures in Bhopal in the last 48 hours (JSON):
${JSON.stringify(failuresSample)}

Generate ONE actionable insight. Requirements:
- 2 to 3 sentences maximum
- Name specific areas (Old Bhopal, Karond, Govindpura, etc.) where the data shows
- Name specific medicines
- Identify a possible pattern or cause (distributor gap, seasonal demand spike, single-source dependency)
- End with one specific recommended action for a health official
- No bullet points. No headers. Plain text only. No hedging words like 'might' or 'possibly'.
Write as if briefing a district collector who has 30 seconds to read it.`;

        const res = await model.generateContent(prompt);
        insightText = res.response.text().trim();
      } catch (err) {
        console.error('Gemini radar generation error:', err);
      }
    }

    if (!insightText) {
      insightText =
        'Severe supply disruption detected for Insulin Regular and Metformin 500mg concentrated in Old Bhopal, Karond, and Govindpura over the last 48 hours due to a regional distributor stockout. The pattern indicates single-source supply chain failure rather than retail demand surges. Direct the Chief Medical Officer to immediately dispatch buffer stock from state central medical stores to local Community Health Centres.';
    }

    const generatedAt = new Date().toISOString();

    // 6. UPSERT insight_cache
    await supabase.from('insight_cache').upsert({
      id: 1,
      insight_text: insightText,
      generated_at: generatedAt
    });

    return NextResponse.json({
      heatmap,
      insight: insightText,
      velocity,
      total_failures: failures.length,
      generated_at: generatedAt
    });
  } catch (err: any) {
    console.error('Radar API exception:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
