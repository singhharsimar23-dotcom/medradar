import json
import urllib.parse
import requests

def fetch_osm_pharmacies():
    query = """[out:json][timeout:60];
(
  node["amenity"="pharmacy"](22.68,75.75,23.40,77.55);
  way["amenity"="pharmacy"](22.68,75.75,23.40,77.55);
  relation["amenity"="pharmacy"](22.68,75.75,23.40,77.55);
);
out center tags;"""
    print("Fetching pharmacies from OSM Overpass API...")
    headers = {
        "User-Agent": "MedRadarApp/1.0 (https://github.com/medradar)"
    }
    url = "https://overpass-api.de/api/interpreter"
    resp = requests.post(url, data={"data": query}, headers=headers, timeout=90)
    resp.raise_for_status()
    data = resp.json()
    elements = data.get("elements", [])
    print(f"Fetched {len(elements)} raw elements for pharmacies.")
    return elements

def fetch_osm_health_facilities():
    query = """[out:json][timeout:60];
(
  node["amenity"="hospital"](22.68,75.75,23.40,77.55);
  way["amenity"="hospital"](22.68,75.75,23.40,77.55);
  node["amenity"="clinic"](22.68,75.75,23.40,77.55);
  way["amenity"="clinic"](22.68,75.75,23.40,77.55);
  node["healthcare"="centre"](22.68,75.75,23.40,77.55);
  way["healthcare"="centre"](22.68,75.75,23.40,77.55);
  node["amenity"="doctors"](22.68,75.75,23.40,77.55);
);
out center tags;"""
    print("Fetching health facilities from OSM Overpass API...")
    headers = {
        "User-Agent": "MedRadarApp/1.0 (https://github.com/medradar)"
    }
    url = "https://overpass-api.de/api/interpreter"
    resp = requests.post(url, data={"data": query}, headers=headers, timeout=90)
    resp.raise_for_status()
    data = resp.json()
    elements = data.get("elements", [])
    print(f"Fetched {len(elements)} raw elements for health facilities.")
    return elements

def get_location_info(lat, lng):
    # Determine city and district from coordinates
    # if lat > 23.35 and lng between 76.95 and 77.55: city='Berasia', district='Bhopal'
    if lat > 23.35 and 76.95 <= lng <= 77.55:
        return 'Berasia', 'Bhopal'
    if lng > 77.30:
        return 'Bhopal', 'Bhopal'
    if 76.95 <= lng <= 77.30:
        return 'Sehore', 'Sehore'
    if 76.55 <= lng < 76.95:
        return 'Ashta', 'Sehore'
    if 76.20 <= lng < 76.55:
        return 'Dewas', 'Dewas'
    if lng < 76.20:
        return 'Indore', 'Indore'
    return 'Bhopal', 'Bhopal'

def escape_sql(text):
    if text is None:
        return 'NULL'
    clean = str(text).replace("'", "''").strip()
    return f"'{clean}'"

