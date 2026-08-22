export async function sendSMS(phone: string, message: string): Promise<boolean> {
  try {
    // Normalize phone number — remove +91 prefix, keep 10 digits
    const normalized = phone.replace(/^\+91/, '').replace(/\D/g, '').slice(-10);
    const params = new URLSearchParams({
      authorization: process.env.FAST2SMS_API_KEY!,
      message: message,
      language: 'english',
      route: 'v3',
      speed: '1',
      numbers: normalized,
    });
    const res = await fetch(`https://www.fast2sms.com/dev/bulkV2?${params.toString()}`);
    const data = await res.json();
    return data.return === true;
  } catch (err) {
    console.error('Fast2SMS error:', err);
    return false;
  }
}
