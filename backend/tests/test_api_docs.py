import os

import pytest
from apidocs import init_api
from auth.routes import SESSION_COOKIE_OPTIONS
from flask import Flask

SPEC_OPERATIONS = {
    ("get", "/api/messages"),
    ("post", "/api/messages"),
    ("post", "/api/auth/signup"),
    ("post", "/api/auth/login"),
    ("post", "/api/auth/logout"),
    ("get", "/api/me"),
    ("get", "/api/profile"),
    ("patch", "/api/profile"),
    ("post", "/api/profile/avatar"),
    ("get", "/api/profile/avatar/{user_id}"),
    ("get", "/api/chat/history"),
    ("post", "/api/friends"),
    ("delete", "/api/friends/{friend_id}"),
    ("post", "/api/friends/{from_id}/accept"),
    ("post", "/api/friends/{from_id}/reject"),
}


@pytest.fixture
def client():
    app = Flask(__name__)
    app.secret_key = os.urandom(32)
    app.config.update(SESSION_COOKIE_OPTIONS)
    init_api(app)
    with app.test_client() as test_client:
        yield test_client


def spec(client):
    response = client.get("/api/docs/openapi.json")
    assert response.status_code == 200
    return response.get_json()


def test_spec_na_versao_3_1_2_documenta_as_quinze_operacoes(client):
    document = spec(client)
    assert document["openapi"] == "3.1.2"
    assert document["info"]["title"] == "ft_transcendence API"
    operations = {
        (method, path)
        for path, item in document["paths"].items()
        for method in item
        if method in ("get", "post", "put", "patch", "delete")
    }
    assert operations == SPEC_OPERATIONS


def test_spec_documenta_os_contratos_de_erro(client):
    document = spec(client)
    assert set(document["components"]["schemas"]) >= {
        "User",
        "Message",
        "ErrorResponse",
        "Profile",
        "ProfileUpdate",
        "Friend",
        "ChatMessage",
        "ConversationHistory",
        "ChatHistory",
    }
    signup = document["paths"]["/api/auth/signup"]["post"]
    assert set(signup["responses"]) == {"201", "400", "409", "default"}
    assert signup["requestBody"]["required"] is True
    assert set(signup["requestBody"]["content"]["application/json"]["schema"]["required"]) == {
        "email",
        "nickname",
        "password",
    }


def test_spec_exige_cookie_de_sessao_nas_rotas_protegidas(client):
    document = spec(client)
    cookie_auth = document["components"]["securitySchemes"]["cookieAuth"]
    assert cookie_auth["type"] == "apiKey"
    assert cookie_auth["in"] == "cookie"
    assert cookie_auth["name"] == "session"
    protected = {
        "/api/me": "get",
        "/api/profile": "patch",
        "/api/profile/avatar": "post",
        "/api/chat/history": "get",
        "/api/friends": "post",
        "/api/friends/{friend_id}": "delete",
        "/api/friends/{from_id}/accept": "post",
        "/api/friends/{from_id}/reject": "post",
    }
    me_401 = document["paths"]["/api/me"]["get"]["responses"]["401"]
    assert me_401["content"]["application/json"]["schema"] == {
        "$ref": "#/components/schemas/ErrorResponse"
    }
    for path, method in protected.items():
        operation = document["paths"][path][method]
        assert operation["security"] == [{"cookieAuth": []}]
        assert operation["responses"]["401"]["content"]["application/json"]["schema"] == {
            "$ref": "#/components/schemas/ErrorResponse"
        }
    for path, method in (
        ("/api/profile", "get"),
        ("/api/profile/avatar/{user_id}", "get"),
        ("/api/messages", "get"),
    ):
        assert "security" not in document["paths"][path][method]


def test_swagger_ui_servido_localmente(client):
    response = client.get("/api/docs/")
    assert response.status_code == 200
    body = response.get_data(as_text=True)
    assert "/api/docs/swagger-ui/swagger-ui-bundle.js" in body
    assert "/api/docs/openapi.json" in body
    for asset in ("swagger-ui.css", "swagger-ui-bundle.js", "swagger-ui-standalone-preset.js"):
        assert client.get(f"/api/docs/swagger-ui/{asset}").status_code == 200


def test_endpoints_de_documentacao_sao_publicos(client):
    assert client.get("/api/me").status_code == 401
    assert client.get("/api/docs/").status_code == 200


def test_redirect_de_api_docs_para_a_ui(client):
    response = client.get("/api/docs")
    assert response.status_code == 308
    assert response.headers["Location"].endswith("/api/docs/")


def test_asyncapi_e_valido_no_arquivo_fonte():
    path = os.path.join(
        os.path.dirname(os.path.dirname(__file__)), "app", "asyncapi.yaml"
    )
    with open(path) as document_file:
        raw = document_file.read()
    yaml = pytest.importorskip("yaml")
    document = yaml.safe_load(raw)
    assert document["asyncapi"] == "3.0.0"
    assert document["info"]["title"] == "ft_transcendence WebSocket"
    events = {message["name"] for message in document["components"]["messages"].values()}
    assert events == {
        "queue:join",
        "queue:leave",
        "paddle:input",
        "game:rematch",
        "disconnect",
        "game:status",
        "game:snapshot",
        "game:error",
        "chat:send",
        "chat:private:send",
        "chat:private:typing",
        "chat:private:read",
        "chat:message",
        "chat:private:message",
        "chat:private:error",
        "friends:update",
    }
    received = {
        name for name, operation in document["operations"].items()
        if operation["action"] == "receive"
    }
    assert len(received) == 9
    for operation in document["operations"].values():
        channel_name = operation["channel"]["$ref"].split("/")[-1]
        channel_messages = set(document["channels"][channel_name]["messages"])
        prefix = f"#/channels/{channel_name}/messages/"
        for message in operation["messages"]:
            assert message["$ref"].startswith(prefix)
            assert message["$ref"][len(prefix):] in channel_messages
    snapshot = document["components"]["schemas"]["GameSnapshot"]["properties"]
    assert set(snapshot) == {
        "leftPaddleOffset",
        "rightPaddleOffset",
        "ball",
        "score",
        "winner",
        "timestamp",
    }
    assert document["components"]["schemas"]["GameError"]["properties"]["reason"]["enum"] == [
        "already_playing",
        "invalid",
        "malformed",
        "not_in_match",
    ]


def test_asyncapi_disponivel_por_http(client):
    response = client.get("/api/docs/asyncapi.yaml")
    assert response.status_code == 200
    assert response.mimetype == "application/yaml"
    assert b'asyncapi: "3.0.0"' in response.data
