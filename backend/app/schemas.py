from marshmallow import Schema, fields


class ErrorResponseSchema(Schema):
    error = fields.String(metadata={"description": "Mensagem de erro em português."})
