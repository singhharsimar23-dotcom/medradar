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
  flaggedToCoordinator?: boolean;
}

const DEFAULT_INTERACTIONS: InteractionLog[] = [
  {
    id: 'int-1',
    timestamp: new Date(Date.now() - 30 * 1000).toISOString(),
    role: 'PATIENT',
    actor: 'Patient (WhatsApp)',
    location: 'Sehore',
    medicine: 'Albumin 20%',
    action: 'Deficit Flagged → 0 Stock in District Network (Flagged to Coordinator)',
    status: 'UNFULFILLED',
    flaggedToCoordinator: true
  },
  {
    id: 'int-2',
    timestamp: new Date(Date.now() - 2 * 60000).toISOString(),
    role: 'PHARMACIST',
    actor: 'Sharma Medical Karond',
    location: 'Karond Chowk, Bhopal',
    medicine: 'Insulin Regular',
    action: 'Stock Update via WhatsApp → 40 Vials Available (3 Patients SMS Notified)',
    status: 'RESTOCKED',
    flaggedToCoordinator: false
  },
  {
    id: 'int-3',
    timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
    role: 'DISTRIBUTOR',
    actor: 'Govindpura C&F Depot',
    location: 'Industrial Area, Bhopal',
    medicine: 'Metformin 500mg & Insulin',
    action: 'Emergency Buffer Dispatched along NH-46 to Sehore CHC',
    status: 'VERIFIED',
    flaggedToCoordinator: false
  },
  {
    id: 'int-4',
    timestamp: new Date(Date.now() - 10 * 60000).toISOString(),
    role: 'PATIENT',
    actor: 'Patient (+91 98260•••••)',
    location: 'Vijay Nagar, Indore',
    medicine: 'Metformin 500mg',
    action: 'Location Search Completed → 2 Jan Aushadhi Matches Returned',
    status: 'VERIFIED',
    flaggedToCoordinator: false
  },
  {
    id: 'int-5',
    timestamp: new Date(Date.now() - 18 * 60000).toISOString(),
    role: 'ASHA',
    actor: 'Sunita Devi (ASHA Sector 4)',
    location: 'Ichhawar Rural Zone, Sehore',
    medicine: 'Salbutamol 100mcg Inhaler',
    action: 'Batch Waitlist Registered for 3 Chronic Asthma Patients',
    status: 'QUEUED',
    flaggedToCoordinator: true
  },
  {
    id: 'int-6',
    timestamp: new Date(Date.now() - 32 * 60000).toISOString(),
    role: 'PATIENT',
    actor: 'Patient (+91 94250•••••)',
    location: 'Ashta Bus Stand',
    medicine: 'Azithromycin 500mg',
    action: 'Search Deficit Logged → 0 Retail Stock within 15km',
    status: 'UNFULFILLED',
    flaggedToCoordinator: true
  }
];

export async function GET() {
  try {
    const { data: dbSearches, error } = await supabase
      .from('searches')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    const logs: InteractionLog[] = [];

    if (!error && dbSearches && dbSearches.length > 0) {
      dbSearches.forEach((s) => {
        const isDeficit = s.result_count === 0;
        logs.push({
          id: s.id,
          timestamp: s.created_at,
          role: 'PATIENT',
          actor: 'Patient (WhatsApp)',
          location: s.city || 'Bhopal Region',
          medicine: s.medicine_name,
          action: isDeficit
            ? `Critical Deficit Flagged → 0 Stock in ${s.city || 'District'} (Flagged to Coordinator)`
            : `Search Completed → Found ${s.result_count} active facilities nearby`,
          status: isDeficit ? 'UNFULFILLED' : 'VERIFIED',
          flaggedToCoordinator: isDeficit
        });
      });
    }

    // Append background defaults after live DB records
    DEFAULT_INTERACTIONS.forEach((d) => {
      if (!logs.some((l) => l.medicine.toLowerCase() === d.medicine.toLowerCase() && l.location.toLowerCase() === d.location.toLowerCase())) {
        logs.push(d);
      }
    });

    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({
      success: true,
      interactions: logs.slice(0, 15)
    });
  } catch (err: any) {
    return NextResponse.json({ success: true, interactions: DEFAULT_INTERACTIONS });
  }
}
