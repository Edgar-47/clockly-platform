import pytest
from pydantic import ValidationError

from app.schemas.location import LocationCreate


def test_location_create_accepts_full_clean_payload():
    payload = LocationCreate(
        name="  Oficina central  ",
        address="  Calle Gran Via, 1  ",
        timezone="Europe/Madrid",
        latitude=41.3851,
        longitude=2.1734,
        allowed_radius_meters=250,
        is_active=True,
    )

    assert payload.name == "Oficina central"
    assert payload.address == "Calle Gran Via, 1"
    assert payload.latitude == pytest.approx(41.3851)
    assert payload.longitude == pytest.approx(2.1734)
    assert payload.allowed_radius_meters == 250
    assert payload.is_active is True


def test_location_create_rejects_single_coordinate():
    with pytest.raises(ValidationError):
        LocationCreate(name="Oficina", latitude=41.3851)
