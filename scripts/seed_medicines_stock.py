import json
from collections import defaultdict

# 1. Medicine Aliases list
aliases = [
# DIABETES
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

# HYPERTENSION
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

# ANTIBIOTICS
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

# PAIN AND FEVER
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

# CARDIAC
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

# RESPIRATORY
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

# GASTROINTESTINAL
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

# THYROID
('Thyronorm', 'Levothyroxine 50mcg'),
('Eltroxin', 'Levothyroxine 50mcg'),
('Thyrox', 'Levothyroxine 100mcg'),

# NEUROLOGICAL / PSYCHIATRIC
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

# TB
('Rifampicin', 'Rifampicin 450mg'),
('Rifinah', 'Rifampicin+INH'),
('INH', 'Isoniazid 300mg'),
('Isonex', 'Isoniazid 300mg'),
('Ethambutol', 'Ethambutol 800mg'),
('Pyrazinamide', 'Pyrazinamide 750mg'),

# MALARIA
('Chloroquine', 'Chloroquine 250mg'),
('Lariago', 'Chloroquine 250mg'),
('Primaquine', 'Primaquine 7.5mg'),
('Lumefantrine', 'Artemether+Lumefantrine'),
('Coartem', 'Artemether+Lumefantrine'),
('ARTE', 'Artesunate Injection'),

# MATERNAL HEALTH
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

# PEDIATRIC
('Zinc', 'Zinc Sulfate 20mg'),
('Vitamin A', 'Vitamin A 1 Lakh IU'),
('Zincovit', 'Zinc+Vitamins Syrup'),

# SUPPLEMENTS AND VITAMINS
('Vitamin D3', 'Cholecalciferol 60000IU'),
('D-rise', 'Cholecalciferol 60000IU'),
('Shelcal', 'Calcium+Vitamin D3'),
('Calcimax', 'Calcium+Vitamin D3'),
('Becosules', 'Vitamin B-Complex'),
('Neurobion', 'Vitamin B12+B1+B6'),
('Methylcobalamin', 'Methylcobalamin 500mcg'),
('Rejunex', 'Methylcobalamin+B6+Folic'),

# EMERGENCY
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

# DERMATOLOGY
('Betnovate', 'Betamethasone Cream'),
('Lobate', 'Clobetasol Cream'),
('Soframycin', 'Framycetin Skin Cream'),
('Candid', 'Clotrimazole 1% Cream'),
('Canesten', 'Clotrimazole 1% Cream'),
('Nizral', 'Ketoconazole Shampoo'),
('Calamine', 'Calamine Lotion'),
('Burnol', 'Furacin Cream'),

# EYE / ENT
('Ciprofloxacin Eye', 'Ciprofloxacin Eye Drops'),
('Tobradex', 'Tobramycin+Dexamethasone Eye'),
('Otrivin', 'Xylometazoline Nasal Spray'),
('Nasivion', 'Oxymetazoline Nasal Spray'),

# UROLOGY
('Tamsulosin', 'Tamsulosin 0.4mg'),
('Urimax', 'Tamsulosin 0.4mg'),
('Flomax', 'Tamsulosin 0.4mg'),
('Finasteride', 'Finasteride 5mg'),
('Finpecia', 'Finasteride 1mg')
]

print(f"Total Unique Medicine Aliases: {len(aliases)}")

# 2. Simulate Stock and Compute Distribution
# Load all pharmacies simulated from Step 1-5
with open('scripts/osm_pharmacies.json', 'r', encoding='utf-8') as f:
    osm_ph = json.load(f)

with open('scripts/osm_facilities.json', 'r', encoding='utf-8') as f:
    osm_fac = json.load(f)

pharmacies = []
seen_osm = set()
for p in osm_ph:
    pharmacies.append({
        'id': f"pharm-{len(pharmacies)+1}",
        'name': p['name'],
        'city': p['city'],
        'district': p['district'],
        'area': p['area'],
        'type': 'private'
    })
    if p.get('osm_id'):
        seen_osm.add(p['osm_id'])

for fac in osm_fac:
    if fac.get('osm_id') and fac['osm_id'] in seen_osm:
        continue
    pharmacies.append({
        'id': f"pharm-{len(pharmacies)+1}",
        'name': fac['name'],
        'city': fac['city'],
        'district': fac['district'],
        'area': fac['area'],
        'type': fac['type']
    })
    if fac.get('osm_id'):
        seen_osm.add(fac['osm_id'])

