from flask import request
from flask_smorest import Blueprint, abort

from . import store
from .schemas import PongStatisticsSchema

pong_bp = Blueprint("pong", __name__, description="Partidas e estatísticas do Pong.")


@pong_bp.get("/api/games/pong/statistics")
@pong_bp.response(200, PongStatisticsSchema)
@pong_bp.alt_response(400, description="O id informado não é válido.")
@pong_bp.alt_response(404, description="Usuário não encontrado.")
@pong_bp.doc(
    summary="Estatísticas e histórico do Pong",
    description=(
        "Retorna resultados, histórico, progresso e classificação de um usuário."
    ),
)
def get_pong_statistics():
    """Retorna estatísticas e partidas de um usuário."""
    try:
        user_id = int(request.args.get("id", ""))
    except ValueError:
        abort(400, message="Informe um id de usuário válido.")

    if not store.user_exists(user_id):
        abort(404, message="Usuário não encontrado.")

    statistics = store.get_statistics(user_id)
    statistics["history"] = store.get_match_history(user_id)
    statistics["leaderboard"] = store.get_leaderboard()
    return statistics
