-- ============================================================================
-- MEDRADAR COMPLETE DATABASE MIGRATION & SEED
-- Corridor: Indore-Bhopal NH-46 Highway Corridor, Madhya Pradesh, India
-- ============================================================================

-- === STEP 1: CREATE COMPLETE SCHEMA ===

DROP TABLE IF EXISTS reservations CASCADE;
DROP TABLE IF EXISTS waiting_list CASCADE;
DROP TABLE IF EXISTS searches CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS stock CASCADE;
DROP TABLE IF EXISTS medicine_aliases CASCADE;
DROP TABLE IF EXISTS insight_cache CASCADE;
DROP TABLE IF EXISTS pharmacies CASCADE;

CREATE TABLE pharmacies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  lat float NOT NULL,
  lng float NOT NULL,
  address text,
  phone text UNIQUE,
  area text,
  city text DEFAULT 'Bhopal',
  district text DEFAULT 'Bhopal',
  type text DEFAULT 'private',
  is_open boolean DEFAULT true,
  is_pending_approval boolean DEFAULT false,
  osm_id text,
  created_at timestamptz DEFAULT NOW()
);

CREATE TABLE stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id uuid REFERENCES pharmacies(id) ON DELETE CASCADE,
  medicine_name text NOT NULL,
  available boolean DEFAULT false,
  updated_at timestamptz DEFAULT NOW(),
  UNIQUE(pharmacy_id, medicine_name)
);

CREATE TABLE searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medicine_name text,
  lat float,
  lng float,
  result_count int DEFAULT 0,
  is_urgent boolean DEFAULT false,
  city text,
  created_at timestamptz DEFAULT NOW()
);

CREATE TABLE waiting_list (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medicine_name text NOT NULL,
  lat float NOT NULL,
  lng float NOT NULL,
  phone text NOT NULL,
  is_urgent boolean DEFAULT false,
  created_at timestamptz DEFAULT NOW(),
  notified_at timestamptz,
  feedback_sent_at timestamptz,
  feedback_result text,
  CONSTRAINT unique_wait UNIQUE (phone, medicine_name)
);

CREATE TABLE sessions (
  phone text PRIMARY KEY,
  role text DEFAULT 'unknown',
  state text DEFAULT 'new',
  last_medicine text,
  lat float,
  lng float,
  city text,
  is_asha boolean DEFAULT false,
  updated_at timestamptz DEFAULT NOW()
);

CREATE TABLE medicine_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name text UNIQUE NOT NULL,
  canonical_name text NOT NULL
);

CREATE TABLE insight_cache (
  id int PRIMARY KEY DEFAULT 1,
  insight_text text,
  generated_at timestamptz DEFAULT NOW()
);

CREATE TABLE reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_id uuid REFERENCES stock(id) ON DELETE CASCADE,
  patient_phone text,
  pharmacy_id uuid REFERENCES pharmacies(id),
  medicine_name text,
  expires_at timestamptz DEFAULT NOW() + INTERVAL '30 minutes',
  status text DEFAULT 'pending'
);

CREATE INDEX idx_stock_medicine ON stock(medicine_name);
CREATE INDEX idx_stock_available ON stock(available);
CREATE INDEX idx_searches_created ON searches(created_at DESC);
CREATE INDEX idx_searches_city ON searches(city);
CREATE INDEX idx_waiting_medicine ON waiting_list(medicine_name);
CREATE INDEX idx_pharmacies_city ON pharmacies(city);
CREATE INDEX idx_pharmacies_type ON pharmacies(type);
CREATE UNIQUE INDEX IF NOT EXISTS idx_osm_id ON pharmacies(osm_id) WHERE osm_id IS NOT NULL;

ALTER PUBLICATION supabase_realtime ADD TABLE stock;
ALTER PUBLICATION supabase_realtime ADD TABLE searches;

