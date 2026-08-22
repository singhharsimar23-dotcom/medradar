import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { resolveAlias } from '@/lib/aliases';
import { sendSMS } from '@/lib/sms';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { medicine_name, lat, lng, phone, urgent = false } = body;

    if (!medicine_name || typeof lat !== 'number' || typeof lng !== 'number' || !phone) {
      return NextResponse.json(
        { error: 'medicine_name, lat, lng, and phone are all required fields.' },
        { status: 400 }
      );
    }

    // Normalize phone number (ensure +91 prefix for 10-digit Indian numbers)
    const digitsOnly = phone.replace(/\D/g, '');
    const cleanDigits = digitsOnly.slice(-10);
    const normalizedPhone = `+91${cleanDigits}`;

    // Resolve canonical medicine name via alias table
    const canonicalMedicine = await resolveAlias(medicine_name.trim());

    // Insert into waiting_list
    const { data: inserted, error } = await supabase
      .from('waiting_list')
      .insert({
        phone: normalizedPhone,
        medicine_name: canonicalMedicine,
        lat,
        lng,
        is_urgent: Boolean(urgent),
        created_at: new Date().toISOString()
      })
      .select('id')
      .maybeSingle();

    if (error) {
      // Check for unique constraint violation (duplicate waitlist entry)
      if (error.code === '23505' || error.message?.includes('unique') || error.message?.includes('duplicate')) {
        return NextResponse.json({
          success: true,
          message: 'Aap already waitlist mein hain'
        });
      }
      console.error('Waiting list insertion error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Send confirmation SMS
    const confirmationMessage = `MedRadar: Aapka request note ho gaya. Jab ${canonicalMedicine} aapke 10km mein milega, SMS aayega. Dhanyavaad!`;
    await sendSMS(normalizedPhone, confirmationMessage);

    return NextResponse.json({
      success: true,
      message: 'Waitlist mein add ho gaye'
    });
  } catch (err: any) {
    console.error('Waiting API exception:', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
