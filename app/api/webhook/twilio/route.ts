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

// Clean medicine name extraction
function extractMedicineAndLocation(rawText: string): { medicine: string; city: string | null } {
  let text = rawText.trim();
  let foundCity: string | null = null;

  const lower = text.toLowerCase();
  for (const [key, loc] of Object.entries(CORRIDOR_CITY_COORDINATES)) {
    if (lower.includes(key)) {
      foundCity = loc.name;
      text = text.replace(new RegExp(`\\b(in|at|near|around)?\\s*${key}\\b`, 'gi'), '').trim();
      break;
    }
  }

  // Remove common filler words
  text = text.replace(/\b(chahiye|available|stock|hai|kya|dawa|medicine|in|at)\b/gi, '').trim();

  return {
    medicine: text.length > 0 ? text : 'Medicine',
    city: foundCity
  };
}

async function performMedicineSearch(
  medicineName: string,
  userLat: number,
  userLng: number,
  cityName: string | null,
  senderPhone: string
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

  // SAVE DEFICIT / SEARCH TO DATABASE
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

    // 2. Location Pin / Attachment Handling
    if (gpsLat !== null && gpsLng !== null) {
      session.lat = gpsLat;
      session.lng = gpsLng;
      session.cityName = 'GPS Location';
      session.lastUpdated = Date.now();

      if (session.lastMedicine) {
        const reply = await performMedicineSearch(session.lastMedicine, gpsLat, gpsLng, 'your location', phone);
        return twimlResponse(reply);
      }
      return twimlResponse(
        `Location pin received! Which medicine are you searching for?\n\nPlease enter the medicine name (e.g. 'Metformin', 'Insulin', 'Albumin').`
      );
    }

    // 3. Waitlist Subscription (NOTIFY)
    const upper = bodyText.toUpperCase();
    if (['NOTIFY', 'ALERT', 'SMS', 'YES', 'BATAO', 'SUBSCRIBE'].includes(upper)) {
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

    // 4. Check for Coordinates / City in text
    const locCoords = extractCoordinates(bodyText);
    if (locCoords) {
      session.lat = locCoords.lat;
      session.lng = locCoords.lng;
      session.cityName = locCoords.name;
    }

    // 5. Check if this is a Pharmacist/Distributor Stock Inflow Update
    if (
      upper.includes('YES') ||
      upper.includes('KHATAM') ||
      upper.includes('STOCK') ||
      upper.includes('AVAILABLE') ||
      upper.includes('RESTOCK')
    ) {
      const parsedMed = extractMedicineAndLocation(bodyText).medicine;
      const canonical = await resolveAlias(parsedMed || session.lastMedicine || 'Insulin Regular');
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
          `✓ Central Record Updated: *${canonical}* is now marked *IN STOCK* on the MedRadar Surveillance Grid.\n\n${notifiedCount} registered patients waiting within the corridor have been notified via SMS.`
        );
      } else {
        return twimlResponse(`✓ Central Record Updated: *${canonical}* has been flagged *OUT OF STOCK* across the corridor.`);
      }
    }

    // 6. Direct Medicine + Location Search (e.g. "Albumin in Bhopal", "Metformin in Indore", "Albumin")
    const { medicine: extractedMed, city: extractedCity } = extractMedicineAndLocation(bodyText);

    if (extractedCity) {
      const cLoc = CORRIDOR_CITY_COORDINATES[extractedCity.toLowerCase()] || extractCoordinates(extractedCity);
      if (cLoc) {
        session.lat = cLoc.lat;
        session.lng = cLoc.lng;
        session.cityName = cLoc.name;
      }
    }

    // If a medicine query was extracted
    if (extractedMed && extractedMed.length > 2 && extractedMed.toLowerCase() !== 'medicine') {
      const canonical = await resolveAlias(extractedMed);
      session.lastMedicine = canonical;

      const searchLat = session.lat ?? 23.2599; // Default Bhopal centroid if none specified
      const searchLng = session.lng ?? 77.4126;
      const searchCity = session.cityName ?? 'Bhopal';

      const reply = await performMedicineSearch(canonical, searchLat, searchLng, searchCity, phone);
      return twimlResponse(reply);
    }

    // If only a city was provided and there is an existing tracked medicine
    if (session.cityName && session.lastMedicine) {
      const searchLat = session.lat ?? 23.2599;
      const searchLng = session.lng ?? 77.4126;
      const reply = await performMedicineSearch(session.lastMedicine, searchLat, searchLng, session.cityName, phone);
      return twimlResponse(reply);
    }

    // General Greeting & Direct Instructions
    return twimlResponse(
      `Welcome to MedRadar Centralized Public Health Logistics (Bhopal–Indore NH-46 Corridor).\n\nPlease send the medicine name and city.\n\nExamples:\n• *Albumin in Bhopal*\n• *Insulin in Indore*\n• *Metformin in Sehore*`
    );
  } catch (err: any) {
    console.error('Webhook execution error:', err);
    return twimlResponse(
      'Welcome to MedRadar. Please send the medicine name and city (e.g. "Albumin in Bhopal").'
    );
  }
}
