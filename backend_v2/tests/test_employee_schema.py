from app.schemas.employee import EmployeeCreate


def test_employee_create_normalizes_email_once():
    employee = EmployeeCreate(
        first_name="Ada",
        last_name="Lovelace",
        email="ADA@EXAMPLE.COM",
    )

    assert employee.email == "ada@example.com"
