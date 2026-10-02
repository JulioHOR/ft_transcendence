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


def test_spec_na_versao_3_1_2_documenta_as_seis_operacoes(client):
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
    assert set(document["components"]["schemas"]) >= {"User", "Message", "ErrorResponse"}
    signup = document["paths"]["/api/auth/signup"]["post"]
    assert set(signup["responses"]) == {"201", "400", "409", "default"}
    assert signup["requestBody"]["required"] is True
    assert set(signup["requestBody"]["content"]["application/json"]["schema"]["required"]) == {
        "email",
        "nickname",
        "password",
    }


def test_spec_exige_cookie_de_sessao_apenas_em_me(client):
    document = spec(client)
    cookie_auth = document["components"]["securitySchemes"]["cookieAuth"]
    assert cookie_auth["type"] == "apiKey"
    assert cookie_auth["in"] == "cookie"
    assert cookie_auth["name"] == "session"
    assert document["paths"]["/api/me"]["get"]["security"] == [{"cookieAuth": []}]
    assert "security" not in document["paths"]["/api/messages"]["get"]
    unauthorized = document["paths"]["/api/me"]["get"]["responses"]["401"]
    assert unauthorized["content"]["application/json"]["schema"] == {
        "$ref": "#/components/schemas/ErrorResponse"
    }


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
        "game:restart",
        "disconnect",
        "game:status",
        "game:snapshot",
        "game:error",
    }
    received = {
        name for name, operation in document["operations"].items()
        if operation["action"] == "receive"
    }
    assert len(received) == 5
    channel_messages = set(document["channels"]["matchmaking"]["messages"])
    for operation in document["operations"].values():
        assert operation["channel"]["$ref"] == "#/channels/matchmaking"
        for message in operation["messages"]:
            prefix = "#/channels/matchmaking/messages/"
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
