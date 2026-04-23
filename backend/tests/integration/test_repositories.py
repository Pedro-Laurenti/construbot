import pytest
from app.repositories import ClienteRepository
from app.utils.table_client import create_table_if_not_exists
from app.utils.config import CM_TABLE_CLIENTE

@pytest.fixture(scope="module", autouse=True)
def setup_tables():
    create_table_if_not_exists(CM_TABLE_CLIENTE)
    yield

def test_create_cliente():
    repo = ClienteRepository()
    result = repo.create_cliente(
        nome="Test User",
        telefone="+5511999999999",
        email="test@example.com"
    )
    assert result["status"] == "success"
    assert result["data"]["nome"] == "Test User"

def test_get_cliente_by_email():
    repo = ClienteRepository()
    result = repo.get_by_email("test@example.com")
    assert result["status"] == "success"
    assert result["data"]["email"] == "test@example.com"

def test_duplicate_email():
    repo = ClienteRepository()
    result = repo.create_cliente(
        nome="Duplicate User",
        telefone="+5511888888888",
        email="test@example.com"
    )
    assert result["status"] == "error"
    assert "já cadastrado" in result["error"]
