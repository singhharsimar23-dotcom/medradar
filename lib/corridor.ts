// Indore-Bhopal NH-46 Highway Corridor Definitions & Helpers

export interface CityCenter {
  name: string;
  lat: number;
  lng: number;
}

export const CORRIDOR_CITIES: CityCenter[] = [
  { name: 'Bhopal', lat: 23.2599, lng: 77.4126 },
  { name: 'Sehore', lat: 23.2003, lng: 77.0857 },
  { name: 'Ashta', lat: 23.0186, lng: 76.7206 },
  { name: 'Dewas', lat: 22.9623, lng: 76.0511 },
  { name: 'Indore', lat: 22.7196, lng: 75.8577 },
  { name: 'Obaidullaganj', lat: 23.1170, lng: 77.2500 }
];

export function detectCityFromCoordinates(lat: number, lng: number): string {
  if (lat > 23.35 && lng >= 76.95 && lng <= 77.55) {
    return 'Berasia';
  }
  if (lng > 77.30) {
    return 'Bhopal';
  }
  if (lng >= 76.95 && lng <= 77.30) {
    return 'Sehore / Obaidullaganj';
  }
  if (lng >= 76.55 && lng < 76.95) {
    return 'Ashta';
  }
  if (lng >= 76.20 && lng < 76.55) {
    return 'Dewas';
  }
  if (lng < 76.20) {
    return 'Indore';
  }
  return 'Bhopal';
}

// Calculate Haversine distance in km
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Calculate cardinal/intercardinal direction from point 1 to point 2
export function calculateDirection(lat1: number, lon1: number, lat2: number, lon2: number): string {
  const dLon = lon2 - lon1;
  const dLat = lat2 - lat1;
  
  const angle = (Math.atan2(dLon, dLat) * 180) / Math.PI;
  const normalized = (angle + 360) % 360;

  if (normalized >= 337.5 || normalized < 22.5) return 'north';
  if (normalized >= 22.5 && normalized < 67.5) return 'northeast';
  if (normalized >= 67.5 && normalized < 112.5) return 'east';
  if (normalized >= 112.5 && normalized < 157.5) return 'southeast';
  if (normalized >= 157.5 && normalized < 202.5) return 'south';
  if (normalized >= 202.5 && normalized < 247.5) return 'southwest';
  if (normalized >= 247.5 && normalized < 292.5) return 'west';
  return 'northwest';
}

export function findNearestCorridorCity(lat: number, lng: number): { city: string; distanceKm: number; direction: string } {
  let minDistance = Infinity;
  let nearestCity = CORRIDOR_CITIES[0].name;
  let direction = 'east';

  for (const c of CORRIDOR_CITIES) {
    const dist = calculateDistanceKm(lat, lng, c.lat, c.lng);
    if (dist < minDistance) {
      minDistance = dist;
      nearestCity = c.name;
      direction = calculateDirection(lat, lng, c.lat, c.lng);
    }
  }

  return {
    city: nearestCity,
    distanceKm: Math.round(minDistance),
    direction
  };
}
