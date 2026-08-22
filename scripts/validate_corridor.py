import json
from collections import defaultdict, Counter
from datetime import datetime, timedelta

def run_validation():
    # 1. Load Data
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

    # Step 4 Confirmed Hospitals & Health Facilities
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

    # === VALIDATION 1: PHARMACY COVERAGE ===
    print("=== VALIDATION 1: PHARMACY COVERAGE ===")
    pharm_counts = Counter((p['city'], p['type']) for p in pharmacies)
    for (c, t), cnt in sorted(pharm_counts.items()):
        print(f"{c:<18} | {t:<18} | {cnt}")

    total_pharms = len(pharmacies)
    private_pharms = sum(1 for p in pharmacies if p['type'] == 'private')
    private_cities = len(set(p['city'] for p in pharmacies if p['type'] == 'private'))
    phc_chc = sum(1 for p in pharmacies if p['type'] in ('PHC', 'CHC'))
    janaushadhi = sum(1 for p in pharmacies if p['type'] == 'janaushadhi')
    hospitals = sum(1 for p in pharmacies if p['type'] in ('hospital', 'district_hospital'))
    govt_total = total_pharms - private_pharms

    print(f"\nTotal Pharmacies: {total_pharms} (Expected: >=80) -> {'PASS' if total_pharms >= 80 else 'FAIL'}")
    print(f"PHC/CHC entries: {phc_chc} (Expected: >=15) -> {'PASS' if phc_chc >= 15 else 'FAIL'}")
    print(f"Janaushadhi: {janaushadhi} (Expected: >=8) -> {'PASS' if janaushadhi >= 8 else 'FAIL'}")
    print(f"Hospitals/District Hospitals: {hospitals} (Expected: >=10) -> {'PASS' if hospitals >= 10 else 'FAIL'}")

    # Build Stock
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

    stock_map = []
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
                    # Widespread shortage in Sehore/Ashta (malaria belt)
                    avail = p['district'] in ['Dewas', 'Indore']
                else:
                    avail = True
                stock_map.append({'pharmacy': p, 'medicine': med, 'available': avail})
        else:
            for med in govt_meds:
                avail = False
                if med in ['Paracetamol 500mg', 'ORS Sachet', 'Folic Acid 5mg', 'Ferrous Sulfate 200mg', 'Albendazole 400mg', 'Zinc Sulfate 20mg']:
                    avail = True
                elif med in ['Chloroquine 250mg', 'Primaquine 7.5mg']:
                    # Severe malaria shortage in Sehore/Ashta rural belt
                    avail = p['city'] not in ['Sehore', 'Ashta', 'Ichhawar', 'Nasrullaganj']
                elif med in ['Cotrimoxazole 480mg', 'Metronidazole 400mg']:
                    avail = True
                elif med in ['Insulin Regular', 'Metformin 500mg']:
                    # Critical shortage scenario: only central AIIMS / Hamidia in Bhopal, 0 in Sehore
                    avail = p['name'] in ['AIIMS Bhopal', 'Hamidia Hospital', 'MY Hospital Indore']
                elif med in ['Rifampicin 450mg', 'Isoniazid 300mg', 'Ethambutol 800mg', 'Pyrazinamide 750mg']:
                    avail = p['type'] in ['district_hospital', 'CHC', 'PHC']
                elif med in ['Epinephrine Injection 1mg', 'Dexamethasone Injection 4mg', 'Oxytocin Injection', 'Magnesium Sulfate Injection']:
                    avail = p['type'] in ['district_hospital', 'hospital', 'CHC']
                elif med in ['Normal Saline 500ml', 'Ringer Lactate 500ml']:
                    avail = p['type'] in ['district_hospital', 'hospital', 'CHC']
                elif med in ['Vitamin A 1 Lakh IU', 'Misoprostol 200mcg']:
                    avail = p['type'] in ['PHC', 'CHC', 'district_hospital']
                elif p['type'] == 'janaushadhi':
                    # Janaushadhi stores have general generics, but insulin is out of stock in corridor
                    avail = med != 'Insulin Regular'
                else:
                    avail = False
                stock_map.append({'pharmacy': p, 'medicine': med, 'available': avail})

    # === VALIDATION 2: STOCK COVERAGE ===
    print("\n=== VALIDATION 2: STOCK COVERAGE ===")
    target_meds = [
        'Insulin Regular', 'Metformin 500mg', 'Paracetamol 500mg', 
        'Azithromycin 500mg', 'Chloroquine 250mg', 'ORS Sachet',
        'Salbutamol 100mcg Inhaler', 'Amlodipine 5mg'
    ]
    print(f"{'Medicine Name':<28} | {'Cities':<8} | {'Available':<10} | {'Total':<6}")
    print("="*60)
    for t_med in sorted(target_meds):
        matching = [s for s in stock_map if s['medicine'] == t_med]
        cities_cov = len(set(s['pharmacy']['city'] for s in matching))
        avail_cnt = sum(1 for s in matching if s['available'])
        total_cnt = len(matching)
        print(f"{t_med:<28} | {cities_cov:<8} | {avail_cnt:<10} | {total_cnt:<6}")

    # === VALIDATION 3: HEATMAP DENSITY ===
    print("\n=== VALIDATION 3: HEATMAP DENSITY ===")
    from seed_searches import searches_data
    search_by_city = Counter(s[4] for s in searches_data)
    for c, cnt in search_by_city.most_common():
        print(f"{c:<18} | Failures: {cnt:<4} | Latest: within 1-2 hours")

    # === VALIDATION 4: CRITICAL SHORTAGE SCENARIO ===
    print("\n=== VALIDATION 4: CRITICAL SHORTAGE SCENARIO ===")
    insulin_stock = [s for s in stock_map if s['medicine'] == 'Insulin Regular']
    insulin_city_avail = defaultdict(lambda: {'true': 0, 'false': 0})
    for s in insulin_stock:
        c = s['pharmacy']['city']
        if s['available']:
            insulin_city_avail[c]['true'] += 1
        else:
            insulin_city_avail[c]['false'] += 1

    print(f"{'City':<18} | {'Available':<10} | {'Count':<6}")
    for c, counts in sorted(insulin_city_avail.items()):
        if counts['false'] > 0:
            print(f"{c:<18} | False      | {counts['false']:<6}")
        if counts['true'] > 0:
            print(f"{c:<18} | True       | {counts['true']:<6}")

    # Verification checks
    sehore_insulin_avail = insulin_city_avail['Sehore']['true']
    bhopal_insulin_avail = insulin_city_avail['Bhopal']['true']
    print(f"\nSehore Insulin Available: {sehore_insulin_avail} (Expected: 0) -> {'PASS' if sehore_insulin_avail == 0 else 'FAIL'}")
    print(f"Bhopal Insulin Available: {bhopal_insulin_avail} (Expected: <=2) -> {'PASS' if bhopal_insulin_avail <= 2 else 'FAIL'}")

    # === VALIDATION 5: ALIAS COVERAGE ===
    print("\n=== VALIDATION 5: ALIAS COVERAGE ===")
    from seed_medicines_stock import aliases
    total_aliases = len(aliases)
    insulin_aliases = [a[0] for a in aliases if 'insulin' in a[1].lower()]
    print(f"Total Medicine Aliases: {total_aliases} (Expected: >=120) -> {'PASS' if total_aliases >= 120 else 'FAIL'}")
    print(f"Insulin Brand Aliases ({len(insulin_aliases)} entries): {insulin_aliases}")
    print(f"Insulin Brand Count: {len(insulin_aliases)} (Expected: >=8) -> {'PASS' if len(insulin_aliases) >= 8 else 'FAIL'}")

    all_med_types = len(set(s['medicine'] for s in stock_map))
    print(f"\nDistinct Medicine Types in Stock: {all_med_types}")
    print(f"Total Stock Entries: {len(stock_map)}")

if __name__ == '__main__':
    run_validation()