# Major Hospitals
step4 = [
('Hamidia Hospital', 'Bhopal', 'Bhopal', 'Sultania Road', 'hospital'),
('Gandhi Medical College & Hospital', 'Bhopal', 'Bhopal', 'Bhopal Kotwali', 'hospital'),
('AIIMS Bhopal', 'Bhopal', 'Bhopal', 'Saket Nagar', 'hospital'),
('Kamla Nehru Hospital', 'Bhopal', 'Bhopal', 'Sultania', 'hospital'),
('Sultania Zanana Hospital', 'Bhopal', 'Bhopal', 'Sultania', 'hospital'),
('Bhopal Memorial Hospital & Research Centre', 'Bhopal', 'Bhopal', 'Berasia Road', 'hospital'),
('JP Hospital Bhopal', 'Bhopal', 'Bhopal', 'New Market', 'hospital'),
('Chirayu Medical College & Hospital', 'Bhopal', 'Bhopal', 'Bairagarh', 'hospital'),
('LN Medical College', 'Bhopal', 'Bhopal', 'Kolar Road', 'hospital'),
('PHC Berasia', 'Berasia', 'Bhopal', 'Berasia', 'PHC'),
('PHC Phanda', 'Bhopal', 'Bhopal', 'Phanda', 'PHC'),
('PHC Ratibad', 'Bhopal', 'Bhopal', 'Ratibad', 'PHC'),
('CHC Berasia', 'Berasia', 'Bhopal', 'Berasia', 'CHC'),
('Janaushadhi Kendra Govindpura', 'Bhopal', 'Bhopal', 'Govindpura', 'janaushadhi'),
('Janaushadhi Kendra MP Nagar', 'Bhopal', 'Bhopal', 'MP Nagar', 'janaushadhi'),
('Janaushadhi Kendra Old Bhopal', 'Bhopal', 'Bhopal', 'Old Bhopal', 'janaushadhi'),
('Janaushadhi Kendra Karond', 'Bhopal', 'Bhopal', 'Karond', 'janaushadhi'),
('District Hospital Sehore', 'Sehore', 'Sehore', 'Civil Lines', 'district_hospital'),
('CHC Sehore', 'Sehore', 'Sehore', 'Sehore City', 'CHC'),
('PHC Nasrullaganj', 'Nasrullaganj', 'Sehore', 'Nasrullaganj', 'PHC'),
('PHC Ichhawar', 'Ichhawar', 'Sehore', 'Ichhawar', 'PHC'),
('PHC Rehti', 'Rehti', 'Sehore', 'Rehti', 'PHC'),
('Janaushadhi Kendra Sehore', 'Sehore', 'Sehore', 'Sehore City', 'janaushadhi'),
('District Hospital Ashta', 'Ashta', 'Sehore', 'Ashta Town', 'district_hospital'),
('CHC Ashta', 'Ashta', 'Sehore', 'Ashta Town', 'CHC'),
('PHC Doraha', 'Doraha', 'Sehore', 'Doraha', 'PHC'),
('PHC Maksi', 'Maksi', 'Shajapur', 'Maksi', 'PHC'),
('Janaushadhi Kendra Ashta', 'Ashta', 'Sehore', 'Ashta Town', 'janaushadhi'),
('PHC Obaidullaganj', 'Obaidullaganj', 'Raisen', 'Obaidullaganj', 'PHC'),
('CHC Obaidullaganj', 'Obaidullaganj', 'Raisen', 'Obaidullaganj', 'CHC'),
('District Hospital Dewas', 'Dewas', 'Dewas', 'Civil Lines', 'district_hospital'),
('CHC Dewas', 'Dewas', 'Dewas', 'Dewas City', 'CHC'),
('PHC Kannod', 'Kannod', 'Dewas', 'Kannod', 'PHC'),
('PHC Bagli', 'Bagli', 'Dewas', 'Bagli', 'PHC'),
('Janaushadhi Kendra Dewas', 'Dewas', 'Dewas', 'Dewas City', 'janaushadhi'),
('MY Hospital Indore', 'Indore', 'Indore', 'MG Road', 'hospital'),
('Maharaja Yeshwantrao Hospital', 'Indore', 'Indore', 'Residency', 'hospital'),
('ESIC Hospital Indore', 'Indore', 'Indore', 'Palasia', 'hospital'),
('District Hospital Indore', 'Indore', 'Indore', 'Racecourse', 'district_hospital'),
('CHC Indore Rural', 'Indore', 'Indore', 'Indore Rural', 'CHC'),
('Janaushadhi Kendra Indore MG Road', 'Indore', 'Indore', 'MG Road', 'janaushadhi'),
('Janaushadhi Kendra Indore Palasia', 'Indore', 'Indore', 'Palasia', 'janaushadhi'),
('Highway PHC Sehore-Bhopal Road', 'Budhni Road', 'Sehore', 'NH-46 Corridor', 'PHC'),
('Highway PHC Ashta-Sehore Road', 'NH-46', 'Sehore', 'NH-46 Corridor', 'PHC'),
('Highway PHC Dewas-Ashta Road', 'Dewas', 'Dewas', 'NH-46 Corridor', 'PHC')
]