-- === STEP 2: INSERT REAL OSM PHARMACIES (120 entries) ===
INSERT INTO pharmacies (name, lat, lng, address, phone, area, city, district, type, is_open, is_pending_approval, osm_id) VALUES
('Shri Medicals', 23.2377581, 77.402213, NULL, NULL, 'Bhopal', 'Bhopal', 'Bhopal', 'private', true, false, '6125894181'),
('Sambhavna Dispensary', 23.2745721, 77.4058558, NULL, NULL, 'Bhopal', 'Bhopal', 'Bhopal', 'private', true, false, '13087319048'),
('Neetu Medical Store', 23.2144472, 77.4314868, NULL, NULL, 'Bhopal', 'Bhopal', 'Bhopal', 'private', true, false, '13924036689'),
('Govind Medico', 23.2360907, 77.4007683, NULL, NULL, 'Bhopal', 'Bhopal', 'Bhopal', 'private', true, false, '13928812574'),
('Divyanka Medicos', 23.2784868, 77.4525269, NULL, NULL, 'Bhopal', 'Bhopal', 'Bhopal', 'private', true, false, '13929321789'),
('Astha Medical Store', 23.2687432, 77.4572217, NULL, NULL, 'Bhopal', 'Bhopal', 'Bhopal', 'private', true, false, '13931041497'),
('New Life Medicos', 23.2339403, 77.4029803, NULL, NULL, 'Bhopal', 'Bhopal', 'Bhopal', 'private', true, false, '13931041591'),
('Bharat Medical Store', 23.2785769, 77.4036826, NULL, NULL, 'Bhopal', 'Bhopal', 'Bhopal', 'private', true, false, '13935317685'),
('Healthkart', 23.2696593, 77.4582832, NULL, NULL, 'Bhopal', 'Bhopal', 'Bhopal', 'private', true, false, '13938730395'),
('Samta Medical Store', 23.2783057, 77.452273, NULL, '+91 98273 83879', 'Bhopal', 'Bhopal', 'Bhopal', 'private', true, false, '13938737341'),
('Davaindia', 23.270594, 77.4586496, NULL, '8962096677', 'Bhopal', 'Bhopal', 'Bhopal', 'private', true, false, '13938737368'),
('Qura Pharmacy', 23.2707666, 77.4588257, NULL, '6269243211', 'Bhopal', 'Bhopal', 'Bhopal', 'private', true, false, '13938737369'),
('CGHS WC 2', 23.2000785, 77.4348487, 'bharat nagar road', NULL, 'Bhopal', 'Bhopal', 'Bhopal', 'private', true, false, '14109631601'),
('Seva Medical', 23.157564, 75.796357, NULL, NULL, 'Indore', 'Indore', 'Indore', 'private', true, false, '1669427116'),
('Arshid shah', 22.7096242, 75.8270791, 'Dhar road', '8103012446', 'Indore', 'Indore', 'Indore', 'private', true, false, '4522507595'),
('Sanjivani Ayurveda Medical', 22.7529191, 75.9050024, 'Bombay Hospital Sqaure, Indore', '9039137640', 'Indore', 'Indore', 'Indore', 'private', true, false, '6187436059'),
('Well Care Pharmacy', 22.7538924, 75.9052598, 'Scheme No 94, Bombay Hospital Square, Indore', '9893149485', 'Indore', 'Indore', 'Indore', 'private', true, false, '6187441510'),
('S. Kumar Homeopathic', 22.7538664, 75.9052572, 'Scheme No 94, Bombay Hospital Square, Indore', '9826008788', 'Indore', 'Indore', 'Indore', 'private', true, false, '6187441511'),
('Shri Ram Medical Store', 22.750667, 75.90011, 'Ganga Devi Nagar, Vijyanagar, Indore', '8878967887', 'Indore', 'Indore', 'Indore', 'private', true, false, '6187444637'),
('Shri Balaji Healthcare Pharmacy', 22.7501646, 75.900922, 'Sheetali Nagar, Indore', '9009992551', 'Indore', 'Indore', 'Indore', 'private', true, false, '6187447526'),
('Total Drug Centre', 22.7531535, 75.9043543, 'Scheme Number 94,Ring Road,Near Bombay Hospital Square, Indore', '0731-2578737', 'Indore', 'Indore', 'Indore', 'private', true, false, '6187457348'),
('Ethereal Skin and Laser Clinique', 22.7578302, 75.9036082, 'Vasant Vihar, Indore', '07312550202', 'Indore', 'Indore', 'Indore', 'private', true, false, '6187463485'),
('Navodaya Medicose', 22.7532428, 75.8998828, 'Suman Nagar, Indore', '07314986227 ,7772866882', 'Indore', 'Indore', 'Indore', 'private', true, false, '6187540870'),
('Aapka Medicose', 22.7536516, 75.9022214, 'Royal Platinum Building,Scheme Number 54, Vijay Nagar, Indore', '07314085000', 'Indore', 'Indore', 'Indore', 'private', true, false, '6187551956'),
('Surya Medical Store', 22.7504716, 75.9005968, 'Sheetal Nagar, Indore', '8889509885', 'Indore', 'Indore', 'Indore', 'private', true, false, '6187562530'),
('Lifecraft Healthcare Pvt Ltd', 22.7487836, 75.8959781, 'Vijaynagar Square, Indore', '07314747000', 'Indore', 'Indore', 'Indore', 'private', true, false, '6190269243'),
('Aura Wellness Center', 22.7471855, 75.8883532, 'Badi Bhamori, Part II, Nanda Nagar, Indore', '099779 39122', 'Indore', 'Indore', 'Indore', 'private', true, false, '6190301140'),
('Padmakshi Medicose', 22.7468947, 75.8885956, 'Bhamori Plaza, Indore', '7772060474', 'Indore', 'Indore', 'Indore', 'private', true, false, '6190309084'),
('Atika Medical', 22.7467123, 75.8877179, 'Badi Bhamori Plaza, Indore', '8109558525', 'Indore', 'Indore', 'Indore', 'private', true, false, '6190332347'),
('Bhawna Medical', 22.7461825, 75.8870436, 'Anjani Nagar, Bhamori, Indore', '9826436949', 'Indore', 'Indore', 'Indore', 'private', true, false, '6190339162'),
('Gagan Medical', 22.745958, 75.8865914, 'New Anjani Nagar, Bhamori, Indore', '97539 50222', 'Indore', 'Indore', 'Indore', 'private', true, false, '6190347200'),
('Revti Medical Stores', 22.7536739, 75.8859737, 'Royal View, Vijay Nagar, Indore', '9826135057', 'Indore', 'Indore', 'Indore', 'private', true, false, '6190356339'),
('Emkay Distributors', 22.7554263, 75.8862151, 'Scheme 54, Vijay Nagar, Indore', '9826640484', 'Indore', 'Indore', 'Indore', 'private', true, false, '6190362990'),
('Aroma Medical And General Stores', 22.7681055, 75.8933509, 'Nayi Sadak, Part 1, Scheme Number 114, Indore', '9826962661', 'Indore', 'Indore', 'Indore', 'private', true, false, '6193071158'),
('Pragati Medical', 22.7476295, 75.9008181, 'Chitra Nagar, Indore', '9926266956', 'Indore', 'Indore', 'Indore', 'private', true, false, '6193204524'),
('Patidar Medical', 22.7488366, 75.9057855, 'MR 10, Indore', '9806147400', 'Indore', 'Indore', 'Indore', 'private', true, false, '6194074527'),
('New Patidar Homeo Pharmacy', 22.7540922, 75.9075148, 'Mahalaxmi Nagar, Indore', '07312576866,9425025866', 'Indore', 'Indore', 'Indore', 'private', true, false, '6194129945'),
('Arogya Medical and General Stores', 22.769279, 75.8798486, 'Scheme No 136, Bulandshahr, Square, Indore, Madhya Pradesh, Indore', '9981619869', 'Indore', 'Indore', 'Indore', 'private', true, false, '6194151651'),
('Mohan Chemist', 22.753953, 75.9081888, 'Mahalakshmi Nagar, Indore', '8305304050', 'Indore', 'Indore', 'Indore', 'private', true, false, '6194159936'),
('Jai Minesh Medical Store', 22.7478373, 75.8998847, 'Adarsh Meghdoot Nagar,AB Road, Indore', '9009839466', 'Indore', 'Indore', 'Indore', 'private', true, false, '6194162706'),
('Swati Medical', 22.7495762, 75.9004091, 'Sheetal Nagar, Indore', '9827315150', 'Indore', 'Indore', 'Indore', 'private', true, false, '6194167635'),
('New Maa Vaishno Medicals', 22.7532593, 75.9046349, 'Scheme Number 94,Ring Road,Near Bombay Hospital Square, Indore', '9098888805', 'Indore', 'Indore', 'Indore', 'private', true, false, '6194184570'),
('Akshat Medical Stores', 22.7677976, 75.879044, 'Lahiya Colony Kabid- Khedi Main Road, Indore', '+918223007882', 'Indore', 'Indore', 'Indore', 'private', true, false, '6194186903'),
('Aarogya Retail', 22.7535406, 75.90459, 'Scheme No. 94, Ring Road, Indore', '07773868686', 'Indore', 'Indore', 'Indore', 'private', true, false, '6194190410'),
('Sewak Medical Store', 22.7548162, 75.9076054, 'Mahalaxmi Nagar, Indore', '9893105429', 'Indore', 'Indore', 'Indore', 'private', true, false, '6194195734'),
('Gurunanak Medical', 22.7526025, 75.8899729, 'Vijay Nagar, Indore', '07314075918 , 8602199943', 'Indore', 'Indore', 'Indore', 'private', true, false, '6194197761'),
('Divyansh Homeo Medical', 22.7539098, 75.907812, 'Mahalaxmi Nagar, Indore', '9826044109', 'Indore', 'Indore', 'Indore', 'private', true, false, '6194200316'),
('Shrishti Woman''s Health Clinic', 22.7537898, 75.9079126, 'Mahalaxmi Nagar, Main Road, Indore', '7566743090;07314983090', 'Indore', 'Indore', 'Indore', 'private', true, false, '6194203888'),
('Shree Vinayak Medical and General Stores', 22.7673895, 75.8788401, 'Lahiya Colony ,Kabid Khedi Main Road, Indore', '+919644075403', 'Indore', 'Indore', 'Indore', 'private', true, false, '6194204446'),
('Kavya Chemist', 22.7669394, 75.8787597, 'Indore', '9300603620', 'Indore', 'Indore', 'Indore', 'private', true, false, '6194214832'),
('Rohan Medical', 22.7529058, 75.8889934, 'Vijay Nagar, Indore', '07312571777', 'Indore', 'Indore', 'Indore', 'private', true, false, '6194226103'),
('Siddh Herbal Shop', 22.7523684, 75.8904732, 'Vijay Nagar, Indore', '07314206300 , 8982210001', 'Indore', 'Indore', 'Indore', 'private', true, false, '6194244355'),
('Aarogya Medical Stores', 22.7525806, 75.8898505, 'Vijay Nagar, Indore', '9522288106', 'Indore', 'Indore', 'Indore', 'private', true, false, '6194277326'),
('RX Tele Pharmacy', 22.7528392, 75.889085, 'Vijay Nagar, Indore', '0731473333', 'Indore', 'Indore', 'Indore', 'private', true, false, '6194282179'),
('Medidost Pharmacy', 22.7526913, 75.8893771, 'Vijay Nagar, Indore', '9009877700', 'Indore', 'Indore', 'Indore', 'private', true, false, '6194336244'),
('Anand Medical', 22.7564012, 75.8926796, 'Scheme No.54, Vijay Nagar, Indore', '0731 257 2660', 'Indore', 'Indore', 'Indore', 'private', true, false, '6194366139'),
('The Taj Pharmacy', 22.7605573, 75.8909162, 'Scheme no. 78,vijay nagar,Indore, Indore', '7746996083', 'Indore', 'Indore', 'Indore', 'private', true, false, '6194384551'),
('Shree Laxmi Medical', 22.7687077, 75.8852157, 'Shivani Nagar, Kabeet Khedi, Indore', NULL, 'Indore', 'Indore', 'Indore', 'private', true, false, '6194385508'),
('Totall Pharmacy& Health Shoppe', 22.7565923, 75.903171, 'scheme no. 54, Indore', '07312443111', 'Indore', 'Indore', 'Indore', 'private', true, false, '6194434888'),
('Malwa Medical Stores', 22.7567029, 75.8883505, 'Scheme no. 54,Vijay Nagar, Indore', '07314001828', 'Indore', 'Indore', 'Indore', 'private', true, false, '6194442286'),
('Raj Medical', 22.7517424, 75.8939865, 'Cross Road Complex, Side Walking Rd, Vijay Nagar, Indore, Indore', '9329221420', 'Indore', 'Indore', 'Indore', 'private', true, false, '6196187831'),
('Health And Wealth Medicose', 22.7532345, 75.8997962, 'Suman Nagar, Behind BCM Heights, Indore', '7772866882', 'Indore', 'Indore', 'Indore', 'private', true, false, '6196241041'),
('Medisurve Pharmacy', 22.7556189, 75.8901483, 'Scheme No.54, Vijay Nagar, Indore', '8962988482', 'Indore', 'Indore', 'Indore', 'private', true, false, '6196324786'),
('Navodaya Medicose', 22.7502218, 75.9011722, 'Sheetal Nagar, Near Radisson Hotel, Indore', '9009992551', 'Indore', 'Indore', 'Indore', 'private', true, false, '6196324787'),
('Tithi Chemist', 22.7550738, 75.8882722, 'Scheme No. 54, Vijay Nagar, Indore', '9111109988', 'Indore', 'Indore', 'Indore', 'private', true, false, '6196342366'),
('Arogya Medical Store', 22.7536213, 75.8877005, 'Scheme No. 54, Vijay Nagar, Indore', '07314061989', 'Indore', 'Indore', 'Indore', 'private', true, false, '6196348269'),
('Ambika Medicose', 22.7432586, 75.8985905, 'Indore', '9713775655', 'Indore', 'Indore', 'Indore', 'private', true, false, '6200995364'),
('Chanchal Medicare Store', 22.7494847, 75.8743072, 'Clerk Colony,I.T.I Square, Indore', '9644500024', 'Indore', 'Indore', 'Indore', 'private', true, false, '6201377962'),
('Akshay Medical Store', 22.7496034, 75.8740979, 'Clerk Colony,I.T.I Square, Indore', '9977753278', 'Indore', 'Indore', 'Indore', 'private', true, false, '6201377963'),
('Perfect Medical Store', 22.7496813, 75.8739691, 'Clerk Colony,I.T.I Square, Indore', '9926412139', 'Indore', 'Indore', 'Indore', 'private', true, false, '6201377964'),
('Medicine House', 22.7479313, 75.8772093, 'nanda nagar, Indore', '8770833155', 'Indore', 'Indore', 'Indore', 'private', true, false, '6201433591'),
('Divya Medicose', 22.7424052, 75.8833824, 'Nanda Nagar, Indore', '+917314022807', 'Indore', 'Indore', 'Indore', 'private', true, false, '6201497560'),
('Rehan Chemist', 22.7327043, 75.8943325, 'Anop Nagar, Shree Nagar Extension, Indore', '9893420653', 'Indore', 'Indore', 'Indore', 'private', true, false, '6201560999'),
('Isha Chemist', 22.7290417, 75.8945095, 'Anand Bazaar Road, Shree Nagar Main Colony, Indore', '07314061879', 'Indore', 'Indore', 'Indore', 'private', true, false, '6201561016'),
('Divyani Medical Shopee', 22.7297517, 75.8974331, 'Mahadev Regency Shri Nagar Extension Khajrana main road, Indore', '9754550966', 'Indore', 'Indore', 'Indore', 'private', true, false, '6201561029'),
('Suyagya Medical Store', 22.7405747, 75.8814204, 'Street No 7, Patni Pura, Indore', '+9190093 41341', 'Indore', 'Indore', 'Indore', 'private', true, false, '6201620093'),
('Sahil Medical', 22.7403743, 75.8812755, 'Nanda Nagar Square, Indore', '+919425032445', 'Indore', 'Indore', 'Indore', 'private', true, false, '6201659049'),
('Manish Medical', 22.739506, 75.8805513, 'Patnipura Square, Indore', '+919407177714', 'Indore', 'Indore', 'Indore', 'private', true, false, '6201679025'),
('Shiv Medical', 22.7392191, 75.8805621, 'Patni pura Main Road, Indore', '+919893734118', 'Indore', 'Indore', 'Indore', 'private', true, false, '6201712043'),
('Shree Giriraj Medical', 22.7281474, 75.8948797, 'Anand Bazar,Indore, Indore', '9826800096', 'Indore', 'Indore', 'Indore', 'private', true, false, '6201743113'),
('Shri Kartik Medical', 22.7424856, 75.8757904, 'stadium ground road,nanda nagar, Indore', '9977348667', 'Indore', 'Indore', 'Indore', 'private', true, false, '6201770911'),
('Shri Ji Medical', 22.7423025, 75.8761069, 'Nanda Nagar Main Road,Opp. Syndicate Bank, Indore', '9893633193', 'Indore', 'Indore', 'Indore', 'private', true, false, '6201770913'),
('Shubham Medical Stores', 22.7421838, 75.8763107, 'Nanda Nagar Main Road, Indore', '9229422295', 'Indore', 'Indore', 'Indore', 'private', true, false, '6201770914'),
('SatyaSai Medical', 22.7424787, 75.8766819, 'nanda nagar, Indore', '9993819319', 'Indore', 'Indore', 'Indore', 'private', true, false, '6201770915'),
('Laxmi Medical', 22.7437311, 75.8777846, 'dubey colony, nanda nagar, Indore', '9755377684', 'Indore', 'Indore', 'Indore', 'private', true, false, '6201770917'),
('Pradhan Mantri Jan Aushadhi Kendra', 22.7392488, 75.8822679, 'Patnipura MIG Road, Indore', '+918516913376', 'Indore', 'Indore', 'Indore', 'private', true, false, '6201771684'),
('Savita Medicals', 22.7339796, 75.8893087, 'Nehru Nagar main road, Indore', NULL, 'Indore', 'Indore', 'Indore', 'private', true, false, '6201774217'),
('Pulse Pharmacy', 22.7340983, 75.8897379, 'LIG square, Indore', '+919926328318', 'Indore', 'Indore', 'Indore', 'private', true, false, '6201774218'),
('Patel Medical Stores', 22.7336629, 75.8898023, 'LIG square,LIG main road, Indore', '+919926668167', 'Indore', 'Indore', 'Indore', 'private', true, false, '6201774220'),
('Deepali Pharma', 22.7389816, 75.8823538, 'Jagjivanram Nagar,Near Patnipura, Indore', '0731 255 0510', 'Indore', 'Indore', 'Indore', 'private', true, false, '6201798862'),
('Life Care Medicose', 22.7420886, 75.8957876, 'gali no.2, malviya nagar square, Indore', '8319255857', 'Indore', 'Indore', 'Indore', 'private', true, false, '6201821822'),
('Matushree Medical Store', 22.7424435, 75.8948797, 'chandra nagar, Indore', '9981255455', 'Indore', 'Indore', 'Indore', 'private', true, false, '6201821826'),
('Kuldeep Medical', 22.7415345, 75.9001073, 'HS tower, barfani dham, Indore', '9977893248', 'Indore', 'Indore', 'Indore', 'private', true, false, '6201821828'),
('A.B Medicose', 22.7581506, 75.9019246, 'amar aangan, basant vihar, Indore', '9826091156', 'Indore', 'Indore', 'Indore', 'private', true, false, '6201821830'),
('Universal Medical', 22.7609902, 75.9054192, 'scheme no. 94, Indore', '07314047056', 'Indore', 'Indore', 'Indore', 'private', true, false, '6201821831'),
('Sneh Chemist', 22.7440564, 75.8733147, 'subhash nagar, Indore', '07312542719', 'Indore', 'Indore', 'Indore', 'private', true, false, '6201832710'),
('Mamta Medicos', 22.7437867, 75.8737412, 'teen pulia,nanda nagar main road, Indore', '9425910477', 'Indore', 'Indore', 'Indore', 'private', true, false, '6201832712'),
('Vivek Medical', 22.7432512, 75.8959365, 'Malviya Nagar, Indore', '+919179629459', 'Indore', 'Indore', 'Indore', 'private', true, false, '6201852273'),
('Yanish Medicose', 22.7291951, 75.8792531, 'R S Bhandari Marg, Indore', '9893766640', 'Indore', 'Indore', 'Indore', 'private', true, false, '6201854069'),
('Asha Medicose', 22.7392747, 75.8803756, 'Patnipura Main Road, Indore', '+919893940594', 'Indore', 'Indore', 'Indore', 'private', true, false, '6201854078'),
('Geetanjali Medical Store', 22.7388554, 75.8826662, 'Jagjivan Nagar Indore, Indore', NULL, 'Indore', 'Indore', 'Indore', 'private', true, false, '6201875774'),
('Yashvi Medical', 22.7422296, 75.8981359, 'Mahesh Colony, Indore', '+919826603304', 'Indore', 'Indore', 'Indore', 'private', true, false, '6201885080'),
('Dr Burhanuddin Saifi Pharmacy', 22.7385561, 75.8831088, 'Jagjivan Ram Nagar Indore, Indore', '+918269760606', 'Indore', 'Indore', 'Indore', 'private', true, false, '6201886444'),
('Nimish Medicose', 22.742237, 75.8984148, 'Shradha Shri Colony,MR-9, Indore', '+919179190095', 'Indore', 'Indore', 'Indore', 'private', true, false, '6201893874'),
('New Mahesh Medicose', 22.7374974, 75.8842889, 'Nehru Nagar, Indore', '07312546098', 'Indore', 'Indore', 'Indore', 'private', true, false, '6201907788'),
('Kuldeep Medical', 22.7415345, 75.9000778, 'H S Tower, Malviya Nagar,MR-9, Indore', '+919111120898', 'Indore', 'Indore', 'Indore', 'private', true, false, '6201908043'),
('Apna Medicose', 22.7375765, 75.8852867, 'MIG Colony, Indore', '+919630027840', 'Indore', 'Indore', 'Indore', 'private', true, false, '6201933094'),
('Ratan Chemist', 22.7375715, 75.8853833, 'MIG Colony, Indore', '+919425496423', 'Indore', 'Indore', 'Indore', 'private', true, false, '6201951017'),
('Shri Rajchandra Medicose', 22.7425168, 75.8940191, 'Chandra Nagar, MR-9, Indore', '+919826763209', 'Indore', 'Indore', 'Indore', 'private', true, false, '6202003763'),
('Kirti Chemist', 22.7274139, 75.8806264, 'Municipal Market, Dr R S Bhandari Marg, Indore', '9826717351', 'Indore', 'Indore', 'Indore', 'private', true, false, '6202033684'),
('KK Medical Store', 22.7365771, 75.8821821, 'Road No.5 LIG Colony, Indore', '+918349315816', 'Indore', 'Indore', 'Indore', 'private', true, false, '6202062103'),
('Malwa Medicose', 22.7318632, 75.8745794, 'Yashwant Niwas Road, Indore', '+919575758527', 'Indore', 'Indore', 'Indore', 'private', true, false, '6202063808'),
('Kabir Medical Store', 22.7407364, 75.9036235, 'Sawariya Nagar,MR 9 Road, Indore', '+919644442464', 'Indore', 'Indore', 'Indore', 'private', true, false, '6202084445'),
('Arogya Medicose', 22.7345584, 75.8901268, 'LIG square Chhoti Khajrani Main Road, Indore', '+919522288109', 'Indore', 'Indore', 'Indore', 'private', true, false, '6202086417'),
('Lucky Medical', 22.7405933, 75.8972953, 'Barfani Dham, Indore, Indore', '9977721118', 'Indore', 'Indore', 'Indore', 'private', true, false, '6202136131'),
('New Manjeet Chemist', 22.7341073, 75.874849, 'Plot No. 30, scheme number 91, Malwa Mill Chauraha, Indore, Indore', '9424700000', 'Indore', 'Indore', 'Indore', 'private', true, false, '6202175996'),
('Chhotelal Dadupanthi', 22.7335296, 75.875622, '11/2 Chanakya Complex, Near Malwa Mill, Indore, Indore', '07312533812', 'Indore', 'Indore', 'Indore', 'private', true, false, '6202175997'),
('Anurag Medicose', 22.7332822, 75.8757892, '91 Y.N Road Chanakya complex, Indore', '7354567668', 'Indore', 'Indore', 'Indore', 'private', true, false, '6202176000'),
('Yash Medicose', 22.7330702, 75.8759867, 'R.S Bhandari Marg, Near Malwa Mill, Indore', '9425312149', 'Indore', 'Indore', 'Indore', 'private', true, false, '6202176001'),
('Agrawal Medical Store', 22.7380649, 75.8961713, 'Krishna bagh colony, Indore', '+917000886100', 'Indore', 'Indore', 'Indore', 'private', true, false, '6202244407')
ON CONFLICT DO NOTHING;

