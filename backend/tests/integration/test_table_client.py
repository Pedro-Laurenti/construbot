from app.utils.table_client import get_table_service_client, create_table_if_not_exists

def test_table_service_client_connection():
    client = get_table_service_client()
    assert client is not None

def test_create_table():
    table_name = "TestTable"
    result = create_table_if_not_exists(table_name)
    assert result is not None
