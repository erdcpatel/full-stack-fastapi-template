from fastapi.testclient import TestClient


def test_health_check(client: TestClient) -> None:
    res = client.get("/api/v1/utils/health-check/")
    assert res.status_code == 200
    assert res.json() is True


def test_login_and_get_user(client: TestClient) -> None:
    login_res = client.post(
        "/api/v1/login/access-token",
        data={"username": "any@user.com", "password": "anypassword"},
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    assert token

    headers = {"Authorization": f"Bearer {token}"}
    me_res = client.get("/api/v1/users/me", headers=headers)
    assert me_res.status_code == 200
    user = me_res.json()
    assert user["email"] == "admin@example.com"
    assert user["id"] == "demo-admin-id"


def test_items_endpoints(client: TestClient) -> None:
    headers = {"Authorization": "Bearer dummy-token"}
    list_res = client.get("/api/v1/items/", headers=headers)
    assert list_res.status_code == 200
    assert "data" in list_res.json()

    create_res = client.post(
        "/api/v1/items/",
        headers=headers,
        json={"title": "New Item", "description": "Item description"},
    )
    assert create_res.status_code == 200
    item = create_res.json()
    assert item["title"] == "New Item"
    assert item["owner_id"] == "demo-admin-id"


def test_analytics_grid_with_polars(client: TestClient) -> None:
    headers = {"Authorization": "Bearer dummy-token"}
    res = client.get("/api/v1/analytics/grid?page=1&page_size=10", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert len(data["items"]) == 10
    assert "metrics" in data
    assert data["metrics"]["total_volume"] > 0
    assert "facets" in data
    assert len(data["facets"]["categories"]) > 0

    # Filter with category
    filtered = client.get("/api/v1/analytics/grid?category=AI+Inference", headers=headers)
    assert filtered.status_code == 200
    f_data = filtered.json()
    assert all(item["category"] == "AI Inference" for item in f_data["items"])


def test_analytics_charts_with_plotly(client: TestClient) -> None:
    headers = {"Authorization": "Bearer dummy-token"}
    res = client.get("/api/v1/analytics/charts", headers=headers)
    assert res.status_code == 200
    charts = res.json()
    assert "category_chart" in charts
    assert "region_chart" in charts
    assert "trend_chart" in charts
    assert "<script" in charts["category_chart"]


def test_analytics_audit_rbac(client: TestClient) -> None:
    # 1. Admin can access audit logs
    admin_headers = {"Authorization": "Bearer dummy-token", "X-User-Role": "admin"}
    admin_res = client.get("/api/v1/analytics/audit", headers=admin_headers)
    assert admin_res.status_code == 200
    logs = admin_res.json()
    assert len(logs) > 0

    # 2. Viewer is rejected (403 Forbidden)
    viewer_headers = {"Authorization": "Bearer dummy-token", "X-User-Role": "viewer"}
    viewer_res = client.get("/api/v1/analytics/audit", headers=viewer_headers)
    assert viewer_res.status_code == 403
    assert "Access Denied" in viewer_res.json()["detail"]


def test_analytics_arrow_ipc_stream(client: TestClient) -> None:
    headers = {"Authorization": "Bearer dummy-token"}
    res = client.get("/api/v1/analytics/arrow-metrics?page=1&page_size=500", headers=headers)
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/vnd.apache.arrow.file"
    assert res.content.startswith(b"ARROW1")
    assert int(res.headers["x-total-count"]) == 20000
    assert int(res.headers["x-page"]) == 1
    assert int(res.headers["x-page-size"]) == 500
