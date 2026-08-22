import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { haversine } from '@/lib/haversine';
import { resolveAlias } from '@/lib/aliases';

async function processFeedback(phone: string, rawMedicine: string, found: boolean) {
  const normalizedPhone = phone.startsWith('+') ? phone : `+${phone.replace(/\D/g, '')}`;
  const canonical = await resolveAlias(rawMedicine.trim());
  const firstWord = canonical.trim().split(/\s+/)[0];

  // 1. Fetch patient record from waiting_list to get coordinates
  const { data: patientRecord } = await supabase
    .from('waiting_list')
    .select('id, lat, lng')
    .eq('phone', normalizedPhone)
    .ilike('medicine_name', `%${firstWord}%`)
    .maybeSingle();

  // 2. Update waiting_list feedback_result
  await supabase
    .from('waiting_list')
    .update({ feedback_result: found ? 'found' : 'not_found' })
    .eq('phone', normalizedPhone)
    .ilike('medicine_name', `%${firstWord}%`);

  // 3. If found is false, auto-correct stock for pharmacies within 1km
  if (!found && patientRecord?.lat && patientRecord?.lng) {
    const { data: allPharmacies } = await supabase
      .from('pharmacies')
      .select('id, lat, lng');

    if (allPharmacies && allPharmacies.length > 0) {
      const nearbyPharmIds: string[] = [];
      for (const ph of allPharmacies) {
        if (ph.lat !== null && ph.lng !== null) {
          const dist = haversine(patientRecord.lat, patientRecord.lng, ph.lat, ph.lng);
          if (dist <= 1.0) {
            nearbyPharmIds.push(ph.id);
          }
        }
      }

      if (nearbyPharmIds.length > 0) {
        await supabase
          .from('stock')
          .update({ available: false, updated_at: new Date().toISOString() })
          .in('pharmacy_id', nearbyPharmIds)
          .ilike('medicine_name', `%${firstWord}%`);
      }
    }
  }

  return { success: true };
}

// GET /api/feedback?phone=...&medicine=...&result=YES
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get('phone') || '';
    const medicine = searchParams.get('medicine') || searchParams.get('med') || '';
    const result = (searchParams.get('result') || '').toUpperCase();

    if (!phone || !medicine) {
      return NextResponse.json({ error: 'phone and medicine query params required.' }, { status: 400 });
    }

    const found = result === 'YES' || result === 'TRUE' || result === 'FOUND';
    const res = await processFeedback(phone, medicine, found);
    return NextResponse.json(res);
  } catch (err: any) {
    console.error('Feedback GET error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/feedback
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, medicine_name, found } = body;

    if (!phone || !medicine_name || typeof found !== 'boolean') {
      return NextResponse.json(
        { error: 'phone, medicine_name, and found (boolean) are required.' },
        { status: 400 }
      );
    }

    const res = await processFeedback(phone, medicine_name, found);
    return NextResponse.json(res);
  } catch (err: any) {
    console.error('Feedback POST error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