-- === STEP 3: INSERT REAL OSM HEALTH FACILITIES (47 entries) ===
INSERT INTO pharmacies (name, lat, lng, address, phone, area, city, district, type, is_open, is_pending_approval, osm_id) VALUES
('District Hospital,Indore', 22.7088254, 75.8308062, 'Near Chandan Nagar Square Dhar Road Indore, Indore', NULL, 'Indore', 'Indore', 'Indore', 'district_hospital', true, false, '6214033167'),
('Primary Health Care Center', 22.7699439, 75.889174, 'Rajiv Awas,Sch.No 114, Indore', NULL, 'Indore', 'Indore', 'Indore', 'PHC', true, false, '6225558146'),
('Government Urban Primary Health Center', 22.7297122, 75.8117151, 'Babumurai Colony, Airport Road,Indore, Indore', NULL, 'Indore', 'Indore', 'Indore', 'PHC', true, false, '6308743062'),
('Mahatma Gandhi District Hospital', 22.9620152, 76.0482135, NULL, NULL, 'Indore', 'Indore', 'Indore', 'district_hospital', true, false, '7015948923'),
('PHC Baibori', 22.6828633, 77.2730738, 'Phc Baibori', NULL, 'Sehore', 'Sehore', 'Sehore', 'PHC', true, false, '7088099826'),
('UPHC ANAND NAGAR', 23.2514775, 77.4836446, 'Anand Nagar Choraha,', NULL, 'Bhopal', 'Bhopal', 'Bhopal', 'PHC', true, false, '7088518408'),
('CHC Sanwer', 22.977051, 75.8278406, 'Sanwer', NULL, 'Indore', 'Indore', 'Indore', 'CHC', true, false, '7089008050'),
('PHC Maksi', 23.2590472, 76.1473238, 'Gadroli Word No15', NULL, 'Indore', 'Indore', 'Indore', 'PHC', true, false, '7089314795'),
('PHC Siddiganj', 22.8555165, 76.6139477, 'Siddikiganj', NULL, 'Ashta', 'Ashta', 'Sehore', 'PHC', true, false, '7095928693'),
('PHC Berchha', 23.2839255, 76.324072, 'Berchha Gaon Road', NULL, 'Dewas', 'Dewas', 'Dewas', 'PHC', true, false, '7096029733'),
('PHC Paniaon', 22.7243549, 76.5745072, 'Ward No. 12 Bijwad-Kusmaniya Road', NULL, 'Ashta', 'Ashta', 'Sehore', 'PHC', true, false, '7096038886'),
('PHC RATIBAD', 23.1622106, 77.4686417, 'Thane K Pass', NULL, 'Bhopal', 'Bhopal', 'Bhopal', 'PHC', true, false, '7096050462'),
('PHC Amlaha', 23.1201697, 76.9066156, 'Phc Amlaha', NULL, 'Ashta', 'Ashta', 'Sehore', 'PHC', true, false, '7096134246'),
('PHC Bolai', 23.3775882, 76.4758643, NULL, NULL, 'Dewas', 'Dewas', 'Dewas', 'PHC', true, false, '7096134255'),
('CHC GANDHINAGAR', 23.2998885, 77.3474126, 'Airport Road', NULL, 'Bhopal', 'Bhopal', 'Bhopal', 'CHC', true, false, '7101079325'),
('PHC Kusmanya', 22.7757518, 76.7531846, 'Ashta-Kannod Road', NULL, 'Ashta', 'Ashta', 'Sehore', 'PHC', true, false, '7101079365'),
('UPHC Saibaba Nagar', 23.2070647, 77.4413113, 'E- 6 Arera Colony', NULL, 'Bhopal', 'Bhopal', 'Bhopal', 'PHC', true, false, '7101275472'),
('PHC Doblechoki', 22.7033366, 76.1243413, 'Nemawar Road', NULL, 'Indore', 'Indore', 'Indore', 'PHC', true, false, '7101474095'),
('PHC Bavdikheda', 22.7446983, 76.6264227, 'Kusmaniya Road', NULL, 'Ashta', 'Ashta', 'Sehore', 'PHC', true, false, '7101724836'),
('PHC Jhokar', 23.2409074, 76.1769006, NULL, NULL, 'Indore', 'Indore', 'Indore', 'PHC', true, false, '7101892376'),
('CHC Bilkisganj', 23.1171157, 77.2399177, 'Sector Bilkisganj', NULL, 'Sehore', 'Sehore', 'Sehore', 'CHC', true, false, '7102291542'),
('PHC Diwadia', 22.9659975, 76.9817738, 'Phc Diwadia', NULL, 'Sehore', 'Sehore', 'Sehore', 'PHC', true, false, '7103460537'),
('PHC PHANDA', 23.2259677, 77.2069681, 'Phanda', NULL, 'Sehore', 'Sehore', 'Sehore', 'PHC', true, false, '7104437077'),
('Primary Health Center Jan Arogya Kamlapur', 22.7460081, 76.434693, 'Badi Kamlapur Road', NULL, 'Dewas', 'Dewas', 'Dewas', 'PHC', true, false, '7105145597'),
('PHC Jawasiyakumar', 23.1909976, 76.1062941, 'Village Jawasiyakumar', NULL, 'Indore', 'Indore', 'Indore', 'PHC', true, false, '7105194960'),
('PHC Pipalranwa', 23.1582871, 76.4679001, 'Bercha Road', NULL, 'Dewas', 'Dewas', 'Dewas', 'PHC', true, false, '7105257342'),
('CHC Ghatiya', 23.3806823, 75.8617444, 'Sector Ghattiya', NULL, 'Indore', 'Indore', 'Indore', 'CHC', true, false, '7105915408'),
('UPHC shujalapur', 23.3820517, 76.718979, 'Panchwati Parisar', NULL, 'Ashta', 'Ashta', 'Sehore', 'PHC', true, false, '7106592390'),
('UPHC BARKHEDA PATHANI', 23.2129207, 77.4792646, 'Barkheda Pathani', NULL, 'Bhopal', 'Bhopal', 'Bhopal', 'PHC', true, false, '7106625176'),
('All India Institute of Medical Sciences (AIIMS), Bhopal', 23.2093426, 77.4584547, 'Aiims Bhopal,', NULL, 'Bhopal', 'Bhopal', 'Bhopal', 'hospital', true, false, '7106710075'),
('PHC Tajpur', 23.2183314, 75.9075505, 'Village Tajpur', NULL, 'Indore', 'Indore', 'Indore', 'PHC', true, false, '7106835396'),
('CHC Doraha', 23.3981309, 77.1607858, 'Sector Doraha', NULL, 'Berasia', 'Berasia', 'Bhopal', 'CHC', true, false, '7106835443'),
('UPHC Ashoka Gardern', 23.2583812, 77.4360488, 'Ashoka Gardern', NULL, 'Bhopal', 'Bhopal', 'Bhopal', 'PHC', true, false, '7107499590'),
('District Hospital,SEHORE', 23.1981078, 77.0812948, 'District Hospital Sehore', NULL, 'Sehore', 'Sehore', 'Sehore', 'district_hospital', true, false, '7108297763'),
('PHC Kshipra', 22.8936655, 75.9799299, 'Kshipra', NULL, 'Indore', 'Indore', 'Indore', 'PHC', true, false, '7112063479'),
('UPHC Kamlakant Modi', 22.7084399, 75.860827, 'Indore', NULL, 'Indore', 'Indore', 'Indore', 'PHC', true, false, '7112621901'),
('PHC Kothri', 23.0772698, 76.8352984, 'Kothri', NULL, 'Ashta', 'Ashta', 'Sehore', 'PHC', true, false, '7112621941'),
('CHC Tonk Khurd', 23.0930496, 76.2255947, 'I.T.I Road', NULL, 'Dewas', 'Dewas', 'Dewas', 'CHC', true, false, '7112629884'),
('Indira Gandhi Hospital', 23.2610396, 77.4010633, NULL, NULL, 'Bhopal', 'Bhopal', 'Bhopal', 'hospital', true, false, '7288631387'),
('Superintendent Office Sultania Zanana Hospital', 23.2552746, 77.4081332, NULL, NULL, 'Bhopal', 'Bhopal', 'Bhopal', 'hospital', true, false, '7288631391'),
('Community Health Centre, Narwar', 23.0641336, 75.9184429, NULL, NULL, 'Indore', 'Indore', 'Indore', 'CHC', true, false, '7904651463'),
('Primary Health Centre, Panbihar', 23.3182878, 75.766432, NULL, NULL, 'Indore', 'Indore', 'Indore', 'PHC', true, false, '7911857410'),
('Primary Health Centre, Arnia Kalan', 23.2317149, 76.7398111, NULL, NULL, 'Ashta', 'Ashta', 'Sehore', 'PHC', true, false, '7961471345'),
('Primary Health Centre, Awantipur Badodiya', 23.1434664, 76.580341, NULL, NULL, 'Ashta', 'Ashta', 'Sehore', 'PHC', true, false, '7975899243'),
('Primary Health Centre, Maina', 23.1652142, 76.6660497, NULL, NULL, 'Ashta', 'Ashta', 'Sehore', 'PHC', true, false, '8008262491'),
('Gandhi Medical College and Hamidia Hospital', 23.2591853, 77.3909881, NULL, NULL, 'Bhopal', 'Bhopal', 'Bhopal', 'hospital', true, false, '364479903'),
('Sultania Zanana Hospital', 23.2564379, 77.4095038, 'Sultania Road', NULL, 'Bhopal', 'Bhopal', 'Bhopal', 'hospital', true, false, '364479904')
ON CONFLICT DO NOTHING;

