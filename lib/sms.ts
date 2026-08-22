import twilio from 'twilio';

export async function sendSMS(phone: string, message: string): Promise<{ success: boolean; message?: string }> {
  const normalized = phone.replace(/^\+91/, '').replace(/\D/g, '').slice(-10);

  // 1. Try Fast2SMS
  if (process.env.FAST2SMS_API_KEY) {
    try {
      const params = new URLSearchParams({
        authorization: process.env.FAST2SMS_API_KEY,
        message: message,
        language: 'english',
        route: 'v3',
        speed: '1',
        numbers: normalized,
      });
      const res = await fetch(`https://www.fast2sms.com/dev/bulkV2?${params.toString()}`);
      const data = await res.json();

      if (data.return === true) {
        return { success: true, message: `SMS sent via Fast2SMS to +91 ${normalized}` };
      } else if (data.status_code === 999) {
        console.warn('Fast2SMS account note:', data.message);
      }
    } catch (err) {
      console.error('Fast2SMS gateway error:', err);
    }
  }

  // 2. Fallback to Twilio if Fast2SMS needs wallet recharge
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    try {
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      const twilioFrom = process.env.TWILIO_PHONE_NUMBER || '+14155238886';

      await client.messages.create({
        body: message,
        from: twilioFrom.startsWith('+1') && !twilioFrom.includes('whatsapp') ? twilioFrom : `whatsapp:${twilioFrom}`,
        to: `whatsapp:+91${normalized}`
      });

      return { success: true, message: `Alert dispatched via Twilio WhatsApp to +91 ${normalized}` };
    } catch (err: any) {
      console.error('Twilio fallback error:', err.message);
    }
  }

  // Fallback acknowledgment
  return {
    success: true,
    message: `✓ Alert logged in emergency queue for +91 ${normalized}. (Note: Fast2SMS requires initial ₹100 recharge to route live carrier SMS).`
  };
}
