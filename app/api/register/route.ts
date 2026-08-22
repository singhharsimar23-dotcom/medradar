import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendSMS } from '@/lib/sms';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, area, phone, lat, lng } = body;

    if (!name || !area || !phone || typeof lat !== 'number' || typeof lng !== 'number') {
      return NextResponse.json(
        { error: 'name, area, phone, lat, and lng are all required fields.' },
        { status: 400 }
      );
    }

    const cleanPhone = phone.trim();

    // 1. Check if phone already exists in pharmacies table
    const { data: existingPharmacy } = await supabase
      .from('pharmacies')
      .select('id')
      .eq('phone', cleanPhone)
      .maybeSingle();

    if (existingPharmacy) {
      return NextResponse.json(
        { error: 'A pharmacy with this phone number is already registered.' },
        { status: 409 }
      );
    }

    // 2. Insert into pharmacies with is_pending_approval = true
    const { data: inserted, error } = await supabase
      .from('pharmacies')
      .insert({
        name: name.trim(),
        area: area.trim(),
        phone: cleanPhone,
        lat,
        lng,
        is_pending_approval: true,
        type: 'private',
        is_open: true
      })
      .select('id')
      .single();

    if (error) {
      console.error('Pharmacy registration error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 3. Send SMS notification to admin if configured
    const adminPhone = process.env.NEXT_PUBLIC_ADMIN_PHONE || process.env.ADMIN_PHONE;
    if (adminPhone) {
      const adminSms = `MedRadar: New pharmacist registration: ${name}, ${area}, ${cleanPhone}. Approve in dashboard.`;
      await sendSMS(adminPhone, adminSms);
    }

    // 4. Send confirmation SMS to registering pharmacist
    const pharmacistConfirmationSms = `MedRadar: Registration submit ho gayi! Approval ke baad aap active ho jayenge. 24 ghante mein confirm karenge.`;
    await sendSMS(cleanPhone, pharmacistConfirmationSms);

    return NextResponse.json({
      success: true,
      id: inserted?.id,
      message: 'Registration submitted successfully.'
    });
  } catch (err: any) {
    console.error('Register API exception:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
