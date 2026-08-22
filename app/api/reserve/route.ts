import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendSMS } from '@/lib/sms';

// POST /api/reserve
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { stock_id, patient_phone, pharmacy_id, medicine_name } = body;

    if (!patient_phone || !medicine_name) {
      return NextResponse.json(
        { error: 'patient_phone and medicine_name are required.' },
        { status: 400 }
      );
    }

    const { data: reservation, error } = await supabase
      .from('reservations')
      .insert({
        stock_id: stock_id || null,
        patient_phone,
        pharmacy_id: pharmacy_id || null,
        medicine_name,
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        status: 'reserved'
      })
      .select('id, expires_at')
      .single();

    if (error) {
      console.error('Reservation error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Send SMS confirmation
    await sendSMS(
      patient_phone,
      `MedRadar: ${medicine_name} reserved for 30 mins. Please collect before ${new Date(reservation.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`
    );

    return NextResponse.json({
      success: true,
      reservationId: reservation.id,
      expiresAt: reservation.expires_at
    });
  } catch (err: any) {
    console.error('Reserve API error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
