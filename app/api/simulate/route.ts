import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { haversine } from '@/lib/haversine';
import { sendSMS } from '@/lib/sms';
import { resolveAlias } from '@/lib/aliases';

// GET /api/simulate - Returns list of pharmacies for dashboard dropdown
export async function GET() {
  try {
    const { data: pharmacies, error } = await supabase
      .from('pharmacies')
      .select('id, name, area, city, lat, lng, type')
      .order('city', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Simulate GET error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      pharmacies: pharmacies || []
    });
  } catch (err: any) {
    console.error('Simulate GET exception:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/simulate - Simulates stock arrival and triggers patient notifications
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawMedicine = body.medicine_name || 'Insulin Regular';
    const targetArea = body.pharmacy_area || 'Karond';

    const canonicalMedicine = await resolveAlias(rawMedicine.trim());
    const firstWord = canonicalMedicine.trim().split(/\s+/)[0];

    // 1. Find pharmacy by area (or first available pharmacy)
    let { data: pharmacy } = await supabase
      .from('pharmacies')
      .select('id, name, area, city, lat, lng')
      .ilike('area', `%${targetArea}%`)
      .limit(1)
      .maybeSingle();

    if (!pharmacy) {
      const { data: fallbackPh } = await supabase
        .from('pharmacies')
        .select('id, name, area, city, lat, lng')
        .limit(1)
        .single();
      pharmacy = fallbackPh;
    }

    if (!pharmacy) {
      return NextResponse.json({ error: 'No pharmacy found in database.' }, { status: 404 });
    }

    // 2. Upsert stock: medicine available=true, updated_at=NOW()
    const { error: stockErr } = await supabase
      .from('stock')
      .upsert(
        {
          pharmacy_id: pharmacy.id,
          medicine_name: canonicalMedicine,
          available: true,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'pharmacy_id,medicine_name' }
      );

    if (stockErr) {
      console.error('Simulate stock upsert error:', stockErr);
    }

    // 3. Check waiting_list for matching waiting patients
    const { data: waitingList } = await supabase
      .from('waiting_list')
      .select('*')
      .ilike('medicine_name', `%${firstWord}%`)
      .is('notified_at', null);

    let notifiedCount = 0;
    const pharmLat = pharmacy.lat ?? 23.26;
    const pharmLng = pharmacy.lng ?? 77.41;

    if (waitingList && waitingList.length > 0) {
      for (const patient of waitingList) {
        const pLat = patient.lat ?? 23.26;
        const pLng = patient.lng ?? 77.41;
        const dist = haversine(pharmLat, pharmLng, pLat, pLng);

        if (dist < 10) {
          const smsMsg = `MedRadar: ${canonicalMedicine} available at ${pharmacy.name} (${dist.toFixed(1)}km away). medradar.vercel.app`;
          await sendSMS(patient.phone, smsMsg);
          notifiedCount++;
        }
      }

      if (notifiedCount > 0) {
        await supabase
          .from('waiting_list')
          .update({
            notified_at: new Date().toISOString(),
            feedback_sent_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
          })
          .ilike('medicine_name', `%${firstWord}%`)
          .is('notified_at', null);
      }
    }

    return NextResponse.json({
      success: true,
      pharmacy: pharmacy.name,
      medicine: canonicalMedicine,
      notified: notifiedCount,
      message: 'Stock updated and patients notified'
    });
  } catch (err: any) {
    console.error('Simulate POST exception:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
