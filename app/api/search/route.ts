import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { haversine } from '@/lib/haversine';
import { resolveAlias } from '@/lib/aliases';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const medicineParam = searchParams.get('medicine');
    const latParam = searchParams.get('lat');
    const lngParam = searchParams.get('lng');
    const urgentParam = searchParams.get('urgent');

    if (!medicineParam || medicineParam.trim() === '') {
      return NextResponse.json({ error: 'Medicine parameter is required.' }, { status: 400 });
    }

    if (!latParam || !lngParam) {
      return NextResponse.json({ error: 'Latitude and Longitude parameters are required.' }, { status: 400 });
    }

    const lat = parseFloat(latParam);
    const lng = parseFloat(lngParam);

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json({ error: 'Valid numerical coordinates are required.' }, { status: 400 });
    }

    const isUrgent = urgentParam === 'true';

    // 1. Resolve canonical medicine name via medicine_aliases
    const canonical = await resolveAlias(medicineParam.trim());
    const firstWord = canonical.trim().split(/\s+/)[0];

    // 2. Query stock joined with pharmacies
    const { data: stockRecords, error: stockErr } = await supabase
      .from('stock')
      .select(`
        id,
        available,
        updated_at,
        medicine_name,
        pharmacies (
          id,
          name,
          address,
          lat,
          lng,
          phone,
          area,
          type,
          is_open,
          is_pending_approval
        )
      `)
      .ilike('medicine_name', `%${firstWord}%`)
      .eq('available', true);

    if (stockErr) {
      console.error('Stock query error:', stockErr);
    }

    const matchedResults: any[] = [];
    const sixHoursAgo = Date.now() - 6 * 60 * 60 * 1000;

    if (stockRecords && stockRecords.length > 0) {
      for (const item of stockRecords) {
        const ph = Array.isArray(item.pharmacies) ? item.pharmacies[0] : item.pharmacies;
        if (!ph || ph.is_pending_approval || ph.lat === null || ph.lng === null) continue;

        const distance = haversine(lat, lng, ph.lat, ph.lng);

        if (distance < 15) {
          const isStale =
            ph.type === 'private' && item.updated_at
              ? new Date(item.updated_at).getTime() < sixHoursAgo
              : false;

          matchedResults.push({
            id: ph.id,
            name: ph.name,
            address: ph.address,
            lat: ph.lat,
            lng: ph.lng,
            phone: ph.phone,
            area: ph.area,
            type: ph.type,
            is_open: ph.is_open ?? true,
            available: item.available,
            updated_at: item.updated_at,
            stock_id: item.id,
            distance: Math.round(distance * 10) / 10,
            isStale
          });
        }
      }
    }

    // Sort by distance ASC, limit 5
    matchedResults.sort((a, b) => a.distance - b.distance);
    const topResults = matchedResults.slice(0, 5);

    // 3. Log search query into searches table
    const { data: insertedSearch, error: searchErr } = await supabase
      .from('searches')
      .insert({
        medicine_name: canonical,
        lat,
        lng,
        result_count: topResults.length,
        is_urgent: isUrgent
      })
      .select('id')
      .single();

    if (searchErr) {
      console.error('Search logging error:', searchErr);
    }

    const searchId = insertedSearch?.id || '';

    // 4. If zero results, find nearest PHC or Janaushadhi within 20km
    let nearestPHC: any = null;
    if (topResults.length === 0) {
      const { data: govtPharmacies } = await supabase
        .from('pharmacies')
        .select('id, name, address, lat, lng, phone, area, type, is_open')
        .in('type', ['PHC', 'CHC', 'janaushadhi', 'district_hospital'])
        .eq('is_pending_approval', false);

      if (govtPharmacies && govtPharmacies.length > 0) {
        let minDistance = 20; // 20km search radius
        for (const gp of govtPharmacies) {
          if (gp.lat !== null && gp.lng !== null) {
            const d = haversine(lat, lng, gp.lat, gp.lng);
            if (d < minDistance) {
              minDistance = d;
              nearestPHC = {
                id: gp.id,
                name: gp.name,
                address: gp.address,
                lat: gp.lat,
                lng: gp.lng,
                phone: gp.phone,
                area: gp.area,
                type: gp.type,
                is_open: gp.is_open,
                distance: Math.round(d * 10) / 10
              };
            }
          }
        }
      }
    }

    return NextResponse.json({
      results: topResults,
      canonical,
      total: topResults.length,
      searchId,
      ...(nearestPHC ? { nearestPHC } : {})
    });
  } catch (err: any) {
    console.error('Search API exception:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
