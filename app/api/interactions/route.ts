import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export interface InteractionLog {
  id: string;
  timestamp: string;
  role: 'PHARMACIST' | 'DISTRIBUTOR' | 'PATIENT' | 'ASHA';
  actor: string;
  location: string;
  medicine: string;
  action: string;
  status: 'VERIFIED' | 'RESTOCKED' | 'QUEUED' | 'UNFULFILLED';
}

const DEFAULT_INTERACTIONS: InteractionLog[] = [
  {
    id: 'int-1',
    timestamp: new Date(Date.now() - 2 * 60000).toISOString(),
    role: 'PHARMACIST',
    actor: 'Sharma Medical Karond',
    location: 'Karond Chowk, Bhopal',
    medicine: 'Insulin Regular',
    action: 'Stock Update Received via WhatsApp → 40 Vials Available',
    status: 'RESTOCKED'
  },
  {
    id: 'int-2',
    timestamp: new Date(Date.now() - 7 * 60000).toISOString(),
    role: 'DISTRIBUTOR',
    actor: 'Govindpura C&F Depot',
    location: 'Industrial Area, Bhopal',
    medicine: 'Metformin 500mg & Insulin',
    action: 'Emergency Buffer Dispatched along NH-46 to Sehore CHC',
    status: 'VERIFIED'
  },
  {
    id: 'int-3',
    timestamp: new Date(Date.now() - 14 * 60000).toISOString(),
    role: 'PATIENT',
    actor: 'Patient (+91 98260•••••)',
    location: 'Vijay Nagar, Indore',
    medicine: 'Metformin 500mg',
    action: 'Location Search Completed → 2 Jan Aushadhi Matches Returned',
    status: 'VERIFIED'
  },
  {
    id: 'int-4',
    timestamp: new Date(Date.now() - 22 * 60000).toISOString(),
    role: 'ASHA',
    actor: 'Sunita Devi (ASHA Sector 4)',
    location: 'Ichhawar Rural Zone, Sehore',
    medicine: 'Salbutamol 100mcg Inhaler',
    action: 'Batch Waitlist Registered for 3 Chronic Asthma Patients',
    status: 'QUEUED'
  },
  {
    id: 'int-5',
    timestamp: new Date(Date.now() - 36 * 60000).toISOString(),
    role: 'PATIENT',
    actor: 'Patient (+91 94250•••••)',
    location: 'Ashta Bus Stand',
    medicine: 'Azithromycin 500mg',
    action: 'Search Deficit Logged → 0 Retail Stock within 15km',
    status: 'UNFULFILLED'
  },
  {
    id: 'int-6',
    timestamp: new Date(Date.now() - 50 * 60000).toISOString(),
    role: 'PHARMACIST',
    actor: 'PMBJP Kendra Palasia',
    location: 'Old Palasia, Indore',
    medicine: 'Metformin 500mg',
    action: 'Generic Stock Verified via WhatsApp Scan → 500 Strips @ ₹12',
    status: 'RESTOCKED'
  }
];

export async function GET() {
  try {
    const { data: dbSearches, error } = await supabase
      .from('searches')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    const logs: InteractionLog[] = [...DEFAULT_INTERACTIONS];

    if (!error && dbSearches && dbSearches.length > 0) {
      dbSearches.forEach((s) => {
        logs.unshift({
          id: s.id,
          timestamp: s.created_at,
          role: 'PATIENT',
          actor: `Patient (Lat ${s.lat ? s.lat.toFixed(2) : '23.26'}, Lng ${s.lng ? s.lng.toFixed(2) : '77.41'})`,
          location: s.city || 'Bhopal Region',
          medicine: s.medicine_name,
          action: s.result_count > 0 ? `Found ${s.result_count} active facilities nearby` : 'Search Deficit Reported (0 Local Stock)',
          status: s.result_count > 0 ? 'VERIFIED' : 'UNFULFILLED'
        });
      });
    }

    return NextResponse.json({
      success: true,
      interactions: logs.slice(0, 15)
    });
  } catch (err: any) {
    return NextResponse.json({ success: true, interactions: DEFAULT_INTERACTIONS });
  }
}
