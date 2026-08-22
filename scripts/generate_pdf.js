const fs = require('fs');
const PDFDocument = require('pdfkit');

const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 40, bottom: 40, left: 45, right: 45 }
});

const outputStream = fs.createWriteStream('MEDRADAR_SYSTEM_SPECIFICATION.pdf');
doc.pipe(outputStream);

// Primary Accent Colors (Slate & Crimson Institutional Theme)
const primaryColor = '#0f172a'; // Slate 900
const accentRed = '#b91c1c';    // Crimson 700
const bodyColor = '#334155';    // Slate 700
const lightBg = '#f8fafc';      // Slate 50

// Header
doc.rect(45, 40, 505, 55).fill(primaryColor);
doc.fillColor('#ffffff').fontSize(16).font('Helvetica-Bold').text('MEDRADAR · PUBLIC HEALTH LOGISTICS NETWORK', 60, 52);
doc.fillColor('#94a3b8').fontSize(9).font('Helvetica').text('NH-46 Healthcare Corridor Surveillance Specification (Bhopal – Sehore – Ashta – Dewas – Indore)', 60, 72);

doc.moveDown(3);

// Section 1: Executive Overview & Purpose
doc.fillColor(accentRed).fontSize(12).font('Helvetica-Bold').text('1. EXECUTIVE SUMMARY & PURPOSE');
doc.rect(45, doc.y + 2, 505, 1).fill(accentRed);
doc.moveDown(0.6);

doc.fillColor(bodyColor).fontSize(9.5).font('Helvetica').text(
  'MedRadar is an institutional-grade, closed-loop pharmaceutical logistics and real-time stock surveillance system engineered for the Madhya Pradesh NH-46 healthcare corridor. The platform provides continuous visibility into essential drug availability across 245 verified retail pharmacies, Jan Aushadhi Kendras (PMBJP), and government hospital buffer stores.\n\n' +
  'By unifying citizen demand telemetry, pharmacist stock reporting, and distributor logistics advisories, MedRadar mitigates localized stockouts, eliminates geographical disparities in essential drug access, and provides district health coordinators with predictive depletion velocity metrics.',
  { lineGap: 3 }
);

doc.moveDown(1.2);

// Section 2: Production Technology Stack
doc.fillColor(accentRed).fontSize(12).font('Helvetica-Bold').text('2. PRODUCTION TECHNOLOGY STACK');
doc.rect(45, doc.y + 2, 505, 1).fill(accentRed);
doc.moveDown(0.6);

const stack = [
  ['Frontend Layer', 'Next.js 15.1 (App Router), React 19, TypeScript, Vanilla Tailwind CSS (Slate Theme)'],
  ['Spatial Mapping', 'Leaflet 1.9.4 with CartoDB Voyager Raster Tiles & Hardware GPS Geolocation API'],
  ['Database & Sync', 'Supabase PostgreSQL (245 Facilities, 11,330 SKUs, Real-Time WebSocket Channel Engine)'],
  ['AI & NLP Engine', 'Gemini 2.5 Flash Autonomous Entity Extraction & Prompt-Injection Defense Architecture'],
  ['Messaging & SMS', 'Twilio WhatsApp Webhook API & Fast2SMS High-Throughput Regional Gateway Pipeline'],
  ['Production Host', 'Vercel Enterprise Edge Network with Global CDN & Zero-Cold-Start Serverless Lambdas']
];

stack.forEach(([layer, desc]) => {
  doc.fillColor(primaryColor).fontSize(9).font('Helvetica-Bold').text(`• ${layer}: `, { continued: true });
  doc.fillColor(bodyColor).font('Helvetica').text(desc);
  doc.moveDown(0.3);
});

doc.moveDown(1.2);

// Section 3: Core Functional Modules
doc.fillColor(accentRed).fontSize(12).font('Helvetica-Bold').text('3. CORE FUNCTIONAL MODULES');
doc.rect(45, doc.y + 2, 505, 1).fill(accentRed);
doc.moveDown(0.6);

const modules = [
  ['Citizen Medicine Finder (Web /)', 'Spatial Haversine inventory matching, live driving distance calculation, 30-minute prescription hold reservation, and automated SMS restock queue registration.'],
  ['Autonomous WhatsApp Concierge', 'Multilingual entity parser detecting drug queries, GPS pins, Google Maps URLs, prescription photos, and pharmacist stock broadcast commands ("Insulin YES" / "KHATAM").'],
  ['Directorate Surveillance Dashboard (/dashboard)', 'Corridor deficit heatmaps, live telemetry streams, shortage depletion velocity matrix, and 1-click SMS logistics advisory dispatch to regional C&F depots.'],
  ['Clinical & Pricing Dossier (/api/medicine-info)', 'Indian Pharmacopoeia (IP) composition standards, dosage administration guidelines, cold-chain specifications, and PMBJP Jan Aushadhi generic price comparisons (50%-84% savings).']
];

modules.forEach(([name, details]) => {
  doc.fillColor(primaryColor).fontSize(9.5).font('Helvetica-Bold').text(name);
  doc.fillColor(bodyColor).fontSize(8.5).font('Helvetica').text(details, { lineGap: 2 });
  doc.moveDown(0.5);
});

doc.moveDown(1.2);

// Section 4: Closed-Loop Architecture
doc.fillColor(accentRed).fontSize(12).font('Helvetica-Bold').text('4. CLOSED-LOOP STAKEHOLDER ARCHITECTURE');
doc.rect(45, doc.y + 2, 505, 1).fill(accentRed);
doc.moveDown(0.6);

doc.fillColor(bodyColor).fontSize(9).font('Helvetica').text(
  '1. Patient Query: Citizen searches via GPS or WhatsApp. If 0 retail stock exists, the shortage is logged into the surveillance database.\n' +
  '2. Coordinator Alert: The Surveillance Dashboard aggregates deficits, alerting health administrators.\n' +
  '3. Distributor Dispatch: Logistics advisories trigger buffer stock reallocation from industrial depots to rural CHCs.\n' +
  '4. Chemist Inflow: Pharmacist marks medicine IN STOCK on WhatsApp.\n' +
  '5. Patient Restock Broadcast: System auto-dispatches SMS alerts to all waiting patients within a 10 km geofence.',
  { lineGap: 2.5 }
);

doc.moveDown(1.5);

// Footer
doc.rect(45, 770, 505, 25).fill(lightBg);
doc.fillColor('#64748b').fontSize(8).font('Helvetica').text('MedRadar Production System Specification · Deployment: https://medradar-vit.vercel.app · Directorate of Health Services MP', 55, 778);

doc.end();

outputStream.on('finish', () => {
  console.log('PDF generated successfully: MEDRADAR_SYSTEM_SPECIFICATION.pdf');
});
