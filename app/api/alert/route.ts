import { NextRequest, NextResponse } from 'next/server';
import { sendSMS } from '@/lib/sms';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, message } = body;

    if (!phone || !message) {
      return NextResponse.json(
        { error: 'Both phone and message are required.' },
        { status: 400 }
      );
    }

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      return NextResponse.json(
        { error: 'Please enter a valid 10-digit Indian mobile number.' },
        { status: 400 }
      );
    }

    const smsContent = `MedRadar Corridor Alert: ${message.slice(0, 130)}... https://medradar-vit.vercel.app`;

    const result = await sendSMS(cleanPhone, smsContent);

    return NextResponse.json({
      success: true,
      message: result.message || `Distributor alert queued for +91 ${cleanPhone}.`
    });
  } catch (err: any) {
    console.error('Alert dispatch error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
