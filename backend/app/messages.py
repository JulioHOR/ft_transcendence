from flask import jsonify, request
from flask_smorest import Blueprint
from marshmallow import Schema, fields

from db import db_cursor
from schemas import ErrorResponseSchema

messages_bp = Blueprint(
    "messages",
    __name__,
    description="Mural de mensagens do banco de dados.",
)

CONTENT_LIMIT = 1000


class MessageSchema(Schema):
    id = fields.Integer(metadata={"description": "Identificador da mensagem"})
    content = fields.String(metadata={"description": "Texto da mensagem"})


POST_MESSAGE_REQUEST_BODY = {
    "description": "Mensagem a gravar.",
    "required": True,
    "content": {
        "application/json": {
            "schema": {
                "type": "object",
                "required": ["content"],
                "properties": {
                    "content": {
                        "type": "string",
                        "maxLength": CONTENT_LIMIT,
                        "description": f"Texto com até {CONTENT_LIMIT} caracteres.",
                    }
                },
            },
            "example": {"content": "ola do swagger"},
        }
    },
}


@messages_bp.get("/api/messages")
@messages_bp.response(
    200,
    MessageSchema(many=True),
    description="Todas as mensagens, ordenadas por id.",
)
@messages_bp.doc(
    summary="Listar mensagens",
    description="Lista as mensagens públicas do mural.",
)
def get_messages():
    with db_cursor() as cur:
        cur.execute("SELECT id, content FROM messages ORDER BY id;")
        return [
            {"id": row[0], "content": row[1]} for row in cur.fetchall()
        ]


@messages_bp.post("/api/messages")
@messages_bp.response(201, MessageSchema, description="Mensagem gravada.")
@messages_bp.alt_response(
    400,
    schema=ErrorResponseSchema,
    success=True,
    description="content ausente, fora do tipo ou acima do limite.",
)
@messages_bp.doc(
    summary="Criar mensagem",
    description="Grava uma mensagem no mural. Corpo sem JSON válido conta como content vazio.",
    requestBody=POST_MESSAGE_REQUEST_BODY,
)
def post_message():
    content = (request.get_json(silent=True) or {}).get("content", "")
    if not isinstance(content, str):
        return jsonify({"error": "content deve ser texto"}), 400
    if len(content) > CONTENT_LIMIT:
        return jsonify({"error": "content excede o limite"}), 400
    with db_cursor() as cur:
        cur.execute(
            "INSERT INTO messages (content) VALUES (%s) RETURNING id;",
            (content,),
        )
        row = cur.fetchone()
        if row is None:
            raise RuntimeError("INSERT RETURNING sem linha")
        new_id = row[0]
    return {"id": new_id, "content": content}, 201
