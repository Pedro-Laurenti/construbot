import pytest
import os

@pytest.fixture(scope="session", autouse=True)
def setup_test_env():
    os.environ["CM_STORAGE_ACCOUNT_NAME"] = "devstoreaccount1"
    os.environ["CM_STORAGE_ACCOUNT_URL"] = "http://127.0.0.1:10002/devstoreaccount1"
    os.environ["CM_STORAGE_CONNECTION_STRING"] = (
        "DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;"
        "AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;"
        "TableEndpoint=http://127.0.0.1:10002/devstoreaccount1;"
    )
    yield
