import math
from typing import NamedTuple

EARTH_RADIUS_METERS = 6_371_000


class Coordinates(NamedTuple):
    latitude: float
    longitude: float


def haversine_distance(a: Coordinates, b: Coordinates) -> float:
    """Return great-circle distance between two points in metres."""
    lat1 = math.radians(a.latitude)
    lon1 = math.radians(a.longitude)
    lat2 = math.radians(b.latitude)
    lon2 = math.radians(b.longitude)
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    x = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 2 * EARTH_RADIUS_METERS * math.asin(math.sqrt(x))