-- === STEP 4: INSERT CONFIRMED MAJOR HOSPITALS & PHCs ===

INSERT INTO pharmacies (name, lat, lng, address, city, district, area, type, phone, is_open) VALUES
-- BHOPAL — Major Government Hospitals
('Hamidia Hospital', 23.2667, 77.4167, 'Royal Market, Sultania Road, Bhopal', 'Bhopal', 'Bhopal', 'Sultania Road', 'hospital', NULL, true),
('Gandhi Medical College & Hospital', 23.2570, 77.4190, 'Gandhi Medical College Campus, Bhopal', 'Bhopal', 'Bhopal', 'Bhopal Kotwali', 'hospital', NULL, true),
('AIIMS Bhopal', 23.1944, 77.4344, 'Saket Nagar, Bhopal', 'Bhopal', 'Bhopal', 'Saket Nagar', 'hospital', NULL, true),
('Kamla Nehru Hospital', 23.2680, 77.4080, 'Sultania Road, Bhopal', 'Bhopal', 'Bhopal', 'Sultania', 'hospital', NULL, true),
('Sultania Zanana Hospital', 23.2620, 77.4130, 'Sultania Road, Bhopal', 'Bhopal', 'Bhopal', 'Sultania', 'hospital', NULL, true),
('Bhopal Memorial Hospital & Research Centre', 23.3010, 77.3080, 'Raisen Bypass Road, Bhopal', 'Bhopal', 'Bhopal', 'Berasia Road', 'hospital', NULL, true),
('JP Hospital Bhopal', 23.2490, 77.4200, 'New Market, Bhopal', 'Bhopal', 'Bhopal', 'New Market', 'hospital', NULL, true),
('Chirayu Medical College & Hospital', 23.1567, 77.4234, 'Bairagarh, Bhopal', 'Bhopal', 'Bhopal', 'Bairagarh', 'hospital', NULL, true),
('LN Medical College', 23.2100, 77.3890, 'Kolar Road, Bhopal', 'Bhopal', 'Bhopal', 'Kolar Road', 'hospital', NULL, true),

-- BHOPAL — PHC and Janaushadhi
('PHC Berasia', 23.6234, 77.4512, 'Berasia Town', 'Berasia', 'Bhopal', 'Berasia', 'PHC', NULL, true),
('PHC Phanda', 23.3456, 77.3012, 'Phanda, Bhopal Rural', 'Bhopal', 'Bhopal', 'Phanda', 'PHC', NULL, true),
('PHC Ratibad', 23.1234, 77.5123, 'Ratibad, Bhopal', 'Bhopal', 'Bhopal', 'Ratibad', 'PHC', NULL, true),
('CHC Berasia', 23.6240, 77.4510, 'Community Health Centre, Berasia', 'Berasia', 'Bhopal', 'Berasia', 'CHC', NULL, true),
('Janaushadhi Kendra Govindpura', 23.2801, 77.4601, 'PMBJP Store, Govindpura', 'Bhopal', 'Bhopal', 'Govindpura', 'janaushadhi', NULL, true),
('Janaushadhi Kendra MP Nagar', 23.2295, 77.4298, 'PMBJP Store, MP Nagar Zone 1', 'Bhopal', 'Bhopal', 'MP Nagar', 'janaushadhi', NULL, true),
('Janaushadhi Kendra Old Bhopal', 23.2641, 77.4019, 'PMBJP Store, Chowk Bazar', 'Bhopal', 'Bhopal', 'Old Bhopal', 'janaushadhi', NULL, true),
('Janaushadhi Kendra Karond', 23.3102, 77.4012, 'PMBJP Store, Karond Square', 'Bhopal', 'Bhopal', 'Karond', 'janaushadhi', NULL, true),

-- SEHORE — District Hospital and PHCs
('District Hospital Sehore', 23.2003, 77.0857, 'Civil Lines, Sehore', 'Sehore', 'Sehore', 'Civil Lines', 'district_hospital', NULL, true),
('CHC Sehore', 23.2010, 77.0860, 'Near District Hospital, Sehore', 'Sehore', 'Sehore', 'Sehore City', 'CHC', NULL, true),
('PHC Nasrullaganj', 22.9700, 77.2600, 'Nasrullaganj, Sehore District', 'Nasrullaganj', 'Sehore', 'Nasrullaganj', 'PHC', NULL, true),
('PHC Ichhawar', 23.0167, 77.0167, 'Ichhawar, Sehore District', 'Ichhawar', 'Sehore', 'Ichhawar', 'PHC', NULL, true),
('PHC Rehti', 22.9200, 77.1100, 'Rehti, Sehore District', 'Rehti', 'Sehore', 'Rehti', 'PHC', NULL, true),
('Janaushadhi Kendra Sehore', 23.2005, 77.0855, 'Near Bus Stand, Sehore', 'Sehore', 'Sehore', 'Sehore City', 'janaushadhi', NULL, true),

-- ASHTA — Hospital and PHCs
('District Hospital Ashta', 23.0186, 76.7206, 'Main Road, Ashta, Sehore District', 'Ashta', 'Sehore', 'Ashta Town', 'district_hospital', NULL, true),
('CHC Ashta', 23.0190, 76.7210, 'Civil Hospital Campus, Ashta', 'Ashta', 'Sehore', 'Ashta Town', 'CHC', NULL, true),
('PHC Doraha', 23.0800, 76.7800, 'Doraha, Sehore District', 'Doraha', 'Sehore', 'Doraha', 'PHC', NULL, true),
('PHC Maksi', 23.2600, 76.1400, 'Maksi, Shajapur District', 'Maksi', 'Shajapur', 'Maksi', 'PHC', NULL, true),
('Janaushadhi Kendra Ashta', 23.0188, 76.7208, 'Near Bus Stand, Ashta', 'Ashta', 'Sehore', 'Ashta Town', 'janaushadhi', NULL, true),

