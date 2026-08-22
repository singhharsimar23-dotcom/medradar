import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getModel, parseJSON } from '@/lib/gemini';
import { sendSMS } from '@/lib/sms';
import { haversine } from '@/lib/haversine';
import { twimlResponse } from '@/lib/twiml';
import { getCanonicalName, resolveAlias } from '@/lib/aliases';

// Helper to fetch Twilio media with Basic Authentication
async function fetchTwilioMediaAsBase64(mediaUrl: string): Promise<string | null> {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const headers: Record<string, string> = {};
    if (accountSid && authToken) {
      headers['Authorization'] = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    }
    const res = await fetch(mediaUrl, { headers });
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer).toString('base64');
  } catch (err) {
    console.error('Error fetching Twilio media:', err);
    return null;
  }
}

// Function to notify waiting patients within 10km radius
async function notifyWaitingPatients(medicineName: string, pharmacy: any): Promise<number> {
  try {
    const firstWord = medicineName.trim().split(/\s+/)[0];
    const { data: waitingList, error } = await supabase
      .from('waiting_list')
      .select('*')
      .ilike('medicine_name', `%${firstWord}%`)
      .is('notified_at', null);

    if (error || !waitingList || waitingList.length === 0) {
      return 0;
    }

    let notifiedCount = 0;
    const pharmLat = pharmacy.lat ?? 23.26;
    const pharmLng = pharmacy.lng ?? 77.41;

    for (const patient of waitingList) {
      const pLat = patient.lat ?? 23.26;
      const pLng = patient.lng ?? 77.41;
      const distance = haversine(pharmLat, pharmLng, pLat, pLng);

      if (distance < 10) {
        const smsMessage = `MedRadar: ${medicineName} available at ${pharmacy.name} (${distance.toFixed(1)}km away). medradar.vercel.app`;
        await sendSMS(patient.phone, smsMessage);
        notifiedCount++;
      }
    }

    if (notifiedCount > 0) {
      await supabase
        .from('waiting_list')
        .update({
          notified_at: new Date().toISOString(),
          feedback_sent_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
        })
        .ilike('medicine_name', `%${firstWord}%`)
        .is('notified_at', null);
    }

    return notifiedCount;
  } catch (err) {
    console.error('Error notifying waiting patients:', err);
    return 0;
  }
}

// Generate Hinglish reply for Pharmacist actions
async function generatePharmacistReply(
  replyContext: string,
  pharmacy: any,
  notifiedCount: number,
  isClosed = false
): Promise<string> {
  try {
    const model = getModel();
    const prompt = `Generate a short WhatsApp reply in Hinglish (mix of Hindi and English) for a pharmacist.
Context: ${replyContext} at ${pharmacy.name || 'Pharmacy'} in ${pharmacy.area || 'Bhopal'}, Bhopal.
${notifiedCount > 0 ? `${notifiedCount} patients were waiting and have been notified by SMS.` : ''}
${isClosed ? 'Pharmacy has been marked closed.' : ''}
Keep it under 3 lines. Be warm, specific, and brief. Use ✓ checkmark. End with one practical tip if relevant.`;

    const res = await model.generateContent(prompt);
    const text = res.response.text().trim();
    if (text) return text;
  } catch (e) {
    console.error('Gemini pharmacist reply generation error:', e);
  }

  // Fallback reply
  if (isClosed) {
    return `✓ ${pharmacy.name} closed mark ho gaya. Khulne par bas 'OPEN' bhej dena.`;
  }
  let fallback = `✓ ${replyContext} update ho gaya MedRadar par.`;
  if (notifiedCount > 0) {
    fallback += `\n${notifiedCount} waiting patients ko SMS bhej diya gaya hai.`;
  }
  return fallback;
}

