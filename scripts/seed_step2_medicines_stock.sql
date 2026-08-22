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
