import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendSMS } from '@/lib/sms';

export async function GET() {
  try {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    // Fetch waiting_list rows where notified_at was over 2 hours ago and feedback_sent_at is null
    const { data: records, error } = await supabase
      .from('waiting_list')
      .select('*')
      .not('notified_at', 'is', null)
      .is('feedback_sent_at', null)
      .lte('notified_at', twoHoursAgo);

    if (error) {
      console.error('Feedback send query error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let sentCount = 0;
    if (records && records.length > 0) {
      for (const item of records) {
        const smsText = `MedRadar: Kya aapko ${item.medicine_name} mil gaya? Reply karo: medradar.vercel.app/feedback?phone=${item.phone}&med=${encodeURIComponent(item.medicine_name)} par YES ya NO`;
        await sendSMS(item.phone, smsText);

        await supabase
          .from('waiting_list')
          .update({ feedback_sent_at: new Date().toISOString() })
          .eq('id', item.id);

        sentCount++;
      }
    }

    return NextResponse.json({
      success: true,
      sentCount,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('Feedback send cron exception:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