for name, city, dist, area, ftype in step4:
    pharmacies.append({
        'id': f"pharm-{len(pharmacies)+1}",
        'name': name,
        'city': city,
        'district': dist,
        'area': area,
        'type': ftype
    })

# Gap fills
step5 = [
('Sehore Medical Store', 'Sehore', 'Sehore', 'Main Bazaar', 'private'),
('New Life Pharmacy Sehore', 'Sehore', 'Sehore', 'Bus Stand', 'private'),
('Sharma Medical Sehore', 'Sehore', 'Sehore', 'Collectorate', 'private'),
('Arogya Pharmacy Sehore', 'Sehore', 'Sehore', 'Civil Lines', 'private'),
('Gupta Medical Store Sehore', 'Sehore', 'Sehore', 'Station Road', 'private'),
('Ashta Medical Hall', 'Ashta', 'Sehore', 'Main Road', 'private'),
('Patel Medical Store Ashta', 'Ashta', 'Sehore', 'Gandhi Chowk', 'private'),
('Om Sai Pharma Ashta', 'Ashta', 'Sehore', 'Bus Stand', 'private'),
('Dewangan Medical Ashta', 'Ashta', 'Sehore', 'Hospital Road', 'private'),
('Obaidullaganj Medical Store', 'Obaidullaganj', 'Raisen', 'Main Bazaar', 'private'),
('Highway Pharmacy Obaidullaganj', 'Obaidullaganj', 'Raisen', 'NH-46', 'private'),
('Nasrullaganj Medical', 'Nasrullaganj', 'Sehore', 'Main Road', 'private'),
('Sharma Pharmacy Nasrullaganj', 'Nasrullaganj', 'Sehore', 'Chowk', 'private'),
('Maksi Medical Store', 'Maksi', 'Shajapur', 'Main Bazaar', 'private'),
('Agarwal Pharmacy Maksi', 'Maksi', 'Shajapur', 'Bus Stand', 'private'),
('Kannod Medical Hall', 'Kannod', 'Dewas', 'Main Road', 'private'),
('Jain Medical Kannod', 'Kannod', 'Dewas', 'Near PHC', 'private'),
('Dewas Medical Hall', 'Dewas', 'Dewas', 'AB Road', 'private'),
('Shree Ram Medical Dewas', 'Dewas', 'Dewas', 'Station Road', 'private'),
('Apex Pharmacy Dewas', 'Dewas', 'Dewas', 'Civil Lines', 'private'),
('Mahaveer Medical Store Dewas', 'Dewas', 'Dewas', 'Main Market', 'private'),
('City Pharma Dewas', 'Dewas', 'Dewas', 'Bus Stand', 'private'),
('Sanjeevani Medical Dewas', 'Dewas', 'Dewas', 'Hospital Road', 'private'),
('Shree Krishna Pharma Dewas', 'Dewas', 'Dewas', 'Mandi Road', 'private'),
('National Medical Dewas', 'Dewas', 'Dewas', 'Ujjain Road', 'private'),
('Bhopal Central Pharmacy', 'Bhopal', 'Bhopal', 'Hamidia Road', 'private'),
('Apollo Pharmacy MP Nagar Bhopal', 'Bhopal', 'Bhopal', 'MP Nagar', 'private'),
('Wellness Forever New Market Bhopal', 'Bhopal', 'Bhopal', 'New Market', 'private'),
('Lifeline Medicos Old Bhopal', 'Bhopal', 'Bhopal', 'Old Bhopal', 'private'),
('Janta Medical Store Kolar Bhopal', 'Bhopal', 'Bhopal', 'Kolar Road', 'private'),
('Relief Pharmacy Arera Colony Bhopal', 'Bhopal', 'Bhopal', 'Arera Colony', 'private'),
('Shreeji Medicos Hoshangabad Rd Bhopal', 'Bhopal', 'Bhopal', 'Hoshangabad Road', 'private'),
('Gupta Medicos Bairagarh Bhopal', 'Bhopal', 'Bhopal', 'Bairagarh', 'private')
]

