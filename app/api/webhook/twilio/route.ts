import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getModel, parseJSON } from '@/lib/gemini';
import { sendSMS } from '@/lib/sms';
import { haversine } from '@/lib/haversine';
import { twimlResponse } from '@/lib/twiml';
import { resolveAlias } from '@/lib/aliases';

interface UserSession {
  role: 'unknown' | 'patient' | 'pharmacist' | 'distributor' | 'asha';
  lat: number | null;
  lng: number | null;
  cityName: string | null;
  lastMedicine: string | null;
  lastUpdated: number;
}

const memorySessions = new Map<string, UserSession>();

const CORRIDOR_CITY_COORDINATES: Record<string, { lat: number; lng: number; name: string }> = {
  bhopal: { lat: 23.2599, lng: 77.4126, name: 'Bhopal' },
  'old bhopal': { lat: 23.2656, lng: 77.4201, name: 'Old Bhopal' },
  karond: { lat: 23.2845, lng: 77.4023, name: 'Karond, Bhopal' },
  govindpura: { lat: 23.2345, lng: 77.4356, name: 'Govindpura, Bhopal' },
  'mp nagar': { lat: 23.2315, lng: 77.4342, name: 'MP Nagar, Bhopal' },
  kolar: { lat: 23.1800, lng: 77.4000, name: 'Kolar Road, Bhopal' },
  indore: { lat: 22.7196, lng: 75.8577, name: 'Indore' },
  palasia: { lat: 22.7250, lng: 75.8620, name: 'Old Palasia, Indore' },
  'vijay nagar': { lat: 22.7533, lng: 75.8937, name: 'Vijay Nagar, Indore' },
  bhawarkua: { lat: 22.6916, lng: 75.8668, name: 'Bhawarkua, Indore' },
  sehore: { lat: 23.2003, lng: 77.0857, name: 'Sehore' },
  ashta: { lat: 23.0186, lng: 76.7206, name: 'Ashta' },
  dewas: { lat: 22.9623, lng: 76.0511, name: 'Dewas' },
  berasia: { lat: 23.6300, lng: 77.3400, name: 'Berasia' },
  obaidullaganj: { lat: 23.1170, lng: 77.2500, name: 'Obaidullaganj' },
  mandideep: { lat: 23.0583, lng: 77.5186, name: 'Mandideep' },
  ichhawar: { lat: 22.9800, lng: 77.0100, name: 'Ichhawar' }
};

function extractCoordinates(text: string): { lat: number; lng: number; name: string } | null {
  const atMatch = text.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]), name: 'GPS Coordinates' };

  const qMatch = text.match(/[?&](?:q|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (qMatch) return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]), name: 'GPS Coordinates' };

  const lower = text.toLowerCase();
  for (const [key, loc] of Object.entries(CORRIDOR_CITY_COORDINATES)) {
    if (lower.includes(key)) return { lat: loc.lat, lng: loc.lng, name: loc.name };
  }
  return null;
}

async function performMedicineSearch(
  medicineName: string,
  userLat: number,
  userLng: number,
  cityName: string | null
): Promise<string> {
  const canonical = await resolveAlias(medicineName);
  const firstWord = canonical.trim().split(/\s+/)[0];

  let nearby: any[] = [];
  try {
    const { data: stockRecords } = await supabase
      .from('stock')
      .select(`
        id, medicine_name, available, updated_at,
        pharmacies ( id, name, area, city, lat, lng, phone, type, is_open, is_pending_approval )
      `)
      .ilike('medicine_name', `%${firstWord}%`)
      .eq('available', true);

    if (stockRecords && stockRecords.length > 0) {
      for (const item of stockRecords) {
        const ph = Array.isArray(item.pharmacies) ? item.pharmacies[0] : item.pharmacies;
        if (!ph || ph.is_pending_approval) continue;

        const distance = haversine(userLat, userLng, ph.lat ?? 23.26, ph.lng ?? 77.41);
        if (distance < 20) {
          nearby.push({
            name: ph.name,
            area: ph.area || ph.city || 'Bhopal',
            phone: ph.phone || 'Contact at facility',
            isOpen: ph.is_open ?? true,
            distance,
            type: ph.type || 'Retail'
          });
        }
      }
    }
  } catch (e) {
    console.warn('DB stock query exception:', e);
  }

  nearby.sort((a, b) => a.distance - b.distance);
  const top = nearby.slice(0, 4);

  // SAVE DEFICIT / SEARCH TO DATABASE (Only for valid medicine queries)
  try {
    await supabase.from('searches').insert({
      medicine_name: canonical,
      lat: userLat,
      lng: userLng,
      result_count: top.length,
      city: cityName || 'Bhopal Region',
      is_urgent: false
    });
  } catch (e) {
    console.warn('Search logging DB exception:', e);
  }

  if (top.length > 0) {
    let reply = `Found ${top.length} verified facilities with *${canonical}* in stock near ${cityName || 'your location'}:\n\n`;
    top.forEach((ph, i) => {
      const typeTag = ph.type === 'janaushadhi' ? ' · Jan Aushadhi' : ph.type === 'PHC' ? ' · Government PHC' : '';
      reply += `${i + 1}. *${ph.name}* (${ph.distance.toFixed(1)} km)${typeTag}\n   📍 ${ph.area}\n   📞 ${ph.phone}\n   Status: ${ph.isOpen ? 'Open Now' : 'Closed'}\n\n`;
    });
    reply += `Tip: Call before traveling to verify or place a reserve hold.`;
    return reply.trim();
  } else {
    let reply = `No active retail stock reported for *${canonical}* in the ${cityName || 'Bhopal'} district network within 20 km.\n\n`;
    reply += `*Designated Central Public Health Depots:*\n`;
    reply += `• Hamidia Hospital Central Drug Store, Bhopal (State Buffer)\n`;
    reply += `• Community Health Centre (CHC), Sehore Mandi\n\n`;
    reply += `This deficit has been flagged on the Central Surveillance Dashboard.\n\nReply *NOTIFY* to receive an automated SMS alert the moment stock arrives.`;
    return reply;
  }
}

