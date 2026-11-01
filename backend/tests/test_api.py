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