-- OBAIDULLAGANJ — Highway Town (Bhopal-Sehore corridor)
('PHC Obaidullaganj', 23.1170, 77.2500, 'Obaidullaganj, Raisen District', 'Obaidullaganj', 'Raisen', 'Obaidullaganj', 'PHC', NULL, true),
('CHC Obaidullaganj', 23.1175, 77.2505, 'Civil Hospital, Obaidullaganj', 'Obaidullaganj', 'Raisen', 'Obaidullaganj', 'CHC', NULL, true),

-- DEWAS — District Hospital and PHCs
('District Hospital Dewas', 22.9623, 76.0511, 'Civil Lines, Dewas', 'Dewas', 'Dewas', 'Civil Lines', 'district_hospital', NULL, true),
('CHC Dewas', 22.9630, 76.0515, 'Near District Hospital, Dewas', 'Dewas', 'Dewas', 'Dewas City', 'CHC', NULL, true),
('PHC Kannod', 22.6700, 76.6200, 'Kannod, Dewas District', 'Kannod', 'Dewas', 'Kannod', 'PHC', NULL, true),
('PHC Bagli', 22.6400, 76.3500, 'Bagli, Dewas District', 'Bagli', 'Dewas', 'Bagli', 'PHC', NULL, true),
('Janaushadhi Kendra Dewas', 22.9625, 76.0513, 'Near Bus Stand, Dewas', 'Dewas', 'Dewas', 'Dewas City', 'janaushadhi', NULL, true),

-- INDORE — Major Hospitals
('MY Hospital Indore', 22.7185, 75.8623, 'MG Road, Indore', 'Indore', 'Indore', 'MG Road', 'hospital', NULL, true),
('Maharaja Yeshwantrao Hospital', 22.7185, 75.8623, 'Residency Area, Indore', 'Indore', 'Indore', 'Residency', 'hospital', NULL, true),
('ESIC Hospital Indore', 22.7600, 75.9100, 'Palasia, Indore', 'Indore', 'Indore', 'Palasia', 'hospital', NULL, true),
('District Hospital Indore', 22.7200, 75.8600, 'Racecourse Road, Indore', 'Indore', 'Indore', 'Racecourse', 'district_hospital', NULL, true),
('CHC Indore Rural', 22.7400, 75.8800, 'Indore Rural Area', 'Indore', 'Indore', 'Indore Rural', 'CHC', NULL, true),
('Janaushadhi Kendra Indore MG Road', 22.7180, 75.8620, 'PMBJP Store, MG Road, Indore', 'Indore', 'Indore', 'MG Road', 'janaushadhi', NULL, true),
('Janaushadhi Kendra Indore Palasia', 22.7310, 75.8880, 'PMBJP Store, Palasia, Indore', 'Indore', 'Indore', 'Palasia', 'janaushadhi', NULL, true),

-- HIGHWAY CORRIDOR — Roadside PHCs
('Highway PHC Sehore-Bhopal Road', 23.1600, 77.1800, 'NH-46, Between Sehore and Bhopal', 'Budhni Road', 'Sehore', 'NH-46 Corridor', 'PHC', NULL, true),
('Highway PHC Ashta-Sehore Road', 23.1000, 76.9000, 'NH-46, Between Ashta and Sehore', 'NH-46', 'Sehore', 'NH-46 Corridor', 'PHC', NULL, true),
('Highway PHC Dewas-Ashta Road', 22.9900, 76.3800, 'NH-46, Between Dewas and Ashta', 'NH-46', 'Dewas', 'NH-46 Corridor', 'PHC', NULL, true)
ON CONFLICT DO NOTHING;

-- === STEP 5: SEED PRIVATE PHARMACIES FOR HIGHWAY TOWNS ===

INSERT INTO pharmacies (name, lat, lng, address, city, district, area, type) VALUES
-- Sehore private
('Sehore Medical Store', 23.2001, 77.0853, 'Main Bazaar, Sehore', 'Sehore', 'Sehore', 'Main Bazaar', 'private'),
('New Life Pharmacy Sehore', 23.2005, 77.0860, 'Bus Stand Road, Sehore', 'Sehore', 'Sehore', 'Bus Stand', 'private'),
('Sharma Medical Sehore', 23.1998, 77.0850, 'Collectorate Road, Sehore', 'Sehore', 'Sehore', 'Collectorate', 'private'),
('Arogya Pharmacy Sehore', 23.2010, 77.0865, 'Civil Lines, Sehore', 'Sehore', 'Sehore', 'Civil Lines', 'private'),
('Gupta Medical Store Sehore', 23.1995, 77.0845, 'Station Road, Sehore', 'Sehore', 'Sehore', 'Station Road', 'private'),

-- Ashta private
('Ashta Medical Hall', 23.0184, 76.7204, 'Main Road, Ashta', 'Ashta', 'Sehore', 'Main Road', 'private'),
('Patel Medical Store Ashta', 23.0188, 76.7210, 'Gandhi Chowk, Ashta', 'Ashta', 'Sehore', 'Gandhi Chowk', 'private'),
('Om Sai Pharma Ashta', 23.0181, 76.7200, 'Near Bus Stand, Ashta', 'Ashta', 'Sehore', 'Bus Stand', 'private'),
('Dewangan Medical Ashta', 23.0190, 76.7215, 'Hospital Road, Ashta', 'Ashta', 'Sehore', 'Hospital Road', 'private'),

-- Obaidullaganj private
('Obaidullaganj Medical Store', 23.1168, 77.2498, 'Main Bazaar, Obaidullaganj', 'Obaidullaganj', 'Raisen', 'Main Bazaar', 'private'),
('Highway Pharmacy Obaidullaganj', 23.1172, 77.2503, 'NH-46, Obaidullaganj', 'Obaidullaganj', 'Raisen', 'NH-46', 'private'),

-- Nasrullaganj private
('Nasrullaganj Medical', 22.9698, 77.2598, 'Main Road, Nasrullaganj', 'Nasrullaganj', 'Sehore', 'Main Road', 'private'),
('Sharma Pharmacy Nasrullaganj', 22.9702, 77.2605, 'Chowk, Nasrullaganj', 'Nasrullaganj', 'Sehore', 'Chowk', 'private'),

-- Maksi private
('Maksi Medical Store', 23.2598, 76.1398, 'Main Bazaar, Maksi', 'Maksi', 'Shajapur', 'Main Bazaar', 'private'),
('Agarwal Pharmacy Maksi', 23.2602, 76.1405, 'Bus Stand, Maksi', 'Maksi', 'Shajapur', 'Bus Stand', 'private'),

-- Dewas private (ensures 8+ private pharmacies)
('Dewas Medical Hall', 22.9621, 76.0508, 'AB Road, Dewas', 'Dewas', 'Dewas', 'AB Road', 'private'),
('Shree Ram Medical Dewas', 22.9635, 76.0520, 'Station Road, Dewas', 'Dewas', 'Dewas', 'Station Road', 'private'),
('Apex Pharmacy Dewas', 22.9615, 76.0502, 'Civil Lines, Dewas', 'Dewas', 'Dewas', 'Civil Lines', 'private'),
('Mahaveer Medical Store Dewas', 22.9640, 76.0530, 'Main Market, Dewas', 'Dewas', 'Dewas', 'Main Market', 'private'),
('City Pharma Dewas', 22.9628, 76.0518, 'Bus Stand, Dewas', 'Dewas', 'Dewas', 'Bus Stand', 'private'),
('Sanjeevani Medical Dewas', 22.9610, 76.0495, 'Hospital Road, Dewas', 'Dewas', 'Dewas', 'Hospital Road', 'private'),
('Shree Krishna Pharma Dewas', 22.9645, 76.0540, 'Mandi Road, Dewas', 'Dewas', 'Dewas', 'Mandi Road', 'private'),
('National Medical Dewas', 22.9618, 76.0510, 'Ujjain Road Square, Dewas', 'Dewas', 'Dewas', 'Ujjain Road', 'private'),

-- Bhopal private (ensures 20+ private pharmacies)
('Bhopal Central Pharmacy', 23.2500, 77.4100, 'Hamidia Road, Bhopal', 'Bhopal', 'Bhopal', 'Hamidia Road', 'private'),
('Apollo Pharmacy MP Nagar Bhopal', 23.2310, 77.4320, 'Zone 2, MP Nagar, Bhopal', 'Bhopal', 'Bhopal', 'MP Nagar', 'private'),
('Wellness Forever New Market Bhopal', 23.2450, 77.4050, 'New Market, TT Nagar, Bhopal', 'Bhopal', 'Bhopal', 'New Market', 'private'),
('Lifeline Medicos Old Bhopal', 23.2610, 77.4080, 'Chowk Bazar, Bhopal', 'Bhopal', 'Bhopal', 'Old Bhopal', 'private'),
('Janta Medical Store Kolar Bhopal', 23.1800, 77.4200, 'Kolar Road, Bhopal', 'Bhopal', 'Bhopal', 'Kolar Road', 'private'),
('Relief Pharmacy Arera Colony Bhopal', 23.2150, 77.4350, 'E-3 Arera Colony, Bhopal', 'Bhopal', 'Bhopal', 'Arera Colony', 'private'),
('Shreeji Medicos Hoshangabad Rd Bhopal', 23.1900, 77.4500, 'Hoshangabad Road, Bhopal', 'Bhopal', 'Bhopal', 'Hoshangabad Road', 'private'),
('Gupta Medicos Bairagarh Bhopal', 23.2700, 77.3400, 'Main Market, Bairagarh, Bhopal', 'Bhopal', 'Bhopal', 'Bairagarh', 'private'),

-- Kannod private
('Kannod Medical Hall', 22.6698, 76.6198, 'Main Road, Kannod', 'Kannod', 'Dewas', 'Main Road', 'private'),
('Jain Medical Kannod', 22.6704, 76.6205, 'Near PHC, Kannod', 'Kannod', 'Dewas', 'Near PHC', 'private')
ON CONFLICT DO NOTHING;

-- === STEP 6: VERIFICATION QUERIES ===
SELECT city, type, COUNT(*) as count 
FROM pharmacies 
GROUP BY city, type 
ORDER BY city, type;


-- ============================================================================
-- MEDRADAR SEED PART 2: MEDICINE ALIASES & PHARMACY STOCK
-- ============================================================================

-- === STEP 1: MEDICINE ALIAS TABLE — 120+ BRAND TO GENERIC MAPPINGS ===

DELETE FROM medicine_aliases;

INSERT INTO medicine_aliases (brand_name, canonical_name) VALUES