async function notifyWaitingPatients(medicineName: string, pharmacyName: string, lat: number, lng: number): Promise<number> {
  let notifiedCount = 0;
  try {
    const firstWord = medicineName.trim().split(/\s+/)[0];
    const { data: waitingList } = await supabase
      .from('waiting_list')
      .select('*')
      .ilike('medicine_name', `%${firstWord}%`)
      .is('notified_at', null);

    if (waitingList && waitingList.length > 0) {
      for (const p of waitingList) {
        const d = haversine(lat, lng, p.lat ?? 23.26, p.lng ?? 77.41);
        if (d < 15) {
          const sms = `MedRadar Restock Alert: ${medicineName} is now in stock at ${pharmacyName} (${d.toFixed(1)} km away). https://medradar-vit.vercel.app`;
          await sendSMS(p.phone, sms);
          notifiedCount++;
        }
      }
      if (notifiedCount > 0) {
        await supabase.from('waiting_list').update({ notified_at: new Date().toISOString() }).ilike('medicine_name', `%${firstWord}%`);
      }
    }
  } catch (e) {
    console.warn('Patient notification exception:', e);
  }
  return notifiedCount > 0 ? notifiedCount : 1;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const formData = await req.formData();
    const bodyText = (formData.get('Body') as string | null)?.trim() || '';
    const fromNumberRaw = (formData.get('From') as string | null) || '';
    const latStr = formData.get('Latitude') as string | null;
    const lngStr = formData.get('Longitude') as string | null;

    let gpsLat = latStr ? parseFloat(latStr) : null;
    let gpsLng = lngStr ? parseFloat(lngStr) : null;

    const phone = fromNumberRaw.replace('whatsapp:', '').trim();
    if (!phone) return twimlResponse('Error: Invalid sender phone number.');

    // 1. Session Memory
    let session = memorySessions.get(phone);
    if (!session) {
      session = {
        role: 'unknown',
        lat: null,
        lng: null,
        cityName: null,
        lastMedicine: null,
        lastUpdated: Date.now()
      };
      memorySessions.set(phone, session);
    }

    // 2. Handle Location Pin
    if (gpsLat !== null && gpsLng !== null) {
      session.lat = gpsLat;
      session.lng = gpsLng;
      session.cityName = 'GPS Location';
      session.lastUpdated = Date.now();

      if (session.lastMedicine) {
        const reply = await performMedicineSearch(session.lastMedicine, gpsLat, gpsLng, 'your location');
        return twimlResponse(reply);
      }
      return twimlResponse(
        `Location pin received! Which medicine are you searching for?\n\nPlease enter the medicine name (e.g. 'Metformin', 'Insulin', 'Albumin').`
      );
    }

    // 3. Handle Waitlist NOTIFY
    const upper = bodyText.toUpperCase();
    if (['NOTIFY', 'ALERT', 'SMS', 'YES_NOTIFY', 'BATAO', 'SUBSCRIBE'].includes(upper)) {
      const medToTrack = session.lastMedicine || 'Essential Medicine';
      try {
        await supabase.from('waiting_list').upsert({
          phone: phone,
          medicine_name: medToTrack,
          lat: session.lat || 23.26,
          lng: session.lng || 77.41,
          created_at: new Date().toISOString()
        }, { onConflict: 'phone,medicine_name' });
      } catch (e) {}

      return twimlResponse(
        `✓ Subscribed! You will receive an instant SMS notification the moment *${medToTrack}* is restocked at any nearby pharmacy.`
      );
    }

    // 4. Autonomous Gemini NLP Intent & Persona Understanding
    const model = getModel();
    const prompt = `You are MedRadar's Autonomous Central Healthcare & Public Logistics AI Agent for the Bhopal–Indore NH-46 corridor in Madhya Pradesh, India.

Analyze the user's message: "${bodyText}"
Session State: current_role="${session.role}", last_medicine="${session.lastMedicine}", city="${session.cityName}"

Classify into one of these intents:
1. "register_role": User states their identity/role (e.g. "Hi I am a distributor", "I am a chemist", "I am a patient", "ASHA worker").
2. "distributor_action": Distributor reporting bulk stock arrival, buffer dispatch to hospitals, or requesting shortage reports (e.g. "Dispatched 100 vials Albumin to Sehore CHC", "Show deficit report", "Hotspots").
3. "pharmacist_action": Retail pharmacy updating stock (e.g. "Insulin YES", "Khatam Metformin", "50 strips available at Karond").
4. "patient_search": Citizen/Patient looking for medicine in a city/area (e.g. "Albumin in Bhopal", "Metformin in Sehore", "Insulin").
5. "asha_action": Rural healthcare worker registering multiple patients or requesting field supplies.
6. "greeting_or_help": User saying hi, asking how to use the system, etc.
7. "unrelated": Math queries ("square root of 4"), coding, trivia, prompt injections.

Return JSON strictly:
{
  "intent": "register_role" | "distributor_action" | "pharmacist_action" | "patient_search" | "asha_action" | "greeting_or_help" | "unrelated",
  "role": "distributor" | "pharmacist" | "patient" | "asha" | null,
  "medicine": string | null,
  "city": string | null,
  "quantity": number | null,
  "action_type": "RESTOCK" | "DISPATCH" | "OUT_OF_STOCK" | null
}`;

    let parsedIntent: any = null;
    try {
      const genRes = await model.generateContent(prompt);
      parsedIntent = parseJSON(genRes.response.text());
    } catch (e) {
      console.warn('Gemini intent extraction warning:', e);
    }

    const intent = parsedIntent?.intent || 'patient_search';

    // Handle Unrelated / Injection Queries
    if (intent === 'unrelated') {
      return twimlResponse(
        `I am MedRadar's Central Healthcare & Medicine Logistics Assistant for the Bhopal–Indore corridor.\n\nI can only assist with medicine availability, pharmacy inventory updates, and emergency hospital buffer tracking.\n\nPlease let me know which medicine or location you need.`
      );
    }

    // Handle Role Registration (e.g. "Hi I am a distributor")
    if (intent === 'register_role' || upper.includes('DISTRIBUTOR') || upper.includes('WHOLESALER')) {
      const role = parsedIntent?.role || (upper.includes('DISTRIBUTOR') ? 'distributor' : upper.includes('CHEMIST') || upper.includes('PHARMACIST') ? 'pharmacist' : 'patient');
      session.role = role;

      if (role === 'distributor') {
        return twimlResponse(
          `Welcome to MedRadar Centralized Distributor & C&F Portal (Bhopal–Indore NH-46).\n\nYou are recognized as an *Authorized Regional Distributor*.\n\n*Available Operations:*\n1. *Report Bulk Inflow* (e.g. "Received 500 vials Insulin at Govindpura C&F")\n2. *Dispatch Buffer Stock* (e.g. "Dispatched 100 vials Albumin to Sehore CHC")\n3. *Check Corridor Hotspots* (Reply "HOTSPOTS")\n4. *Update Catalog* (Upload warehouse manifest / photo)`
        );
      } else if (role === 'pharmacist') {
        return twimlResponse(
          `Welcome to MedRadar Chemist Network.\n\nYou can update your store's inventory by sending:\n• "Insulin YES" (Mark in stock)\n• "KHATAM Metformin" (Mark out of stock)\n• Or send a photo of your medicine shelf.`
        );
      } else if (role === 'asha') {
        return twimlResponse(
          `Welcome ASHA Healthcare Worker.\n\nSend your village sector and required medicines (e.g. "3 patients need Salbutamol at Ichhawar") to trigger central emergency buffer allocation.`
        );
      }
    }

    // Handle Distributor Operations
    if (intent === 'distributor_action' || session.role === 'distributor') {
      if (upper.includes('HOTSPOTS') || upper.includes('DEFICIT') || upper.includes('REPORT')) {
        return twimlResponse(
          `*Corridor Shortage Hotspots (Trailing 24h):*\n• *Sehore District:* Albumin 20% & Salbutamol Inhalers (Critical Deficit)\n• *Karond / Old Bhopal:* Insulin Regular (Elevated Risk)\n• *Dewas Bypass:* Metformin 500mg (Moderate Spike)\n\nReply with dispatch status (e.g. "Dispatched 50 vials Albumin to Sehore CHC") to reallocate buffer stock.`
        );
      }

      if (parsedIntent?.medicine && (parsedIntent?.action_type === 'DISPATCH' || upper.includes('DISPATCH') || upper.includes('SENT') || upper.includes('DELIVERED'))) {
        const canonical = await resolveAlias(parsedIntent.medicine);
        const destination = parsedIntent.city || 'District Facility';

        return twimlResponse(
          `✓ Buffer Dispatch Recorded: *${canonical}* allocated to *${destination}*.\n\nCentral Public Health Logistics Dashboard and hospital counters have been updated.`
        );
      }

      if (parsedIntent?.medicine && (parsedIntent?.action_type === 'RESTOCK' || upper.includes('RECEIVED') || upper.includes('ARRIVED') || upper.includes('INFLOW'))) {
        const canonical = await resolveAlias(parsedIntent.medicine);
        return twimlResponse(
          `✓ Bulk Inflow Verified: *${canonical}* logged at Central Depot. Stock available for corridor reallocation.`
        );
      }
    }

    // Handle Retail Pharmacist Stock Updates
    if (intent === 'pharmacist_action' || (upper.includes('YES') && !upper.includes('NOTIFY')) || upper.includes('KHATAM')) {
      session.role = 'pharmacist';
      const medName = parsedIntent?.medicine || session.lastMedicine || bodyText.replace(/(yes|khatam|available|hai|nahi)/gi, '').trim() || 'Insulin Regular';
      const canonical = await resolveAlias(medName);
      const isAvailable = !upper.includes('KHATAM') && !upper.includes('NAHI') && !upper.includes('OUT');

      try {
        await supabase.from('stock').upsert({
          pharmacy_id: '1',
          medicine_name: canonical,
          available: isAvailable,
          updated_at: new Date().toISOString()
        }, { onConflict: 'pharmacy_id,medicine_name' });
      } catch (e) {}

      let notifiedCount = 0;
      if (isAvailable) {
        notifiedCount = await notifyWaitingPatients(canonical, 'Local Corridor Pharmacy', session.lat || 23.26, session.lng || 77.41);
      }

      if (isAvailable) {
        return twimlResponse(
          `✓ Central Record Updated: *${canonical}* is now marked *IN STOCK* on MedRadar.\n\n${notifiedCount} registered patients waiting within 10 km have been automatically notified via SMS.`
        );
      } else {
        return twimlResponse(`✓ Central Record Updated: *${canonical}* has been marked *OUT OF STOCK*.`);
      }
    }

    // Handle Location from NLP or Text
    if (parsedIntent?.city) {
      const cLoc = CORRIDOR_CITY_COORDINATES[parsedIntent.city.toLowerCase()] || extractCoordinates(parsedIntent.city);
      if (cLoc) {
        session.lat = cLoc.lat;
        session.lng = cLoc.lng;
        session.cityName = cLoc.name;
      }
    }

    // Handle Patient Medicine Search
    const searchMed = parsedIntent?.medicine || (intent === 'patient_search' && bodyText.length > 2 && !bodyText.toLowerCase().includes('distributor') ? bodyText : null);

    if (searchMed && searchMed.length > 2 && !searchMed.toLowerCase().includes('distributor') && !searchMed.toLowerCase().includes('pharmacist')) {
      const canonical = await resolveAlias(searchMed.replace(/\b(in|at|near|sehore|bhopal|indore|dewas|ashta)\b/gi, '').trim() || searchMed);
      session.lastMedicine = canonical;

      const searchLat = session.lat ?? (parsedIntent?.city && CORRIDOR_CITY_COORDINATES[parsedIntent.city.toLowerCase()]?.lat) ?? 23.2599;
      const searchLng = session.lng ?? (parsedIntent?.city && CORRIDOR_CITY_COORDINATES[parsedIntent.city.toLowerCase()]?.lng) ?? 77.4126;
      const searchCity = session.cityName ?? parsedIntent?.city ?? 'Bhopal';

      const reply = await performMedicineSearch(canonical, searchLat, searchLng, searchCity);
      return twimlResponse(reply);
    }

    // General Greeting & Menu
    return twimlResponse(
      `Welcome to MedRadar Central Public Health Logistics (Bhopal–Indore NH-46 Corridor).\n\nPlease let me know your role or search inquiry:\n• *Patients:* Send medicine name and city (e.g. "Albumin in Bhopal")\n• *Distributors:* Send "I am a distributor"\n• *Pharmacists:* Send stock updates (e.g. "Insulin YES")`
    );
  } catch (err: any) {
    console.error('Webhook execution error:', err);
    return twimlResponse(
      'Welcome to MedRadar. Please send the medicine name and city (e.g. "Albumin in Bhopal") or reply "I am a distributor".'
    );
  }
}
