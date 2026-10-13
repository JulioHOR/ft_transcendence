import os

from flask import Blueprint, Flask, redirect, send_from_directory, url_for
from flask_smorest import Api

from auth.routes import auth_bp
from messages import messages_bp

APP_DIR = os.path.dirname(os.path.abspath(__file__))
SWAGGER_UI_DIR = os.path.join(APP_DIR, "vendor", "swagger_ui")

COOKIE_AUTH_SCHEME = {
    "type": "apiKey",
    "in": "cookie",
    "name": "session",
    "description": (
        "Cookie de sessão Flask emitido por /api/auth/signup e /api/auth/login "
        "e destruído por /api/auth/logout."
    ),
}

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
            "components": {"securitySchemes": {"cookieAuth": COOKIE_AUTH_SCHEME}}
        },
    )
    api.register_blueprint(auth_bp)
    api.register_blueprint(messages_bp)
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