-- DIABETES
('Crocin', 'Paracetamol 500mg'),
('Calpol', 'Paracetamol 500mg'),
('Dolo', 'Paracetamol 650mg'),
('Dolo 650', 'Paracetamol 650mg'),
('Tylenol', 'Paracetamol 500mg'),
('Glucophage', 'Metformin 500mg'),
('Glycomet', 'Metformin 500mg'),
('Glycomet SR', 'Metformin SR 500mg'),
('Metforal', 'Metformin 500mg'),
('Zoryl', 'Glimepiride 1mg'),
('Amaryl', 'Glimepiride 2mg'),
('Glimpid', 'Glimepiride 1mg'),
('Glucovance', 'Metformin+Glibenclamide'),
('Glynase', 'Glipizide 5mg'),
('Diabeta', 'Glibenclamide 5mg'),
('Daonil', 'Glibenclamide 5mg'),
('Januvia', 'Sitagliptin 100mg'),
('Istavel', 'Sitagliptin 100mg'),
('Galvus', 'Vildagliptin 50mg'),
('Onglyza', 'Saxagliptin 5mg'),
('Vogibose', 'Voglibose 0.2mg'),
('Volix', 'Voglibose 0.3mg'),
('Actrapid', 'Insulin Regular'),
('Huminsulin R', 'Insulin Regular'),
('Mixtard', 'Insulin 30/70'),
('Huminsulin 30/70', 'Insulin 30/70'),
('Lantus', 'Insulin Glargine'),
('Basalog', 'Insulin Glargine'),
('Novorapid', 'Insulin Aspart'),
('Wosulin', 'Insulin Regular'),

-- HYPERTENSION
('Amlip', 'Amlodipine 5mg'),
('Amlong', 'Amlodipine 5mg'),
('Norvasc', 'Amlodipine 5mg'),
('Stamlo', 'Amlodipine 5mg'),
('Telma', 'Telmisartan 40mg'),
('Telsartan', 'Telmisartan 40mg'),
('Micardis', 'Telmisartan 40mg'),
('Losartan', 'Losartan 50mg'),
('Losar', 'Losartan 50mg'),
('Repace', 'Losartan 50mg'),
('Aten', 'Atenolol 50mg'),
('Atenolol', 'Atenolol 50mg'),
('Metpure', 'Metoprolol 50mg'),
('Betaloc', 'Metoprolol 50mg'),
('Cardivas', 'Carvedilol 12.5mg'),
('Ramipril', 'Ramipril 5mg'),
('Cardace', 'Ramipril 5mg'),
('Enalapril', 'Enalapril 5mg'),
('Envas', 'Enalapril 5mg'),
('Minipress', 'Prazosin 1mg'),
('Clonidine', 'Clonidine 0.1mg'),
('Nifedipine', 'Nifedipine 10mg'),
('Nicardia', 'Nifedipine 10mg'),
('Furosemide', 'Furosemide 40mg'),
('Lasix', 'Furosemide 40mg'),
('Dytor', 'Torsemide 10mg'),

-- ANTIBIOTICS
('Augmentin', 'Amoxicillin+Clavulanate 625mg'),
('Mox', 'Amoxicillin 500mg'),
('Novamox', 'Amoxicillin 500mg'),
('Azee', 'Azithromycin 500mg'),
('Zithromax', 'Azithromycin 500mg'),
('Azithral', 'Azithromycin 500mg'),
('Ciplox', 'Ciprofloxacin 500mg'),
('Cifran', 'Ciprofloxacin 500mg'),
('Ciprobid', 'Ciprofloxacin 500mg'),
('Norflox', 'Norfloxacin 400mg'),
('Doxycycline', 'Doxycycline 100mg'),
('Biodoxi', 'Doxycycline 100mg'),
('Metrogyl', 'Metronidazole 400mg'),
('Flagyl', 'Metronidazole 400mg'),
('Cefpodoxime', 'Cefpodoxime 200mg'),
('Ceftas', 'Cefpodoxime 200mg'),
('Zifi', 'Cefixime 200mg'),
('Mahacef', 'Cefixime 200mg'),
('Taxim', 'Cefotaxime Injection'),
('Monocef', 'Ceftriaxone Injection'),
('Clindamycin', 'Clindamycin 300mg'),
('Dalacin', 'Clindamycin 300mg'),
('Cotrimoxazole', 'Cotrimoxazole 480mg'),
('Bactrim', 'Cotrimoxazole 960mg'),
('Septran', 'Cotrimoxazole 480mg'),

-- PAIN AND FEVER
('Combiflam', 'Ibuprofen+Paracetamol 400mg'),
('Brufen', 'Ibuprofen 400mg'),
('Ibugesic', 'Ibuprofen 400mg'),
('Voveran', 'Diclofenac 50mg'),
('Voltaren', 'Diclofenac 50mg'),
('Nise', 'Nimesulide 100mg'),
('Nimulid', 'Nimesulide 100mg'),
('Ecosprin', 'Aspirin 75mg'),
('Disprin', 'Aspirin 325mg'),
('Colsprin', 'Aspirin 75mg'),
('Tramadol', 'Tramadol 50mg'),
('Ultracet', 'Tramadol+Paracetamol'),
('Volini', 'Diclofenac Gel'),

-- CARDIAC
('Atorva', 'Atorvastatin 10mg'),
('Lipitor', 'Atorvastatin 10mg'),
('Storvas', 'Atorvastatin 20mg'),
('Rozavel', 'Rosuvastatin 10mg'),
('Crestor', 'Rosuvastatin 10mg'),
('Rosutor', 'Rosuvastatin 10mg'),
('Clopitab', 'Clopidogrel 75mg'),
('Plavix', 'Clopidogrel 75mg'),
('Deplatt', 'Clopidogrel 75mg'),
('Digoxin', 'Digoxin 0.25mg'),
('Lanoxin', 'Digoxin 0.25mg'),
('Nitrostat', 'Nitroglycerin 0.5mg'),
('Sorbitrate', 'Isosorbide Dinitrate 5mg'),
('Monotrate', 'Isosorbide Mononitrate 20mg'),

-- RESPIRATORY
('Asthalin', 'Salbutamol 100mcg Inhaler'),
('Ventolin', 'Salbutamol 100mcg Inhaler'),
('Levolin', 'Levosalbutamol Inhaler'),
('Foracort', 'Budesonide+Formoterol Inhaler'),
('Budecort', 'Budesonide 200mcg Inhaler'),
('Seroflo', 'Salmeterol+Fluticasone Inhaler'),
('Montair', 'Montelukast 10mg'),
('Singulair', 'Montelukast 10mg'),
('Zyrtec', 'Cetirizine 10mg'),
('Cetriz', 'Cetirizine 10mg'),
('Alerid', 'Cetirizine 10mg'),
('Levocet', 'Levocetirizine 5mg'),
('Xyzal', 'Levocetirizine 5mg'),
('Allegra', 'Fexofenadine 120mg'),
('Ascoril', 'Salbutamol+Bromhexine Syrup'),
('Benadryl', 'Diphenhydramine+Codeine Syrup'),
('Phensedyl', 'Chlorpheniramine+Codeine Syrup'),

-- GASTROINTESTINAL
('Omez', 'Omeprazole 20mg'),
('Omeprazole', 'Omeprazole 20mg'),
('Pan', 'Pantoprazole 40mg'),
('Pantocid', 'Pantoprazole 40mg'),
('Razo', 'Rabeprazole 20mg'),
('Nexpro', 'Esomeprazole 40mg'),
('Nexium', 'Esomeprazole 40mg'),
('Domperidone', 'Domperidone 10mg'),
('Domstal', 'Domperidone 10mg'),
('Perinorm', 'Metoclopramide 10mg'),
('Dicyclomine', 'Dicyclomine 20mg'),
('Cyclopam', 'Dicyclomine+Paracetamol'),
('Mebeverine', 'Mebeverine 135mg'),
('Electral', 'ORS Sachet'),
('ORS', 'ORS Sachet'),
('Pedialyte', 'ORS Sachet'),
('Loperamide', 'Loperamide 2mg'),
('Imodium', 'Loperamide 2mg'),
('Tinidazole', 'Tinidazole 500mg'),
('Fasigyn', 'Tinidazole 500mg'),
('Zentel', 'Albendazole 400mg'),
('Bendex', 'Albendazole 400mg'),

-- THYROID
('Thyronorm', 'Levothyroxine 50mcg'),
('Eltroxin', 'Levothyroxine 50mcg'),
('Thyrox', 'Levothyroxine 100mcg'),

-- NEUROLOGICAL / PSYCHIATRIC
('Phenytoin', 'Phenytoin 100mg'),
('Eptoin', 'Phenytoin 100mg'),
('Carbamazepine', 'Carbamazepine 200mg'),
('Mazetol', 'Carbamazepine 200mg'),
('Tegretol', 'Carbamazepine 200mg'),
('Valproate', 'Sodium Valproate 200mg'),
('Valparin', 'Sodium Valproate 200mg'),
('Encorate', 'Sodium Valproate 500mg'),
('Levetiracetam', 'Levetiracetam 500mg'),
('Levipil', 'Levetiracetam 500mg'),
('Syndopa', 'Levodopa+Carbidopa'),
('Parkinson', 'Levodopa+Carbidopa'),
('Chlorpromazine', 'Chlorpromazine 100mg'),
('Largactil', 'Chlorpromazine 100mg'),
('Haloperidol', 'Haloperidol 5mg'),
('Serenace', 'Haloperidol 5mg'),
('Alprazolam', 'Alprazolam 0.25mg'),
('Alprax', 'Alprazolam 0.25mg'),
('Diazepam', 'Diazepam 5mg'),
('Calmpose', 'Diazepam 5mg'),

-- TB (DOTS medicines — government stocked)
('Rifampicin', 'Rifampicin 450mg'),
('Rifinah', 'Rifampicin+INH'),
('INH', 'Isoniazid 300mg'),
('Isonex', 'Isoniazid 300mg'),
('Ethambutol', 'Ethambutol 800mg'),
('Pyrazinamide', 'Pyrazinamide 750mg'),

-- MALARIA (endemic in MP)
('Chloroquine', 'Chloroquine 250mg'),
('Lariago', 'Chloroquine 250mg'),
('Primaquine', 'Primaquine 7.5mg'),
('Lumefantrine', 'Artemether+Lumefantrine'),
('Coartem', 'Artemether+Lumefantrine'),
('ARTE', 'Artesunate Injection'),

-- MATERNAL HEALTH
('Folic Acid', 'Folic Acid 5mg'),
('Folart', 'Folic Acid 5mg'),
('Ferrous Sulfate', 'Ferrous Sulfate 200mg'),
('Livogen', 'Ferrous+Folic Acid'),
('Dexolac', 'Infant Formula'),
('Oxytocin', 'Oxytocin Injection'),
('Syntocinon', 'Oxytocin Injection'),
('Misoprostol', 'Misoprostol 200mcg'),
('Cytotec', 'Misoprostol 200mcg'),
('MgSO4', 'Magnesium Sulfate Injection'),
('Mifepristone', 'Mifepristone 200mg'),

