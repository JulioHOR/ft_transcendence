from flask import jsonify, request
from flask_smorest import Blueprint

from . import store
from .schemas import PongStatisticsSchema

pong_bp = Blueprint("pong", __name__, description="Partidas e estatísticas do Pong.")


def _requested_user_id() -> int | None:
    try:
        return int(request.args.get("id", ""))
    except ValueError:
        return None


def _statistics_with_history(user_id: int) -> dict:
    statistics = store.get_statistics(user_id)
    statistics["history"] = store.get_match_history(user_id)
    statistics["leaderboard"] = store.get_leaderboard()
    return statistics


@pong_bp.get("/api/games/pong/statistics")
@pong_bp.response(200, PongStatisticsSchema)
@pong_bp.alt_response(400, description="O id informado não é válido.")
@pong_bp.alt_response(404, description="Usuário não encontrado.")
@pong_bp.doc(
    summary="Estatísticas e histórico do Pong",
    description=(
        "Aceita uma chave de API ou uma sessão autenticada. Sem sessão, envie "
        "X-API-Key. Retorna estatísticas, histórico, progresso e classificação "
        "do usuário informado."
    ),
    security=[{"cookieAuth": []}, {"apiKeyAuth": []}],
)
def get_pong_statistics():
    user_id = _requested_user_id()
    if user_id is None:
        return jsonify({"error": "Informe um id de usuário válido."}), 400

    if not store.user_exists(user_id):
        return jsonify({"error": "Usuário não encontrado."}), 404

    return _statistics_with_history(user_id)
