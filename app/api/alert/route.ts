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

    // Clean phone number
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      return NextResponse.json(
        { error: 'Please enter a valid 10-digit Indian mobile number.' },
        { status: 400 }
      );
    }

    // Truncate message to 155 characters for standard 1-page SMS delivery
    const smsContent = `MedRadar Alert: ${message.slice(0, 140)}... medradar-vit.vercel.app`;

    const success = await sendSMS(cleanPhone, smsContent);

    if (success) {
      return NextResponse.json({
        success: true,
        message: `Distributor SMS alert dispatched to +91 ${cleanPhone}.`
      });
    } else {
      return NextResponse.json(
        { error: 'Fast2SMS gateway error. Please verify FAST2SMS_API_KEY credit or phone number.' },
        { status: 502 }
      );
    }
  } catch (err: any) {
    console.error('Alert dispatch exception:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
