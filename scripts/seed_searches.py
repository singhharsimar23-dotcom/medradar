from collections import Counter

searches_data = [
# BHOPAL ZONE — Insulin failures
('Insulin Regular', 23.2645, 77.4023, 0, 'Bhopal', False, "NOW() - INTERVAL '47 hours'"),
('Insulin Regular', 23.2656, 77.4201, 0, 'Bhopal', False, "NOW() - INTERVAL '39 hours'"),
('Insulin Regular', 23.3102, 77.4012, 0, 'Bhopal', True,  "NOW() - INTERVAL '31 hours'"),
('Insulin Regular', 23.2345, 77.4356, 0, 'Bhopal', False, "NOW() - INTERVAL '24 hours'"),
('Insulin Regular', 23.2912, 77.4312, 0, 'Bhopal', True,  "NOW() - INTERVAL '18 hours'"),
('Insulin Regular', 23.2801, 77.4601, 0, 'Bhopal', False, "NOW() - INTERVAL '12 hours'"),
('Insulin Regular', 23.2234, 77.3989, 0, 'Bhopal', False, "NOW() - INTERVAL '6 hours'"),
('Insulin Regular', 23.2589, 77.4789, 0, 'Bhopal', True,  "NOW() - INTERVAL '3 hours'"),
('Insulin 30/70',   23.2734, 77.3845, 0, 'Bhopal', False, "NOW() - INTERVAL '22 hours'"),
('Insulin Glargine',23.2456, 77.4145, 0, 'Bhopal', True,  "NOW() - INTERVAL '8 hours'"),

# BHOPAL ZONE — Metformin failures
('Metformin 500mg', 23.2645, 77.4023, 0, 'Bhopal', False, "NOW() - INTERVAL '46 hours'"),
('Metformin 500mg', 23.2366, 77.4020, 0, 'Bhopal', False, "NOW() - INTERVAL '38 hours'"),
('Metformin 500mg', 23.3102, 77.4012, 0, 'Bhopal', False, "NOW() - INTERVAL '30 hours'"),
('Metformin 500mg', 23.2345, 77.4356, 0, 'Bhopal', False, "NOW() - INTERVAL '23 hours'"),
('Metformin 500mg', 23.2912, 77.4312, 0, 'Bhopal', False, "NOW() - INTERVAL '16 hours'"),
('Metformin SR 500mg', 23.2801, 77.4601, 0, 'Bhopal', False, "NOW() - INTERVAL '9 hours'"),
('Metformin 500mg', 23.1834, 77.4512, 0, 'Bhopal', False, "NOW() - INTERVAL '4 hours'"),

# BHOPAL ZONE — Azithromycin
('Azithromycin 500mg', 23.1834, 77.4512, 0, 'Bhopal', False, "NOW() - INTERVAL '20 hours'"),
('Azithromycin 500mg', 23.2456, 77.4145, 0, 'Bhopal', False, "NOW() - INTERVAL '10 hours'"),
('Azithromycin 500mg', 23.2589, 77.4789, 0, 'Bhopal', False, "NOW() - INTERVAL '5 hours'"),
('Amoxicillin 500mg',  23.2101, 77.4312, 0, 'Bhopal', False, "NOW() - INTERVAL '14 hours'"),
('Amoxicillin+Clavulanate 625mg', 23.2295, 77.4298, 0, 'Bhopal', False, "NOW() - INTERVAL '7 hours'"),

# BHOPAL ZONE — Inhalers
('Salbutamol 100mcg Inhaler', 23.2366, 77.4020, 0, 'Bhopal', True,  "NOW() - INTERVAL '35 hours'"),
('Salbutamol 100mcg Inhaler', 23.2295, 77.4298, 0, 'Bhopal', True,  "NOW() - INTERVAL '11 hours'"),
('Budesonide+Formoterol Inhaler', 23.2142, 77.4523, 0, 'Bhopal', False, "NOW() - INTERVAL '6 hours'"),

# BERASIA ROAD / NORTH BHOPAL
('Insulin Regular', 23.3201, 77.4102, 0, 'Bhopal', False, "NOW() - INTERVAL '40 hours'"),
('Metformin 500mg', 23.3201, 77.4102, 0, 'Bhopal', False, "NOW() - INTERVAL '29 hours'"),
('Cefixime 200mg',  23.3201, 77.4102, 0, 'Bhopal', False, "NOW() - INTERVAL '15 hours'"),

# SEHORE ZONE
('Insulin Regular',  23.2003, 77.0857, 0, 'Sehore', True,  "NOW() - INTERVAL '44 hours'"),
('Insulin Regular',  23.2001, 77.0853, 0, 'Sehore', False, "NOW() - INTERVAL '32 hours'"),
('Insulin Regular',  23.1998, 77.0850, 0, 'Sehore', True,  "NOW() - INTERVAL '20 hours'"),
('Metformin 500mg',  23.2003, 77.0857, 0, 'Sehore', False, "NOW() - INTERVAL '41 hours'"),
('Metformin 500mg',  23.2005, 77.0860, 0, 'Sehore', False, "NOW() - INTERVAL '27 hours'"),
('Metformin 500mg',  23.1995, 77.0845, 0, 'Sehore', False, "NOW() - INTERVAL '13 hours'"),
('Glimepiride 1mg',  23.2010, 77.0865, 0, 'Sehore', False, "NOW() - INTERVAL '8 hours'"),
('Cefixime 200mg',   23.2003, 77.0857, 0, 'Sehore', False, "NOW() - INTERVAL '19 hours'"),
('Azithromycin 500mg', 23.1998, 77.0848, 0, 'Sehore', False, "NOW() - INTERVAL '10 hours'"),

# SEHORE ZONE — Chloroquine / Malaria
('Chloroquine 250mg', 23.2003, 77.0857, 0, 'Sehore', False, "NOW() - INTERVAL '36 hours'"),
('Chloroquine 250mg', 22.9700, 77.2600, 0, 'Nasrullaganj', False, "NOW() - INTERVAL '28 hours'"),
('Chloroquine 250mg', 23.0167, 77.0167, 0, 'Ichhawar', False, "NOW() - INTERVAL '18 hours'"),
('Primaquine 7.5mg',  22.9700, 77.2600, 0, 'Nasrullaganj', True,  "NOW() - INTERVAL '12 hours'"),
('Artemether+Lumefantrine', 23.0167, 77.0167, 0, 'Ichhawar', True, "NOW() - INTERVAL '5 hours'"),

# ASHTA ZONE
('Insulin Regular',  23.0186, 76.7206, 0, 'Ashta', True,  "NOW() - INTERVAL '42 hours'"),
('Metformin 500mg',  23.0186, 76.7206, 0, 'Ashta', False, "NOW() - INTERVAL '31 hours'"),
('Insulin Regular',  23.0184, 76.7204, 0, 'Ashta', False, "NOW() - INTERVAL '19 hours'"),
('Metformin 500mg',  23.0188, 76.7210, 0, 'Ashta', False, "NOW() - INTERVAL '11 hours'"),
('Azithromycin 500mg', 23.0190, 76.7215, 0, 'Ashta', False, "NOW() - INTERVAL '6 hours'"),
('Chloroquine 250mg',  23.0181, 76.7200, 0, 'Ashta', False, "NOW() - INTERVAL '33 hours'"),
('ORS Sachet',       23.0186, 76.7206, 0, 'Ashta', False, "NOW() - INTERVAL '4 hours'"),
('Salbutamol 100mcg Inhaler', 23.0190, 76.7215, 0, 'Ashta', True, "NOW() - INTERVAL '2 hours'"),

# OBAIDULLAGANJ
('Insulin Regular',  23.1170, 77.2500, 0, 'Obaidullaganj', True,  "NOW() - INTERVAL '38 hours'"),
('Metformin 500mg',  23.1170, 77.2500, 0, 'Obaidullaganj', False, "NOW() - INTERVAL '25 hours'"),
('Insulin Regular',  23.1172, 77.2503, 0, 'Obaidullaganj', False, "NOW() - INTERVAL '14 hours'"),
('Cefixime 200mg',   23.1168, 77.2498, 0, 'Obaidullaganj', False, "NOW() - INTERVAL '7 hours'"),

# DEWAS ZONE
('Insulin Regular',  22.9623, 76.0511, 0, 'Dewas', True,  "NOW() - INTERVAL '45 hours'"),
('Metformin 500mg',  22.9623, 76.0511, 0, 'Dewas', False, "NOW() - INTERVAL '34 hours'"),
('Insulin Regular',  22.9630, 76.0515, 0, 'Dewas', False, "NOW() - INTERVAL '22 hours'"),
('Chloroquine 250mg', 22.9623, 76.0511, 0, 'Dewas', False, "NOW() - INTERVAL '16 hours'"),
('Azithromycin 500mg', 22.9625, 76.0513, 0, 'Dewas', False, "NOW() - INTERVAL '9 hours'"),
('Salbutamol 100mcg Inhaler', 22.9623, 76.0511, 0, 'Dewas', True, "NOW() - INTERVAL '4 hours'"),
('Glimepiride 1mg',  22.9620, 76.0508, 0, 'Dewas', False, "NOW() - INTERVAL '2 hours'"),

# INDORE ZONE
('Insulin Regular',  22.7196, 75.8577, 0, 'Indore', True,  "NOW() - INTERVAL '43 hours'"),
('Insulin 30/70',    22.7185, 75.8623, 0, 'Indore', False, "NOW() - INTERVAL '30 hours'"),
('Insulin Glargine', 22.7310, 75.8880, 0, 'Indore', True,  "NOW() - INTERVAL '17 hours'"),
('Metformin 500mg',  22.7196, 75.8577, 0, 'Indore', False, "NOW() - INTERVAL '26 hours'"),
('Budesonide+Formoterol Inhaler', 22.7200, 75.8600, 0, 'Indore', False, "NOW() - INTERVAL '12 hours'"),
('Clopidogrel 75mg', 22.7185, 75.8623, 0, 'Indore', false := False, "NOW() - INTERVAL '8 hours'"),
('Rosuvastatin 10mg', 22.7310, 75.8880, 0, 'Indore', False, "NOW() - INTERVAL '5 hours'"),

# HIGHWAY CORRIDOR
('Insulin Regular',  23.1600, 77.1800, 0, 'Sehore', True,  "NOW() - INTERVAL '33 hours'"),
('Paracetamol 500mg', 23.1000, 76.9000, 0, 'Sehore', False, "NOW() - INTERVAL '21 hours'"),
('ORS Sachet',       22.9900, 76.3800, 0, 'Dewas', False, "NOW() - INTERVAL '15 hours'"),
('Metformin 500mg',  23.0800, 76.7800, 0, 'Ashta', False, "NOW() - INTERVAL '9 hours'"),
('Insulin Regular',  22.9900, 76.3800, 0, 'Dewas', True,  "NOW() - INTERVAL '1 hour'")
]

cities = Counter(s[4] for s in searches_data)
total = len(searches_data)
unique_cities = len(cities)

print(f"Total failure searches: {total}")
print(f"Total distinct cities: {unique_cities}")
print("Failures by city:")
for city, cnt in cities.most_common():
    print(f"  {city:<15}: {cnt}")
