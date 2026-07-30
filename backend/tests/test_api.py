import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    response = await client.get("/health")
    assert response.status_code == 200
    
    data = response.json()
    assert "status" in data
    assert "database" in data
    assert "database_error" in data
    assert data["status"] == "ok"


@pytest.mark.asyncio
async def test_balance_periodos(client: AsyncClient):
    from main import app
    from api.deps import get_current_user
    app.dependency_overrides[get_current_user] = lambda: {"id": 1, "username": "admin"}
    try:
        response = await client.get("/api/v1/finanzas/balance-periodos")
        assert response.status_code == 200
        data = response.json()
        assert "periodos" in data
        assert len(data["periodos"]) == 3
        
        periodos_keys = [p["periodo"] for p in data["periodos"]]
        assert "MES_ACTUAL" in periodos_keys
        assert "TRES_MESES" in periodos_keys
        assert "ANIO_ACTUAL" in periodos_keys
    finally:
        app.dependency_overrides.clear()