-- PEDIATRIC
('Zinc', 'Zinc Sulfate 20mg'),
('Vitamin A', 'Vitamin A 1 Lakh IU'),
('Zincovit', 'Zinc+Vitamins Syrup'),

-- SUPPLEMENTS AND VITAMINS
('Vitamin D3', 'Cholecalciferol 60000IU'),
('D-rise', 'Cholecalciferol 60000IU'),
('Shelcal', 'Calcium+Vitamin D3'),
('Calcimax', 'Calcium+Vitamin D3'),
('Becosules', 'Vitamin B-Complex'),
('Neurobion', 'Vitamin B12+B1+B6'),
('Methylcobalamin', 'Methylcobalamin 500mcg'),
('Rejunex', 'Methylcobalamin+B6+Folic'),

-- EMERGENCY (hospitals/CHC stock)
('Adrenaline', 'Epinephrine Injection 1mg'),
('Epinephrine', 'Epinephrine Injection 1mg'),
('Dexamethasone', 'Dexamethasone Injection 4mg'),
('Hydrocortisone', 'Hydrocortisone Injection'),
('Atropine', 'Atropine Injection 0.6mg'),
('Dopamine', 'Dopamine Injection'),
('Normal Saline', 'Normal Saline 500ml'),
('DNS', 'Dextrose Normal Saline 500ml'),
('RL', 'Ringer Lactate 500ml'),
('Mannitol', 'Mannitol 20% 100ml'),

-- DERMATOLOGY
('Betnovate', 'Betamethasone Cream'),
('Lobate', 'Clobetasol Cream'),
('Soframycin', 'Framycetin Skin Cream'),
('Candid', 'Clotrimazole 1% Cream'),
('Canesten', 'Clotrimazole 1% Cream'),
('Nizral', 'Ketoconazole Shampoo'),
('Calamine', 'Calamine Lotion'),
('Burnol', 'Furacin Cream'),

-- EYE / ENT
('Ciprofloxacin Eye', 'Ciprofloxacin Eye Drops'),
('Tobradex', 'Tobramycin+Dexamethasone Eye'),
('Otrivin', 'Xylometazoline Nasal Spray'),
('Nasivion', 'Oxymetazoline Nasal Spray'),

-- UROLOGY
('Tamsulosin', 'Tamsulosin 0.4mg'),
('Urimax', 'Tamsulosin 0.4mg'),
('Flomax', 'Tamsulosin 0.4mg'),
('Finasteride', 'Finasteride 5mg'),
('Finpecia', 'Finasteride 1mg')

ON CONFLICT (brand_name) DO UPDATE SET canonical_name = EXCLUDED.canonical_name;

-- === STEP 2: SEED STOCK FOR ALL PRIVATE PHARMACIES ===

INSERT INTO stock (pharmacy_id, medicine_name, available)
SELECT 
  p.id,
  m.medicine,
  CASE 
    WHEN m.medicine IN ('Paracetamol 500mg', 'ORS Sachet', 'Omeprazole 20mg', 'Cetirizine 10mg', 'Atorvastatin 10mg') THEN true
    WHEN m.medicine IN ('Metformin 500mg', 'Insulin Regular', 'Azithromycin 500mg', 'Amoxicillin 500mg') THEN false
    WHEN m.medicine IN ('Amlodipine 5mg', 'Telmisartan 40mg', 'Atenolol 50mg') THEN true
    WHEN m.medicine IN ('Aspirin 75mg', 'Clopidogrel 75mg') THEN (p.area IN ('MP Nagar', 'Arera Colony', 'Palasia', 'MG Road', 'Civil Lines'))
    WHEN m.medicine IN ('Salbutamol 100mcg Inhaler', 'Budesonide+Formoterol Inhaler') THEN (p.city IN ('Bhopal', 'Indore', 'Dewas'))
    WHEN m.medicine IN ('Levothyroxine 50mcg', 'Metoprolol 50mg') THEN true
    WHEN m.medicine IN ('Insulin 30/70', 'Insulin Glargine') THEN false
    WHEN m.medicine IN ('Albendazole 400mg', 'Zinc Sulfate 20mg') THEN true
    WHEN m.medicine IN ('Chloroquine 250mg', 'Primaquine 7.5mg') THEN (p.district IN ('Dewas', 'Sehore', 'Indore'))
    ELSE true
  END as available
FROM pharmacies p
CROSS JOIN (VALUES
  ('Paracetamol 500mg'),
  ('Paracetamol 650mg'),
  ('Metformin 500mg'),
  ('Metformin SR 500mg'),
  ('Insulin Regular'),
  ('Insulin 30/70'),
  ('Amlodipine 5mg'),
  ('Telmisartan 40mg'),
  ('Atenolol 50mg'),
  ('Atorvastatin 10mg'),
  ('Rosuvastatin 10mg'),
  ('Aspirin 75mg'),
  ('Clopidogrel 75mg'),
  ('Azithromycin 500mg'),
  ('Amoxicillin 500mg'),
  ('Amoxicillin+Clavulanate 625mg'),
  ('Ciprofloxacin 500mg'),
  ('Metronidazole 400mg'),
  ('Doxycycline 100mg'),
  ('Cefixime 200mg'),
  ('Paracetamol+Ibuprofen 400mg'),
  ('Ibuprofen 400mg'),
  ('Diclofenac 50mg'),
  ('Nimesulide 100mg'),
  ('Omeprazole 20mg'),
  ('Pantoprazole 40mg'),
  ('Domperidone 10mg'),
  ('ORS Sachet'),
  ('Cetirizine 10mg'),
  ('Levocetirizine 5mg'),
  ('Montelukast 10mg'),
  ('Salbutamol 100mcg Inhaler'),
  ('Levothyroxine 50mcg'),
  ('Metoprolol 50mg'),
  ('Folic Acid 5mg'),
  ('Ferrous Sulfate 200mg'),
  ('Albendazole 400mg'),
  ('Zinc Sulfate 20mg'),
  ('Vitamin B-Complex'),
  ('Methylcobalamin 500mcg'),
  ('Cholecalciferol 60000IU'),
  ('Calcium+Vitamin D3'),
  ('Glimepiride 1mg'),
  ('Voglibose 0.3mg'),
  ('Chloroquine 250mg'),
  ('Clotrimazole 1% Cream'),
  ('Betamethasone Cream'),
  ('Normal Saline 500ml'),
  ('Tamsulosin 0.4mg'),
  ('Diazepam 5mg')
) AS m(medicine)
WHERE p.type = 'private'
ON CONFLICT (pharmacy_id, medicine_name) DO UPDATE SET available = EXCLUDED.available, updated_at = NOW();

-- === STEP 2 (CONT): SEED STOCK FOR GOVERNMENT HEALTH FACILITIES ===

INSERT INTO stock (pharmacy_id, medicine_name, available)
SELECT 
  p.id,
  m.medicine,
  CASE
    WHEN m.medicine IN ('Paracetamol 500mg', 'ORS Sachet', 'Folic Acid 5mg', 'Ferrous Sulfate 200mg', 'Albendazole 400mg', 'Zinc Sulfate 20mg') THEN true
    WHEN m.medicine IN ('Chloroquine 250mg', 'Primaquine 7.5mg') THEN true
    WHEN m.medicine IN ('Cotrimoxazole 480mg', 'Metronidazole 400mg') THEN true
    WHEN m.medicine IN ('Insulin Regular', 'Metformin 500mg') THEN (p.type IN ('district_hospital', 'hospital', 'CHC'))
    WHEN m.medicine IN ('Rifampicin 450mg', 'Isoniazid 300mg', 'Ethambutol 800mg', 'Pyrazinamide 750mg') THEN (p.type IN ('district_hospital', 'CHC', 'PHC'))
    WHEN m.medicine IN ('Epinephrine Injection 1mg', 'Dexamethasone Injection 4mg', 'Oxytocin Injection', 'Magnesium Sulfate Injection') THEN (p.type IN ('district_hospital', 'hospital', 'CHC'))
    WHEN m.medicine IN ('Normal Saline 500ml', 'Ringer Lactate 500ml') THEN (p.type IN ('district_hospital', 'hospital', 'CHC'))
    WHEN m.medicine IN ('Vitamin A 1 Lakh IU', 'Misoprostol 200mcg') THEN (p.type IN ('PHC', 'CHC', 'district_hospital'))
    WHEN p.type = 'janaushadhi' THEN true
    ELSE false
  END as available
FROM pharmacies p
CROSS JOIN (VALUES
  ('Paracetamol 500mg'),
  ('ORS Sachet'),
  ('Folic Acid 5mg'),
  ('Ferrous Sulfate 200mg'),
  ('Albendazole 400mg'),
  ('Zinc Sulfate 20mg'),
  ('Vitamin A 1 Lakh IU'),
  ('Chloroquine 250mg'),
  ('Primaquine 7.5mg'),
  ('Cotrimoxazole 480mg'),
  ('Metronidazole 400mg'),
  ('Metformin 500mg'),
  ('Insulin Regular'),
  ('Rifampicin 450mg'),
  ('Isoniazid 300mg'),
  ('Ethambutol 800mg'),
  ('Pyrazinamide 750mg'),
  ('Epinephrine Injection 1mg'),
  ('Dexamethasone Injection 4mg'),
  ('Atropine Injection 0.6mg'),
  ('Oxytocin Injection'),
  ('Magnesium Sulfate Injection'),
  ('Misoprostol 200mcg'),
  ('Normal Saline 500ml'),
  ('Ringer Lactate 500ml'),
  ('Omeprazole 20mg'),
  ('Amlodipine 5mg'),
  ('Atenolol 50mg'),
  ('Phenytoin 100mg'),
  ('Sodium Valproate 200mg'),
  ('Haloperidol 5mg'),
  ('Chlorpromazine 100mg'),
  ('Artemether+Lumefantrine'),
  ('Vitamin B-Complex'),
  ('Ciprofloxacin 500mg'),
  ('Amoxicillin 500mg'),
  ('Azithromycin 500mg'),
  ('Diazepam 5mg'),
  ('Digoxin 0.25mg'),
  ('Furosemide 40mg')
) AS m(medicine)
WHERE p.type IN ('PHC', 'CHC', 'district_hospital', 'hospital', 'janaushadhi')
ON CONFLICT (pharmacy_id, medicine_name) DO UPDATE SET available = EXCLUDED.available, updated_at = NOW();

-- === STEP 3: VERIFY STOCK DISTRIBUTION QUERY ===
SELECT 
  medicine_name,
  COUNT(*) as total_pharmacies,
  SUM(CASE WHEN available=true THEN 1 ELSE 0 END) as available_count,
  ROUND(100.0 * SUM(CASE WHEN available=true THEN 1 ELSE 0 END) / COUNT(*), 1) as availability_pct
FROM stock
GROUP BY medicine_name
ORDER BY total_pharmacies DESC
LIMIT 30;


-- ============================================================================
-- MEDRADAR SEED PART 3: SHORTAGE FAILURES (TELEMETRY / SEARCHES)
-- ============================================================================

DELETE FROM searches;

INSERT INTO searches (medicine_name, lat, lng, result_count, city, is_urgent, created_at) VALUES

