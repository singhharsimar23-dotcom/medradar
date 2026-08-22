# MedRadar: Public Health Logistics & Stock Surveillance Network

> **NH-46 Healthcare Corridor (Bhopal – Sehore – Ashta – Dewas – Indore)**  
> **Production Deployment:** [https://medradar-vit.vercel.app](https://medradar-vit.vercel.app)  
> **Surveillance Dashboard:** [https://medradar-vit.vercel.app/dashboard](https://medradar-vit.vercel.app/dashboard)  
> **Technical Specification:** [MEDRADAR_SYSTEM_SPECIFICATION.pdf](./MEDRADAR_SYSTEM_SPECIFICATION.pdf)

---

## 1. System Overview & Purpose

MedRadar is an institutional-grade, closed-loop pharmaceutical logistics and real-time stock surveillance system engineered for the Madhya Pradesh NH-46 healthcare corridor. The platform provides continuous visibility into essential medicine availability across **245 verified facilities**, including commercial retail chemists, **Pradhan Mantri Bhartiya Janaushadhi Kendras (PMBJP)**, and government hospital emergency buffer stores.

By unifying citizen demand telemetry, pharmacist stock reporting, and distributor logistics advisories, MedRadar mitigates localized stockouts, eliminates geographical disparities in essential drug access, and provides district health coordinators with predictive depletion velocity metrics.

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                MEDRADAR ECOSYSTEM FLOW                                  │
└─────────────────────────────────────────────────────────────────────────────────────────┘

 [1. PATIENT / CITIZEN]                  [4. DISTRICT COORDINATOR (CMO / ADMIN)]
 • Searches via WhatsApp / Web           • Live Surveillance Dashboard (/dashboard)
 • Submits GPS pin or City               • Real-Time Deficit Heatmap (Bhopal–Indore)
 • If 0 Stock → Joins SMS Waitlist       • Telemetry Stream & Shortage Velocity Matrix
             │                                       │
             ▼                                       ▼
 ┌───────────────────────┐               ┌──────────────────────────────────────┐
 │   Supabase Database   │ ◄──────────── │ Action: "Dispatch Stockist Advisory" │
 │  (Stock & Telemetry)  │               └──────────────────┬───────────────────┘
 └───────────┬───────────┘                                  │
             │                                              ▼
             │                                  [3. C&F DISTRIBUTOR / STOCKIST]
             │                                  • Receives Instant SMS Advisory:
             │                                    "MedRadar: Acute Insulin deficit
             │                                     in Karond & Sehore. Dispatch buffer."
             │                                  • Restocks Local Corridor Pharmacies
             ▼                                              │
 [2. PHARMACIST / CHEMIST]                                  │
 • Updates stock via WhatsApp:                              ▼
   - Text ("Insulin YES" / "KHATAM")             ┌──────────────────────────────────────┐
   - Voice note or Shelf Photo                   │  Automated Restock Notification      │
 • System auto-detects arrival                   │  • Fast2SMS dispatches SMS to all    │
   and triggers geo-fence match                  │    waiting patients within 10 km.    │
                                                 └──────────────────────────────────────┘
```

---

## 2. Production Technology Stack

| Layer | Technology | Specification |
| :--- | :--- | :--- |
| **Frontend Framework** | **Next.js 15.1 (App Router)** | Server Components, React 19, TypeScript 5.7, Tailwind CSS (Slate Institutional Theme). |
| **Spatial Mapping** | **Leaflet 1.9.4 & CartoDB Voyager** | Hardware GPS Geolocation API, sub-10m satellite precision, and cluster visualization. |
| **Database & Realtime** | **Supabase PostgreSQL** | 245 verified corridor facilities, 11,330 stock SKUs, and WebSocket real-time subscription engine. |
| **AI & NLP Engine** | **Gemini 2.5 Flash** | Multi-turn conversational entity parser, multimodal prescription vision, and prompt-injection guardrails. |
| **Messaging & Gateways** | **Twilio & Fast2SMS** | WhatsApp Webhook pipeline, dual-gateway SMS failover, and automated 10 km geofenced restock broadcasts. |
| **Infrastructure & Edge** | **Vercel Enterprise** | Serverless Lambdas, global edge network, automated CI/CD pipeline. |

---

## 3. Core Functional Modules

### A. Citizen Medicine Finder (`/`)
- **Hardware Satellite GPS Detection:** Automatically requests device coordinates to compute real-time driving distances across 245 facilities.
- **Interactive Facility Locator:** Highlights retail pharmacies (green), PMBJP Jan Aushadhi Kendras (teal), and state hospital buffers (sky blue).
- **30-Minute Hold Reservation:** Enables citizens to lock emergency stock at the nearest pharmacy for 30 minutes with an instant confirmation code.
- **Clinical & Pricing Dossier:** Provides Indian Pharmacopoeia (IP) dosage specifications, cold-chain storage parameters, and Jan Aushadhi generic price comparisons (50%–84% cost savings).
- **Automated SMS Restock Queue:** If a commodity has 0 local stock, users can subscribe to automated SMS notifications triggered upon arrival.

### B. Autonomous Multi-Persona WhatsApp Concierge (`/api/webhook/twilio`)
- **Patient Search:** Natural language search handling misspellings (e.g. *"Metamorfin in Bhopal"* $\rightarrow$ *"Metformin 500mg"*), Google Maps URLs, and live GPS pins.
- **Pharmacist Rapid Inventory Mode:** Chemist texts `"Insulin YES"` or `"KHATAM"` $\rightarrow$ updates live database inventory and automatically notifies all waiting patients within 10 km via SMS.
- **Distributor Logistics Portal:** Activated by `"Hi I am a distributor"`, providing corridor deficit reports and recording bulk buffer dispatches to rural CHCs.
- **ASHA Worker Field Triage:** Enables community health workers to batch-register multiple village patients for centralized supply dispatch.

### C. Directorate Surveillance Dashboard (`/dashboard`)
- **Corridor Deficit Distribution Map:** Visualizes stockout clusters across the NH-46 highway corridor.
- **Real-Time Telemetry Stream:** Chronological feed of unfulfilled citizen inquiries categorized by Urban and Rural sectors.
- **Stakeholder Dispatch Audit Feed:** Audit log of all pharmacist inventory updates, distributor allocations, and patient search deficits with 1-click **Dispatch Buffer** triggers.
- **Shortage Velocity Matrix:** 48-hour trailing deficit velocity calculating consumption spikes and assigning risk tiers (`CRITICAL`, `ELEVATED`, `MODERATE`, `NOMINAL`).
- **Emergency SMS Advisory Transmission:** Dispatches targeted logistics memorandums to regional C&F warehouse managers.

---

## 4. API Endpoints Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/search` | `GET` | Spatial Haversine search query matching medicines across nearest verified facilities. |
| `/api/radar` | `GET` | Returns aggregated corridor analytics, shortage velocity metrics, and logistics advisory memorandums. |
| `/api/medicine-info` | `GET` | Retrieves clinical dosage guidelines, Jan Aushadhi pricing, and storage protocols. |
| `/api/interactions` | `GET` | Returns real-time stakeholder communication and dispatch logs. |
| `/api/alert` | `POST` | Dispatches targeted SMS logistics advisories to distributors. |
| `/api/waiting` | `POST` | Registers patient phone numbers for automated restock notifications. |
| `/api/simulate` | `POST` | Simulates pharmacy inventory replenishment and triggers SMS notifications across the 10 km geofence. |
| `/api/webhook/twilio` | `POST` | Autonomous multi-persona WhatsApp webhook engine. |

---

## 5. Local Setup & Verification

### Prerequisites
- Node.js 20+ / 24+
- npm or pnpm

### Environment Configuration (`.env.local`)
```bash
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<supabase-anon-key>
GEMINI_API_KEY=<google-gemini-api-key>
TWILIO_ACCOUNT_SID=<twilio-account-sid>
TWILIO_AUTH_TOKEN=<twilio-auth-token>
FAST2SMS_API_KEY=<fast2sms-api-key>
```

### Installation & Execution
```bash
# Clone the repository
git clone https://github.com/singhharsimar23-dotcom/medradar.git
cd medradar

# Install dependencies
npm install

# Run local development server
npm run dev

# Execute production build verification
npm run build
```

---

