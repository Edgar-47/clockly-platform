"""Tests for Haversine distance calculation and location status logic."""

import pytest

from app.core.geo import Coordinates, haversine_distance


class TestHaversine:
    def test_same_point_is_zero(self):
        a = Coordinates(latitude=41.3851, longitude=2.1734)
        assert haversine_distance(a, a) == pytest.approx(0.0, abs=0.01)

    def test_known_distance_barcelona_madrid(self):
        # Barcelona ↔ Madrid ≈ 504 km
        barcelona = Coordinates(latitude=41.3851, longitude=2.1734)
        madrid = Coordinates(latitude=40.4168, longitude=-3.7038)
        dist = haversine_distance(barcelona, madrid)
        assert 500_000 < dist < 510_000

    def test_close_points_within_100m(self):
        # ~50 m offset in latitude
        a = Coordinates(latitude=41.3851, longitude=2.1734)
        b = Coordinates(latitude=41.38555, longitude=2.1734)
        dist = haversine_distance(a, b)
        assert dist < 100

    def test_symmetry(self):
        a = Coordinates(latitude=41.3851, longitude=2.1734)
        b = Coordinates(latitude=40.4168, longitude=-3.7038)
        assert haversine_distance(a, b) == pytest.approx(haversine_distance(b, a), rel=1e-9)

    def test_equator_crossing(self):
        # Points on either side of equator
        north = Coordinates(latitude=1.0, longitude=0.0)
        south = Coordinates(latitude=-1.0, longitude=0.0)
        # ~222 km
        dist = haversine_distance(north, south)
        assert 220_000 < dist < 225_000

    def test_prime_meridian_crossing(self):
        east = Coordinates(latitude=0.0, longitude=1.0)
        west = Coordinates(latitude=0.0, longitude=-1.0)
        dist = haversine_distance(east, west)
        assert dist == pytest.approx(haversine_distance(west, east), rel=1e-9)

    def test_result_is_metres_not_km(self):
        # 1 degree latitude ≈ 111 km → should be > 1000 m
        a = Coordinates(latitude=0.0, longitude=0.0)
        b = Coordinates(latitude=1.0, longitude=0.0)
        dist = haversine_distance(a, b)
        assert dist > 100_000  # well over 100 km → confirms metres

    def test_north_pole_to_equator(self):
        pole = Coordinates(latitude=90.0, longitude=0.0)
        equator = Coordinates(latitude=0.0, longitude=0.0)
        # Quarter circumference ≈ 10_007 km
        dist = haversine_distance(pole, equator)
        assert 9_900_000 < dist < 10_100_000

    def test_negative_coordinates(self):
        a = Coordinates(latitude=-33.8688, longitude=151.2093)  # Sydney
        b = Coordinates(latitude=-36.8485, longitude=174.7633)  # Auckland
        dist = haversine_distance(a, b)
        # Roughly 2155 km
        assert 2_100_000 < dist < 2_200_000

    def test_returns_float(self):
        a = Coordinates(latitude=41.0, longitude=2.0)
        b = Coordinates(latitude=41.1, longitude=2.1)
        assert isinstance(haversine_distance(a, b), float)

    def test_small_distance_precision(self):
        # 10 m offset: 0.00009 degrees of latitude ≈ 10 m
        a = Coordinates(latitude=41.3851, longitude=2.1734)
        b = Coordinates(latitude=41.38519, longitude=2.1734)
        dist = haversine_distance(a, b)
        assert 5 < dist < 15