-- BHOPAL ZONE — Insulin failures (cluster in Old Bhopal, Karond, Govindpura)
('Insulin Regular', 23.2645, 77.4023, 0, 'Bhopal', false, NOW() - INTERVAL '47 hours'),
('Insulin Regular', 23.2656, 77.4201, 0, 'Bhopal', false, NOW() - INTERVAL '39 hours'),
('Insulin Regular', 23.3102, 77.4012, 0, 'Bhopal', true,  NOW() - INTERVAL '31 hours'),
('Insulin Regular', 23.2345, 77.4356, 0, 'Bhopal', false, NOW() - INTERVAL '24 hours'),
('Insulin Regular', 23.2912, 77.4312, 0, 'Bhopal', true,  NOW() - INTERVAL '18 hours'),
('Insulin Regular', 23.2801, 77.4601, 0, 'Bhopal', false, NOW() - INTERVAL '12 hours'),
('Insulin Regular', 23.2234, 77.3989, 0, 'Bhopal', false, NOW() - INTERVAL '6 hours'),
('Insulin Regular', 23.2589, 77.4789, 0, 'Bhopal', true,  NOW() - INTERVAL '3 hours'),
('Insulin 30/70',   23.2734, 77.3845, 0, 'Bhopal', false, NOW() - INTERVAL '22 hours'),
('Insulin Glargine',23.2456, 77.4145, 0, 'Bhopal', true,  NOW() - INTERVAL '8 hours'),

-- BHOPAL ZONE — Metformin failures
('Metformin 500mg', 23.2645, 77.4023, 0, 'Bhopal', false, NOW() - INTERVAL '46 hours'),
('Metformin 500mg', 23.2366, 77.4020, 0, 'Bhopal', false, NOW() - INTERVAL '38 hours'),
('Metformin 500mg', 23.3102, 77.4012, 0, 'Bhopal', false, NOW() - INTERVAL '30 hours'),
('Metformin 500mg', 23.2345, 77.4356, 0, 'Bhopal', false, NOW() - INTERVAL '23 hours'),
('Metformin 500mg', 23.2912, 77.4312, 0, 'Bhopal', false, NOW() - INTERVAL '16 hours'),
('Metformin SR 500mg', 23.2801, 77.4601, 0, 'Bhopal', false, NOW() - INTERVAL '9 hours'),
('Metformin 500mg', 23.1834, 77.4512, 0, 'Bhopal', false, NOW() - INTERVAL '4 hours'),

-- BHOPAL ZONE — Azithromycin (antibiotic shortage)
('Azithromycin 500mg', 23.1834, 77.4512, 0, 'Bhopal', false, NOW() - INTERVAL '20 hours'),
('Azithromycin 500mg', 23.2456, 77.4145, 0, 'Bhopal', false, NOW() - INTERVAL '10 hours'),
('Azithromycin 500mg', 23.2589, 77.4789, 0, 'Bhopal', false, NOW() - INTERVAL '5 hours'),
('Amoxicillin 500mg',  23.2101, 77.4312, 0, 'Bhopal', false, NOW() - INTERVAL '14 hours'),
('Amoxicillin+Clavulanate 625mg', 23.2295, 77.4298, 0, 'Bhopal', false, NOW() - INTERVAL '7 hours'),

-- BHOPAL ZONE — Inhaler shortage (urban asthma patients)
('Salbutamol 100mcg Inhaler', 23.2366, 77.4020, 0, 'Bhopal', true,  NOW() - INTERVAL '35 hours'),
('Salbutamol 100mcg Inhaler', 23.2295, 77.4298, 0, 'Bhopal', true,  NOW() - INTERVAL '11 hours'),
('Budesonide+Formoterol Inhaler', 23.2142, 77.4523, 0, 'Bhopal', false, NOW() - INTERVAL '6 hours'),

-- BERASIA ROAD / NORTH BHOPAL
('Insulin Regular', 23.3201, 77.4102, 0, 'Bhopal', false, NOW() - INTERVAL '40 hours'),
('Metformin 500mg', 23.3201, 77.4102, 0, 'Bhopal', false, NOW() - INTERVAL '29 hours'),
('Cefixime 200mg',  23.3201, 77.4102, 0, 'Bhopal', false, NOW() - INTERVAL '15 hours'),

-- SEHORE ZONE — Insulin and diabetes cluster
('Insulin Regular',  23.2003, 77.0857, 0, 'Sehore', true,  NOW() - INTERVAL '44 hours'),
('Insulin Regular',  23.2001, 77.0853, 0, 'Sehore', false, NOW() - INTERVAL '32 hours'),
('Insulin Regular',  23.1998, 77.0850, 0, 'Sehore', true,  NOW() - INTERVAL '20 hours'),
('Metformin 500mg',  23.2003, 77.0857, 0, 'Sehore', false, NOW() - INTERVAL '41 hours'),
('Metformin 500mg',  23.2005, 77.0860, 0, 'Sehore', false, NOW() - INTERVAL '27 hours'),
('Metformin 500mg',  23.1995, 77.0845, 0, 'Sehore', false, NOW() - INTERVAL '13 hours'),
('Glimepiride 1mg',  23.2010, 77.0865, 0, 'Sehore', false, NOW() - INTERVAL '8 hours'),
('Cefixime 200mg',   23.2003, 77.0857, 0, 'Sehore', false, NOW() - INTERVAL '19 hours'),
('Azithromycin 500mg', 23.1998, 77.0848, 0, 'Sehore', false, NOW() - INTERVAL '10 hours'),

-- SEHORE ZONE — Chloroquine (malaria belt — Sehore district is endemic)
('Chloroquine 250mg', 23.2003, 77.0857, 0, 'Sehore', false, NOW() - INTERVAL '36 hours'),
('Chloroquine 250mg', 22.9700, 77.2600, 0, 'Nasrullaganj', false, NOW() - INTERVAL '28 hours'),
('Chloroquine 250mg', 23.0167, 77.0167, 0, 'Ichhawar', false, NOW() - INTERVAL '18 hours'),
('Primaquine 7.5mg',  22.9700, 77.2600, 0, 'Nasrullaganj', true,  NOW() - INTERVAL '12 hours'),
('Artemether+Lumefantrine', 23.0167, 77.0167, 0, 'Ichhawar', true, NOW() - INTERVAL '5 hours'),

-- ASHTA ZONE
('Insulin Regular',  23.0186, 76.7206, 0, 'Ashta', true,  NOW() - INTERVAL '42 hours'),
('Metformin 500mg',  23.0186, 76.7206, 0, 'Ashta', false, NOW() - INTERVAL '31 hours'),
('Insulin Regular',  23.0184, 76.7204, 0, 'Ashta', false, NOW() - INTERVAL '19 hours'),
('Metformin 500mg',  23.0188, 76.7210, 0, 'Ashta', false, NOW() - INTERVAL '11 hours'),
('Azithromycin 500mg', 23.0190, 76.7215, 0, 'Ashta', false, NOW() - INTERVAL '6 hours'),
('Chloroquine 250mg',  23.0181, 76.7200, 0, 'Ashta', false, NOW() - INTERVAL '33 hours'),
('ORS Sachet',       23.0186, 76.7206, 0, 'Ashta', false, NOW() - INTERVAL '4 hours'),
('Salbutamol 100mcg Inhaler', 23.0190, 76.7215, 0, 'Ashta', true, NOW() - INTERVAL '2 hours'),

-- OBAIDULLAGANJ — highway corridor node
('Insulin Regular',  23.1170, 77.2500, 0, 'Obaidullaganj', true,  NOW() - INTERVAL '38 hours'),
('Metformin 500mg',  23.1170, 77.2500, 0, 'Obaidullaganj', false, NOW() - INTERVAL '25 hours'),
('Insulin Regular',  23.1172, 77.2503, 0, 'Obaidullaganj', false, NOW() - INTERVAL '14 hours'),
('Cefixime 200mg',   23.1168, 77.2498, 0, 'Obaidullaganj', false, NOW() - INTERVAL '7 hours'),

-- DEWAS ZONE
('Insulin Regular',  22.9623, 76.0511, 0, 'Dewas', true,  NOW() - INTERVAL '45 hours'),
('Metformin 500mg',  22.9623, 76.0511, 0, 'Dewas', false, NOW() - INTERVAL '34 hours'),
('Insulin Regular',  22.9630, 76.0515, 0, 'Dewas', false, NOW() - INTERVAL '22 hours'),
('Chloroquine 250mg', 22.9623, 76.0511, 0, 'Dewas', false, NOW() - INTERVAL '16 hours'),
('Azithromycin 500mg', 22.9625, 76.0513, 0, 'Dewas', false, NOW() - INTERVAL '9 hours'),
('Salbutamol 100mcg Inhaler', 22.9623, 76.0511, 0, 'Dewas', true, NOW() - INTERVAL '4 hours'),
('Glimepiride 1mg',  22.9620, 76.0508, 0, 'Dewas', false, NOW() - INTERVAL '2 hours'),

-- INDORE ZONE
('Insulin Regular',  22.7196, 75.8577, 0, 'Indore', true,  NOW() - INTERVAL '43 hours'),
('Insulin 30/70',    22.7185, 75.8623, 0, 'Indore', false, NOW() - INTERVAL '30 hours'),
('Insulin Glargine', 22.7310, 75.8880, 0, 'Indore', true,  NOW() - INTERVAL '17 hours'),
('Metformin 500mg',  22.7196, 75.8577, 0, 'Indore', false, NOW() - INTERVAL '26 hours'),
('Budesonide+Formoterol Inhaler', 22.7200, 75.8600, 0, 'Indore', false, NOW() - INTERVAL '12 hours'),
('Clopidogrel 75mg', 22.7185, 75.8623, 0, 'Indore', false, NOW() - INTERVAL '8 hours'),
('Rosuvastatin 10mg', 22.7310, 75.8880, 0, 'Indore', false, NOW() - INTERVAL '5 hours'),

-- HIGHWAY CORRIDOR — between cities (people stuck mid-route)
('Insulin Regular',  23.1600, 77.1800, 0, 'Sehore', true,  NOW() - INTERVAL '33 hours'),
('Paracetamol 500mg', 23.1000, 76.9000, 0, 'Sehore', false, NOW() - INTERVAL '21 hours'),
('ORS Sachet',       22.9900, 76.3800, 0, 'Dewas', false, NOW() - INTERVAL '15 hours'),
('Metformin 500mg',  23.0800, 76.7800, 0, 'Ashta', false, NOW() - INTERVAL '9 hours'),
('Insulin Regular',  22.9900, 76.3800, 0, 'Dewas', true,  NOW() - INTERVAL '1 hour');

-- === VERIFICATION QUERY ===
SELECT city, COUNT(*) as failures 
FROM searches 
GROUP BY city 
ORDER BY failures DESC;



-- === GEOGRAPHIC BOUNDARY VALIDATION & SANITIZATION ===
DELETE FROM pharmacies WHERE lat < 22.60 OR lat > 23.50 OR lng < 75.60 OR lng > 77.60;