// Patient search and response formatter
async function performPatientSearch(medicineName: string, userLat: number, userLng: number, isUrgent = false): Promise<string> {
  const firstWord = medicineName.trim().split(/\s+/)[0];
  const { data: stockRecords, error } = await supabase
    .from('stock')
    .select(`
      id,
      medicine_name,
      available,
      updated_at,
      pharmacies (
        id,
        name,
        area,
        lat,
        lng,
        phone,
        type,
        is_open,
        is_pending_approval
      )
    `)
    .ilike('medicine_name', `%${firstWord}%`)
    .eq('available', true);

  if (error) {
    console.error('Stock search error:', error);
  }

  const nearby: any[] = [];
  if (stockRecords && stockRecords.length > 0) {
    for (const item of stockRecords) {
      const ph = Array.isArray(item.pharmacies) ? item.pharmacies[0] : item.pharmacies;
      if (!ph || ph.is_pending_approval) continue;

      const pLat = ph.lat ?? 23.26;
      const pLng = ph.lng ?? 77.41;
      const distance = haversine(userLat, userLng, pLat, pLng);

      if (distance < 15) {
        const isStale = item.updated_at
          ? Date.now() - new Date(item.updated_at).getTime() > 6 * 60 * 60 * 1000
          : false;

        nearby.push({
          name: ph.name,
          area: ph.area,
          phone: ph.phone,
          isOpen: ph.is_open ?? true,
          distance,
          isStale,
          type: ph.type
        });
      }
    }
  }

  // Sort by distance ascending & take top 5
  nearby.sort((a, b) => a.distance - b.distance);
  const topResults = nearby.slice(0, 5);
  const resultCount = topResults.length;

  // Log search into searches table
  await supabase.from('searches').insert({
    medicine_name: medicineName,
    lat: userLat,
    lng: userLng,
    result_count: resultCount,
    is_urgent: isUrgent
  });

  if (resultCount > 0) {
    let reply = `✅ ${medicineName} mila — ${resultCount} pharmacy nearby:\n\n`;
    let hasStale = false;

    topResults.forEach((item, index) => {
      if (item.isStale) hasStale = true;
      const openStatus = item.isOpen ? 'Open' : '❌ Closed';
      const staleTag = item.isStale ? ' ⚠️ 6h+ purana' : '';
      reply += `${index + 1}. ${item.name} (${item.distance.toFixed(1)}km) — ${openStatus}${staleTag}\n   📞 ${item.phone ?? 'No number'}\n\n`;
    });

    if (hasStale) {
      reply += `⚠️ Purana data — call karke confirm karo.`;
    }
    return reply.trim();
  } else {
    // Zero results
    let reply = `❌ ${medicineName} nahi mila aapke 15km mein.\nSMS alert chahiye jab mile? Reply karo: NOTIFY`;

    // Check nearest PHC / Govt facility
    const { data: govtPharms } = await supabase
      .from('pharmacies')
      .select('name, area, lat, lng, type')
      .in('type', ['PHC', 'CHC', 'janaushadhi'])
      .eq('is_pending_approval', false)
      .limit(5);

    if (govtPharms && govtPharms.length > 0) {
      let nearestGovt: any = null;
      let minGovtDist = Infinity;
      for (const gp of govtPharms) {
        const d = haversine(userLat, userLng, gp.lat ?? 23.26, gp.lng ?? 77.41);
        if (d < minGovtDist) {
          minGovtDist = d;
          nearestGovt = gp;
        }
      }
      if (nearestGovt) {
        reply += `\n\n🏥 Sarkaari option: ${nearestGovt.name} — generic medicines milti hain.`;
      }
    }

    return reply;
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const formData = await req.formData();
    const bodyText = (formData.get('Body') as string | null)?.trim() || '';
    const fromNumberRaw = (formData.get('From') as string | null) || '';
    const numMediaStr = (formData.get('NumMedia') as string | null) || '0';
    const numMedia = parseInt(numMediaStr, 10) || 0;
    const mediaUrl0 = (formData.get('MediaUrl0') as string | null) || '';
    const mediaContentType0 = (formData.get('MediaContentType0') as string | null) || '';
    const latStr = formData.get('Latitude') as string | null;
    const lngStr = formData.get('Longitude') as string | null;

    const lat = latStr !== null && latStr !== undefined && latStr !== '' ? parseFloat(latStr) : null;
    const lng = lngStr !== null && lngStr !== undefined && lngStr !== '' ? parseFloat(lngStr) : null;

    // Normalize phone number (strip 'whatsapp:')
    const phone = fromNumberRaw.replace('whatsapp:', '').trim();

    if (!phone) {
      return twimlResponse('Error: Invalid sender phone number.');
    }

    // 1. Fetch or initialize session
    let { data: session } = await supabase
      .from('sessions')
      .select('*')
      .eq('phone', phone)
      .maybeSingle();

    if (!session) {
      const { data: newSession } = await supabase
        .from('sessions')
        .insert({ phone, role: 'unknown', state: 'new' })
        .select()
        .single();
      session = newSession;
    }

    // 2. Check pharmacies table for this phone number
    const { data: pharmacy } = await supabase
      .from('pharmacies')
      .select('*')
      .eq('phone', phone)
      .maybeSingle();

    // =========================================================================
    // ROUTE 1: REGISTRATION FLOW (matches REGISTER command or pending registration location)
    // =========================================================================
    const registerMatch = bodyText.match(/^REGISTER\s+(.+)\s+([\w\s]+)$/i);

    if (registerMatch) {
      const shopName = registerMatch[1].trim();
      const area = registerMatch[2].trim();

      if (lat !== null && lng !== null) {
        await supabase.from('pharmacies').insert({
          name: shopName,
          area: area,
          phone: phone,
          lat: lat,
          lng: lng,
          is_pending_approval: true
        });
        await supabase.from('sessions').update({ state: 'active', role: 'pharmacist', updated_at: new Date().toISOString() }).eq('phone', phone);
        return twimlResponse(`✓ ${shopName} registration submit ho gayi. Approval ke baad aap MedRadar par active ho jayenge.`);
      } else {
        await supabase.from('sessions').update({
          state: 'awaiting_registration_location',
          last_medicine: `${shopName}|${area}`,
          role: 'pharmacist',
          updated_at: new Date().toISOString()
        }).eq('phone', phone);
        return twimlResponse(`Shop ka naam note ho gaya: ${shopName} (${area}). Ab location share karo (attachment → location) aur registration complete hogi.`);
      }
    }

    if (session?.state === 'awaiting_registration_location' && lat !== null && lng !== null) {
      const [shopName, area] = (session.last_medicine || 'My Pharmacy|Bhopal').split('|');
      await supabase.from('pharmacies').insert({
        name: shopName,
        area: area || 'Bhopal',
        phone: phone,
        lat: lat,
        lng: lng,
        is_pending_approval: true
      });
      await supabase.from('sessions').update({ state: 'active', updated_at: new Date().toISOString() }).eq('phone', phone);
      return twimlResponse(`✓ Location mil gaya! ${shopName} registration submit ho gayi. Approval ke baad MedRadar par active ho jayenge.`);
    }

    // =========================================================================
    // ROUTE 2: PHARMACIST FLOW (Verified pharmacy with is_pending_approval = false)
    // =========================================================================
    if (pharmacy && pharmacy.is_pending_approval === false) {
      // Sub-route A: Image Shelf Scan
      if (numMedia > 0 && mediaContentType0.startsWith('image/')) {
        const imageBase64 = await fetchTwilioMediaAsBase64(mediaUrl0);
        if (!imageBase64) {
          return twimlResponse('Image download nahi ho paayi. Kripya dobara bhejein.');
        }

        try {
          const model = getModel();
          const imagePart = {
            inlineData: {
              data: imageBase64,
              mimeType: mediaContentType0
            }
          };
          const prompt = `This is a photo of a pharmacy shelf or medicine storage in India.
List ONLY the medicine names visible on the bottles/boxes/labels.
Return JSON only, no other text: {"medicines": ["Medicine Name 1", "Medicine Name 2"]}
If no medicines are clearly visible, return: {"medicines": []}
Standardize names: prefer generic names. 'Metformin' not 'METFORMIN HCL 500'. 'Paracetamol 500mg' not 'PCM'.`;

          const genResult = await model.generateContent([prompt, imagePart]);
          const rawText = genResult.response.text();
          const parsed = await parseJSON<{ medicines: string[] }>(rawText);
          const medicineList = parsed?.medicines || [];

          if (medicineList.length === 0) {
            return twimlResponse('Photo mein koi medicine clear nahi dikhi. Kripya saaf photo bhejein ya text likhein.');
          }

          let totalNotified = 0;
          const canonicalList: string[] = [];

          for (const rawMed of medicineList) {
            const canonical = await getCanonicalName(rawMed);
            canonicalList.push(canonical);

            await supabase.from('stock').upsert({
              pharmacy_id: pharmacy.id,
              medicine_name: canonical,
              available: true,
              updated_at: new Date().toISOString()
            }, { onConflict: 'pharmacy_id,medicine_name' });

            const notified = await notifyWaitingPatients(canonical, pharmacy);
            totalNotified += notified;
          }

          const reply = await generatePharmacistReply(
            `Shelf scan: ${canonicalList.join(', ')} in stock`,
            pharmacy,
            totalNotified
          );
          return twimlResponse(reply);
        } catch (err) {
          console.error('Image parsing error:', err);
          return twimlResponse('Photo scan karne mein error aaya. Kripya text mein likh kar bhejein.');
        }
      }

      // Sub-route B: Voice Note Audio
      if (numMedia > 0 && mediaContentType0.startsWith('audio/')) {
        const audioBase64 = await fetchTwilioMediaAsBase64(mediaUrl0);
        if (!audioBase64) {
          return twimlResponse('Audio download nahi ho paayi. Kripya dobara bhejein.');
        }

        try {
          const model = getModel();
          const audioPart = {
            inlineData: {
              data: audioBase64,
              mimeType: mediaContentType0
            }
          };
          const prompt = `This is a WhatsApp voice note from a pharmacy worker in India.
Transcribe it, then extract medicine name and availability.
Return JSON only: {"medicine_name": "Canonical Medicine Name", "available": true}
available=true means stock is present: 'hai', 'aagaya', 'mil raha', 'yes', 'available'
available=false means out of stock: 'khatam', 'nahi hai', 'nahi', 'no', 'khatam ho gaya'`;

          const genResult = await model.generateContent([prompt, audioPart]);
          const parsed = await parseJSON<{ medicine_name: string; available: boolean }>(genResult.response.text());

          if (parsed && parsed.medicine_name) {
            const canonical = await getCanonicalName(parsed.medicine_name);
            const isAvail = parsed.available ?? true;

            await supabase.from('stock').upsert({
              pharmacy_id: pharmacy.id,
              medicine_name: canonical,
              available: isAvail,
              updated_at: new Date().toISOString()
            }, { onConflict: 'pharmacy_id,medicine_name' });

            let notified = 0;
            if (isAvail) {
              notified = await notifyWaitingPatients(canonical, pharmacy);
            }

            const reply = await generatePharmacistReply(
              `${canonical} ${isAvail ? 'available' : 'out of stock'} mark kiya gaya`,
              pharmacy,
              notified
            );
            return twimlResponse(reply);
          }
        } catch (err) {
          console.error('Audio processing error:', err);
          return twimlResponse('Voice note samajh nahi aaya. Kripya text message bhejein.');
        }
      }

      // Sub-route C: CLOSE PHARMACY
      const upperBody = bodyText.toUpperCase();
      if (upperBody === 'CLOSED' || upperBody === 'BAND' || upperBody === 'BAND HO GAYA') {
        await supabase.from('pharmacies').update({ is_open: false }).eq('id', pharmacy.id);
        return twimlResponse(`✓ ${pharmacy.name} closed ho gaya MedRadar par. Khulne par koi bhi message bhejo.`);
      }

      // Sub-route D: OPEN PHARMACY
      if (upperBody === 'OPEN' || upperBody === 'KHULA') {
        await supabase.from('pharmacies').update({ is_open: true }).eq('id', pharmacy.id);
        return twimlResponse(`✓ ${pharmacy.name} open mark ho gaya.`);
      }

      // Sub-route E: MARK OUT OF STOCK ("KHATAM ...")
      if (upperBody.startsWith('KHATAM')) {
        const rawMedName = bodyText.slice(6).trim();
        const canonical = await getCanonicalName(rawMedName || 'Medicine');

        await supabase.from('stock').upsert({
          pharmacy_id: pharmacy.id,
          medicine_name: canonical,
          available: false,
          updated_at: new Date().toISOString()
        }, { onConflict: 'pharmacy_id,medicine_name' });

        return twimlResponse(`✓ ${canonical} khatam mark ho gaya.`);
      }

      // Sub-route F: Natural Language Text
      try {
        const model = getModel();
        const prompt = `You are a pharmacy stock parser for rural India. Understand Hinglish, Hindi Devanagari, and English.
Parse this message from a pharmacist. Return JSON only:
{"medicine_name": "Standardized Generic Name", "available": true, "confidence": 0.9}
Rules for available=true: stock present, 'hai', 'aagaya', 'YES', 'mil rahi', 'available', 'aa gaya'
Rules for available=false: out of stock, 'khatam', 'nahi hai', 'NO', 'nahi milti', 'khatam ho gaya'
Standardize: 'metformin' → 'Metformin 500mg', 'paracet' → 'Paracetamol 500mg', 'insulin' → 'Insulin Regular'
If the message is ambiguous or unclear, set confidence below 0.6.
Message: "${bodyText}"`;

        const res = await model.generateContent(prompt);
        const parsed = await parseJSON<{ medicine_name: string; available: boolean; confidence: number }>(res.response.text());

        if (!parsed || (parsed.confidence ?? 1.0) < 0.6 || !parsed.medicine_name) {
          return twimlResponse(`Samajh nahi aaya 🤔\nTry: 'Metformin YES' ya 'Insulin khatam'\nYa shelf ki photo bhejo.`);
        }

        const canonical = await getCanonicalName(parsed.medicine_name);
        const isAvail = parsed.available ?? true;

        await supabase.from('stock').upsert({
          pharmacy_id: pharmacy.id,
          medicine_name: canonical,
          available: isAvail,
          updated_at: new Date().toISOString()
        }, { onConflict: 'pharmacy_id,medicine_name' });

        let notified = 0;
        if (isAvail) {
          notified = await notifyWaitingPatients(canonical, pharmacy);
        }

        const reply = await generatePharmacistReply(
          `${canonical} ${isAvail ? 'available' : 'out of stock'} mark kiya gaya`,
          pharmacy,
          notified
        );
        return twimlResponse(reply);
      } catch (err) {
        console.error('Pharmacist text parse error:', err);
        return twimlResponse(`Samajh nahi aaya 🤔\nTry: 'Metformin YES' ya 'Insulin khatam'\nYa shelf ki photo bhejo.`);
      }
    }

    // =========================================================================
    // ROUTE 3: PATIENT / ASHA WORKER FLOW (Unknown or Patient numbers)
    // =========================================================================

    // Sub-route A: Location Received via WhatsApp
    if (lat !== null && lng !== null) {
      await supabase
        .from('sessions')
        .update({
          lat: lat,
          lng: lng,
          state: 'active',
          role: session?.role === 'asha' ? 'asha' : 'patient',
          updated_at: new Date().toISOString()
        })
        .eq('phone', phone);

      if (session?.last_medicine) {
        const reply = await performPatientSearch(session.last_medicine, lat, lng, false);
        return twimlResponse(reply);
      } else {
        await supabase.from('sessions').update({ state: 'awaiting_medicine' }).eq('phone', phone);
        return twimlResponse(`✓ Location mil gaya! Ab batao kaun si medicine chahiye?\nSirf naam likho, jaise: 'Metformin' ya 'Insulin'`);
      }
    }

    const upperText = bodyText.toUpperCase();

    // Sub-route B: Urgent / Emergency Request
    if (upperText.startsWith('URGENT') || upperText.startsWith('EMERGENCY') || upperText.startsWith('ZARURI')) {
      const cleanMed = bodyText.replace(/^(URGENT|EMERGENCY|ZARURI)\s*/i, '').trim();
      const canonical = await resolveAlias(cleanMed || 'Medicine');

      if (session?.lat !== null && session?.lat !== undefined && session?.lng !== null && session?.lng !== undefined) {
        const reply = await performPatientSearch(canonical, session.lat, session.lng, true);
        return twimlResponse(`🚨 URGENT: ${reply}`);
      } else {
        await supabase.from('sessions').update({
          last_medicine: canonical,
          state: 'awaiting_location',
          role: 'patient',
          updated_at: new Date().toISOString()
        }).eq('phone', phone);
        return twimlResponse(`🚨 Urgent request note ho gaya. Apni location share karo:\nAttachment (📎) → Location`);
      }
    }

    // Sub-route C: ASHA Worker Registration
    if (upperText.startsWith('ASHA')) {
      await supabase.from('sessions').update({
        is_asha: true,
        role: 'asha',
        updated_at: new Date().toISOString()
      }).eq('phone', phone);

      return twimlResponse(`✓ ASHA worker ke roop mein register ho gayi. Ab ek message mein multiple patients ke liye likh sakti ho:\n'3 patients insulin chahte hain'\nLocation share karo pehle.`);
    }

    // Sub-route D: Join Waitlist ("NOTIFY" / "BATAO" / "SMS DO" / "YES")
    if (['NOTIFY', 'BATAO', 'SMS DO', 'YES'].includes(upperText) && session?.state === 'awaiting_notify') {
      if (session.last_medicine && session.lat !== null && session.lat !== undefined && session.lng !== null && session.lng !== undefined) {
        await supabase.from('waiting_list').upsert({
          phone: phone,
          medicine_name: session.last_medicine,
          lat: session.lat,
          lng: session.lng,
          created_at: new Date().toISOString()
        }, { onConflict: 'phone,medicine_name' });

        return twimlResponse(`✓ Done! Jab ${session.last_medicine} aapke paas milega, SMS aayega.`);
      } else {
        return twimlResponse('Pehle medicine search karo.');
      }
    }

    // Sub-route E: ASHA Multi-Patient Flow
    if (session?.is_asha && /\d+/.test(bodyText) && (bodyText.toLowerCase().includes('patient') || bodyText.toLowerCase().includes('mariz'))) {
      try {
        const model = getModel();
        const prompt = `Extract number of patients and medicine name from this ASHA worker message.
Return JSON only: {"count": 3, "medicine": "Insulin"}
Message: "${bodyText}"`;

        const res = await model.generateContent(prompt);
        const parsed = await parseJSON<{ count: number; medicine: string }>(res.response.text());
        const count = parsed?.count || 1;
        const canonical = await resolveAlias(parsed?.medicine || 'Medicine');

        const userLat = session.lat ?? 23.26;
        const userLng = session.lng ?? 77.41;

        for (let i = 0; i < count; i++) {
          await supabase.from('waiting_list').insert({
            phone: `${phone}_${Date.now()}_${i}`,
            medicine_name: canonical,
            lat: userLat,
            lng: userLng,
            created_at: new Date().toISOString()
          });
        }

        return twimlResponse(`${count} patients ke liye ${canonical} waitlist mein add ho gaye.`);
      } catch (err) {
        console.error('ASHA multi-patient parsing error:', err);
      }
    }

    // Sub-route F: General Medicine Search
    if (bodyText.length > 0) {
      const canonicalMedicine = await resolveAlias(bodyText);

      await supabase.from('sessions').update({
        last_medicine: canonicalMedicine,
        updated_at: new Date().toISOString()
      }).eq('phone', phone);

      if (session?.lat === null || session?.lat === undefined || session?.lng === null || session?.lng === undefined) {
        await supabase.from('sessions').update({
          state: 'awaiting_location',
          role: 'patient'
        }).eq('phone', phone);

        return twimlResponse(`📍 Location share karo medicine dhundhne ke liye:\nWhatsApp mein: Attachment (📎) → Location\nYa GPS on karke try karo.`);
      } else {
        const reply = await performPatientSearch(canonicalMedicine, session.lat, session.lng, false);
        return twimlResponse(reply);
      }
    }

    return twimlResponse('MedRadar mein aapka swagat hai. Medicine ka naam likhein ya photo/location bhejein.');
  } catch (err: any) {
    console.error('Twilio webhook unhandled error:', err);
    return twimlResponse('Server error aaya. Kripya thodi der baad koshish karein.');
  }
}