for name, city, dist, area, ftype in step5:
    pharmacies.append({
        'id': f"pharm-{len(pharmacies)+1}",
        'name': name,
        'city': city,
        'district': dist,
        'area': area,
        'type': ftype
    })

print(f"Total Pharmacies in system: {len(pharmacies)}")

# Core private medicines (50 medicines)
private_meds = [
  'Paracetamol 500mg', 'Paracetamol 650mg', 'Metformin 500mg', 'Metformin SR 500mg',
  'Insulin Regular', 'Insulin 30/70', 'Amlodipine 5mg', 'Telmisartan 40mg', 'Atenolol 50mg',
  'Atorvastatin 10mg', 'Rosuvastatin 10mg', 'Aspirin 75mg', 'Clopidogrel 75mg',
  'Azithromycin 500mg', 'Amoxicillin 500mg', 'Amoxicillin+Clavulanate 625mg',
  'Ciprofloxacin 500mg', 'Metronidazole 400mg', 'Doxycycline 100mg', 'Cefixime 200mg',
  'Paracetamol+Ibuprofen 400mg', 'Ibuprofen 400mg', 'Diclofenac 50mg', 'Nimesulide 100mg',
  'Omeprazole 20mg', 'Pantoprazole 40mg', 'Domperidone 10mg', 'ORS Sachet',
  'Cetirizine 10mg', 'Levocetirizine 5mg', 'Montelukast 10mg', 'Salbutamol 100mcg Inhaler',
  'Levothyroxine 50mcg', 'Metoprolol 50mg', 'Folic Acid 5mg', 'Ferrous Sulfate 200mg',
  'Albendazole 400mg', 'Zinc Sulfate 20mg', 'Vitamin B-Complex', 'Methylcobalamin 500mcg',
  'Cholecalciferol 60000IU', 'Calcium+Vitamin D3', 'Glimepiride 1mg', 'Voglibose 0.3mg',
  'Chloroquine 250mg', 'Clotrimazole 1% Cream', 'Betamethasone Cream', 'Normal Saline 500ml',
  'Tamsulosin 0.4mg', 'Diazepam 5mg'
]

# Govt medicines (40 medicines)
govt_meds = [
  'Paracetamol 500mg', 'ORS Sachet', 'Folic Acid 5mg', 'Ferrous Sulfate 200mg',
  'Albendazole 400mg', 'Zinc Sulfate 20mg', 'Vitamin A 1 Lakh IU', 'Chloroquine 250mg',
  'Primaquine 7.5mg', 'Cotrimoxazole 480mg', 'Metronidazole 400mg', 'Metformin 500mg',
  'Insulin Regular', 'Rifampicin 450mg', 'Isoniazid 300mg', 'Ethambutol 800mg',
  'Pyrazinamide 750mg', 'Epinephrine Injection 1mg', 'Dexamethasone Injection 4mg',
  'Atropine Injection 0.6mg', 'Oxytocin Injection', 'Magnesium Sulfate Injection',
  'Misoprostol 200mcg', 'Normal Saline 500ml', 'Ringer Lactate 500ml', 'Omeprazole 20mg',
  'Amlodipine 5mg', 'Atenolol 50mg', 'Phenytoin 100mg', 'Sodium Valproate 200mg',
  'Haloperidol 5mg', 'Chlorpromazine 100mg', 'Artemether+Lumefantrine', 'Vitamin B-Complex',
  'Ciprofloxacin 500mg', 'Amoxicillin 500mg', 'Azithromycin 500mg', 'Diazepam 5mg',
  'Digoxin 0.25mg', 'Furosemide 40mg'
]

