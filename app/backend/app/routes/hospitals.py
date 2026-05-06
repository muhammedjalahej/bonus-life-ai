"""
Nearest hospitals in Turkey (OpenStreetMap / Overpass API, free).
Returns list of hospitals near a lat/lon, sorted by distance.
"""

import logging
import math

import httpx

from fastapi import APIRouter, HTTPException, Query

logger = logging.getLogger(__name__)

router = APIRouter(tags=["hospitals"])

OVERPASS_MIRRORS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
]


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def parse_overpass_element(el: dict, user_lat: float, user_lon: float) -> dict | None:
    lat, lon = None, None
    if el.get("type") == "node":
        lat = el.get("lat")
        lon = el.get("lon")
    elif el.get("type") == "way" and "center" in el:
        lat = el["center"].get("lat")
        lon = el["center"].get("lon")
    elif el.get("type") == "relation" and "center" in el:
        lat = el["center"].get("lat")
        lon = el["center"].get("lon")
    if lat is None or lon is None:
        return None
    tags = el.get("tags") or {}
    name = tags.get("name") or tags.get("name:en") or "Hospital"
    addr = tags.get("addr:full") or ", ".join(
        filter(
            None,
            [
                tags.get("addr:street"),
                tags.get("addr:housenumber"),
                tags.get("addr:city") or tags.get("addr:town"),
                tags.get("addr:postcode"),
            ],
        )
    )
    if not addr and (tags.get("addr:street") or tags.get("addr:city")):
        addr = ", ".join(filter(None, [tags.get("addr:street"), tags.get("addr:city") or tags.get("addr:town")]))
    distance_km = round(haversine_km(user_lat, user_lon, float(lat), float(lon)), 2)
    return {
        "name": name,
        "address": addr or None,
        "lat": lat,
        "lon": lon,
        "distance_km": distance_km,
        "phone": tags.get("phone") or tags.get("contact:phone"),
    }


@router.get("/nearby-hospitals")
def get_nearby_hospitals(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    radius_km: float = Query(50, ge=1, le=200),
    limit: int = Query(25, ge=1, le=50),
):
    """
    Returns hospitals near the given coordinates (OpenStreetMap / Overpass API).
    """
    radius_m = int(radius_km * 1000)
    # Include amenity=hospital and healthcare=hospital for better coverage in Turkey
    query = (
        f"[out:json][timeout:25];"
        f"("
        f"  node[amenity=hospital](around:{radius_m},{lat},{lon});"
        f"  way[amenity=hospital](around:{radius_m},{lat},{lon});"
        f"  relation[amenity=hospital](around:{radius_m},{lat},{lon});"
        f"  node[healthcare=hospital](around:{radius_m},{lat},{lon});"
        f"  way[healthcare=hospital](around:{radius_m},{lat},{lon});"
        f"  relation[healthcare=hospital](around:{radius_m},{lat},{lon});"
        f");"
        f"out center meta;"
    )
    data = None
    for mirror in OVERPASS_MIRRORS:
        try:
            with httpx.Client(timeout=20.0) as client:
                r = client.post(mirror, data={"data": query})
            r.raise_for_status()
            data = r.json()
            break
        except Exception as e:
            logger.warning("Overpass mirror %s failed: %s", mirror, e)
            continue
    if data is None:
        raise HTTPException(status_code=502, detail="Could not fetch hospital data.")
    elements = data.get("elements") or []
    seen = set()
    results = []
    for el in elements:
        parsed = parse_overpass_element(el, lat, lon)
        if not parsed:
            continue
        key = (parsed["lat"], parsed["lon"], parsed["name"])
        if key in seen:
            continue
        seen.add(key)
        results.append(parsed)
    results.sort(key=lambda x: x["distance_km"])
    return {"hospitals": results[:limit], "user": {"lat": lat, "lon": lon}}
