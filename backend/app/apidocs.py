import os

from flask import Blueprint, Flask, redirect, send_from_directory, url_for
from flask_smorest import Api

from auth.routes import auth_bp
from games.pong.routes import pong_bp
from social.routes import social_bp

APP_DIR = os.path.dirname(os.path.abspath(__file__))
SWAGGER_UI_DIR = os.path.join(APP_DIR, "vendor", "swagger_ui")

COOKIE_AUTH_SCHEME = {
    "type": "apiKey",
    "in": "cookie",
    "name": "session",
    "description": (
        "Cookie de sessão Flask emitido por /api/auth/signup e /api/auth/login "
        "e destruído por /api/auth/logout. No Swagger, entre na aplicação na mesma "
        "origem para que o navegador envie esse cookie automaticamente."
    ),
}
API_KEY_SCHEME = {
    "type": "apiKey",
    "in": "header",
    "name": "X-API-Key",
    "description": (
        "Chave do consumidor enviada no cabeçalho X-API-Key. Ela autoriza apenas "
        "as operações que listam apiKeyAuth; não substitui a sessão nas operações "
        "que exigem cookieAuth."
    ),
}

API_DESCRIPTION = """
API HTTP do ft_transcendence.

### Como autenticar

- **Chave de API:** informe `X-API-Key` em **Authorize** para consumir os endpoints
  marcados com `apiKeyAuth`. A chave está na variável `API_KEY` do `.env`.
- **Sessão:** entre na aplicação no mesmo navegador e origem. O navegador envia
  automaticamente o cookie `session` nos endpoints marcados com `cookieAuth`.
  A chave de API, sozinha, não autoriza operações da conta, amizades ou chat.
- As operações marcadas com `cookieAuth` ou `apiKeyAuth` aceitam qualquer uma
  dessas formas. Operações marcadas apenas com `cookieAuth` exigem sessão.
- Cadastro, login, consulta da sessão atual e documentação não exigem chave.

### Endpoints que aceitam chave ou sessão

- `GET /api/profile`: lê dados públicos do perfil.
- `GET /api/profile/avatar/{user_id}`: lê o avatar público.
- `GET /api/games/pong/statistics`: lê estatísticas, histórico e classificação.

### Teste no Swagger

1. Para os três endpoints acima, clique em **Authorize** e informe a chave de API.
2. Para operações de perfil, chat ou amizades marcadas com `cookieAuth`, entre na
   aplicação neste mesmo navegador antes de usar **Try it out**.
3. Sem chave ou sessão válida, endpoints protegidos respondem `401`.

O limite atual é de 120 requisições por minuto por endereço IP. A documentação
dos eventos WebSocket está em `/api/docs/asyncapi.yaml`.
"""

docs_bp = Blueprint("docs", __name__)


def init_api(app: Flask) -> Api:
    app.config.update(
        {
            "API_TITLE": "ft_transcendence API",
            "API_VERSION": "1.0.0",
            "OPENAPI_VERSION": "3.1.2",
            "OPENAPI_URL_PREFIX": "/api/docs",
            "OPENAPI_SWAGGER_UI_PATH": "/",
            "OPENAPI_SWAGGER_UI_URL": "/api/docs/swagger-ui/",
        }
    )
    api = Api(
        app,
        spec_kwargs={
            "info": {"description": API_DESCRIPTION},
            "components": {
                "securitySchemes": {
                    "cookieAuth": COOKIE_AUTH_SCHEME,
                    "apiKeyAuth": API_KEY_SCHEME,
                }
            }
        },
    )
    api.register_blueprint(auth_bp)
    api.register_blueprint(pong_bp)
    api.register_blueprint(social_bp)
    app.register_blueprint(docs_bp)
    return api


@docs_bp.get("/api/docs")
def docs_index():
    return redirect(url_for("api-docs.openapi_swagger_ui"), code=308)


@docs_bp.get("/api/docs/swagger-ui/<path:filename>")
def swagger_ui_asset(filename):
    return send_from_directory(SWAGGER_UI_DIR, filename)


@docs_bp.get("/api/docs/asyncapi.yaml")
def asyncapi_spec():
    return send_from_directory(APP_DIR, "asyncapi.yaml", mimetype="application/yaml")