def process_pharmacies(elements):
    pharmacies = []
    for el in elements:
        el_type = el.get("type")
        lat = el.get("lat") if el_type == "node" else el.get("center", {}).get("lat")
        lng = el.get("lon") if el_type == "node" else el.get("center", {}).get("lon")
        
        if lat is None or lng is None:
            continue
        try:
            lat = float(lat)
            lng = float(lng)
        except (ValueError, TypeError):
            continue

        tags = el.get("tags", {})
        osm_id = str(el.get("id"))
        
        city, district = get_location_info(lat, lng)
        
        name = tags.get("name")
        street = tags.get("addr:street")
        addr_city = tags.get("addr:city")
        
        # Skip if missing AND no addr:street either
        if not name and not street:
            continue
            
        if not name:
            name = f"{city} Pharmacy {osm_id[-4:]}"
            
        # Address
        addr_parts = [p for p in [street, addr_city] if p]
        address = ", ".join(addr_parts) if addr_parts else None
        
        # Area
        area = tags.get("addr:suburb") or tags.get("addr:neighbourhood") or city
        
        # Phone
        phone = tags.get("phone") or tags.get("contact:phone") or None
        
        pharmacies.append({
            "osm_id": osm_id,
            "name": name,
            "lat": lat,
            "lng": lng,
            "address": address,
            "city": city,
            "district": district,
            "area": area,
            "type": "private",
            "phone": phone,
            "is_open": True,
            "is_pending_approval": False
        })
        
    print(f"Total valid pharmacies processed: {len(pharmacies)}")
    
    # Balance selection across cities across the corridor
    by_city = {}
    for p in pharmacies:
        by_city.setdefault(p["city"], []).append(p)
        
    selected = []
    # Target allocations to ensure full corridor representation
    targets = {
        "Bhopal": 40,
        "Indore": 40,
        "Dewas": 15,
        "Sehore": 15,
        "Ashta": 10,
        "Berasia": 10
    }
    
    for city, target in targets.items():
        available = by_city.get(city, [])
        selected.extend(available[:target])
        print(f"City '{city}': available={len(available)}, selected={min(len(available), target)}")
        
    # If still under 120, fill with remaining
    if len(selected) < 120:
        already_ids = {p["osm_id"] for p in selected}
        remaining = [p for p in pharmacies if p["osm_id"] not in already_ids]
        selected.extend(remaining[:120 - len(selected)])
        
    print(f"Final selected pharmacies count: {len(selected)}")
    return selected[:120]

def process_health_facilities(elements):
    facilities = []
    for el in elements:
        el_type = el.get("type")
        lat = el.get("lat") if el_type == "node" else el.get("center", {}).get("lat")
        lng = el.get("lon") if el_type == "node" else el.get("center", {}).get("lon")
        
        if lat is None or lng is None:
            continue
        try:
            lat = float(lat)
            lng = float(lng)
        except (ValueError, TypeError):
            continue

        tags = el.get("tags", {})
        osm_id = str(el.get("id"))
        name = tags.get("name", "")
        
        # Determine type
        name_lower = name.lower()
        if "phc" in name_lower or "primary health" in name_lower:
            facility_type = "PHC"
        elif "chc" in name_lower or "community health" in name_lower:
            facility_type = "CHC"
        elif "janaushadhi" in name_lower or "pmbjp" in name_lower or "jan aushadhi" in name_lower:
            facility_type = "janaushadhi"
        elif "district hospital" in name_lower or "zila" in name_lower:
            facility_type = "district_hospital"
        elif "aiims" in name_lower:
            facility_type = "hospital"
        elif any(k in name_lower for k in ["gandhi", "hamidia", "kamla", "sultania"]):
            facility_type = "hospital"
        else:
            facility_type = "clinic"
            
        allowed_types = {"PHC", "CHC", "janaushadhi", "district_hospital", "hospital"}
        if facility_type not in allowed_types:
            continue
            
        city, district = get_location_info(lat, lng)
        street = tags.get("addr:street")
        addr_city = tags.get("addr:city")
        addr_parts = [p for p in [street, addr_city] if p]
        address = ", ".join(addr_parts) if addr_parts else None
        area = tags.get("addr:suburb") or tags.get("addr:neighbourhood") or city
        
        if not name:
            name = f"{city} {facility_type.upper()} {osm_id[-4:]}"
            
        facilities.append({
            "osm_id": osm_id,
            "name": name,
            "lat": lat,
            "lng": lng,
            "address": address,
            "city": city,
            "district": district,
            "area": area,
            "type": facility_type,
            "phone": None,
            "is_open": True,
            "is_pending_approval": False
        })
        
    print(f"Total valid health facilities processed: {len(facilities)}")
    return facilities

if __name__ == "__main__":
    pharms = fetch_osm_pharmacies()
    proc_pharms = process_pharmacies(pharms)
    
    facs = fetch_osm_health_facilities()
    proc_facs = process_health_facilities(facs)
    
    with open("scripts/osm_pharmacies.json", "w", encoding="utf-8") as f:
        json.dump(proc_pharms, f, indent=2)
        
    with open("scripts/osm_facilities.json", "w", encoding="utf-8") as f:
        json.dump(proc_facs, f, indent=2)
        
    print("Saved OSM data to JSON files.")