stock_entries = []
for p in pharmacies:
    if p['type'] == 'private':
        for med in private_meds:
            avail = True
            if med in ['Paracetamol 500mg', 'ORS Sachet', 'Omeprazole 20mg', 'Cetirizine 10mg', 'Atorvastatin 10mg']:
                avail = True
            elif med in ['Metformin 500mg', 'Insulin Regular', 'Azithromycin 500mg', 'Amoxicillin 500mg']:
                avail = False
            elif med in ['Amlodipine 5mg', 'Telmisartan 40mg', 'Atenolol 50mg']:
                avail = True
            elif med in ['Aspirin 75mg', 'Clopidogrel 75mg']:
                avail = p['area'] in ['MP Nagar', 'Arera Colony', 'Palasia', 'MG Road', 'Civil Lines']
            elif med in ['Salbutamol 100mcg Inhaler', 'Budesonide+Formoterol Inhaler']:
                avail = p['city'] in ['Bhopal', 'Indore', 'Dewas']
            elif med in ['Levothyroxine 50mcg', 'Metoprolol 50mg']:
                avail = True
            elif med in ['Insulin 30/70', 'Insulin Glargine']:
                avail = False
            elif med in ['Albendazole 400mg', 'Zinc Sulfate 20mg']:
                avail = True
            elif med in ['Chloroquine 250mg', 'Primaquine 7.5mg']:
                avail = p['district'] in ['Dewas', 'Sehore', 'Indore']
            else:
                avail = True
            stock_entries.append((p['id'], med, avail))
            
    elif p['type'] in ['PHC', 'CHC', 'district_hospital', 'hospital', 'janaushadhi']:
        for med in govt_meds:
            avail = False
            if med in ['Paracetamol 500mg', 'ORS Sachet', 'Folic Acid 5mg', 'Ferrous Sulfate 200mg', 'Albendazole 400mg', 'Zinc Sulfate 20mg']:
                avail = True
            elif med in ['Chloroquine 250mg', 'Primaquine 7.5mg']:
                avail = True
            elif med in ['Cotrimoxazole 480mg', 'Metronidazole 400mg']:
                avail = True
            elif med in ['Insulin Regular', 'Metformin 500mg']:
                avail = p['type'] in ['district_hospital', 'hospital', 'CHC']
            elif med in ['Rifampicin 450mg', 'Isoniazid 300mg', 'Ethambutol 800mg', 'Pyrazinamide 750mg']:
                avail = p['type'] in ['district_hospital', 'CHC', 'PHC']
            elif med in ['Epinephrine Injection 1mg', 'Dexamethasone Injection 4mg', 'Oxytocin Injection', 'Magnesium Sulfate Injection']:
                avail = p['type'] in ['district_hospital', 'hospital', 'CHC']
            elif med in ['Normal Saline 500ml', 'Ringer Lactate 500ml']:
                avail = p['type'] in ['district_hospital', 'hospital', 'CHC']
            elif med in ['Vitamin A 1 Lakh IU', 'Misoprostol 200mcg']:
                avail = p['type'] in ['PHC', 'CHC', 'district_hospital']
            elif p['type'] == 'janaushadhi':
                avail = True
            else:
                avail = False
            stock_entries.append((p['id'], med, avail))

print(f"Total Stock records generated: {len(stock_entries)}")

# Verification distribution stats
med_stats = defaultdict(lambda: {'total': 0, 'avail': 0})
for pid, med, avail in stock_entries:
    med_stats[med]['total'] += 1
    if avail:
        med_stats[med]['avail'] += 1

sorted_meds = sorted(med_stats.items(), key=lambda x: x[1]['total'], reverse=True)

print(f"{'Medicine Name':<35} | {'Total':<6} | {'Available':<10} | {'Availability %':<15}")
print("="*75)
for med, st in sorted_meds[:30]:
    pct = round(100.0 * st['avail'] / st['total'], 1)
    print(f"{med:<35} | {st['total']:<6} | {st['avail']:<10} | {pct:>5.1f}%")
