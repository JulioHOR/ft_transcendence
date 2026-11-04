from marshmallow import Schema, fields


class ProfileSchema(Schema):
    id = fields.Integer(metadata={"description": "Identificador do usuário."})
    nickname = fields.String(metadata={"description": "Apelido público do usuário."})
    avatarUrl = fields.String(
        allow_none=True,
        metadata={"description": "Endereço da foto; null quando o usuário não tem foto."},
    )


class ProfileUpdateSchema(Schema):
    id = fields.Integer(metadata={"description": "Identificador do usuário."})
    email = fields.String(metadata={"description": "E-mail cadastrado no usuário."})
    nickname = fields.String(metadata={"description": "Apelido público do usuário."})
    avatarUrl = fields.String(
        allow_none=True,
        metadata={"description": "Endereço da foto; null quando o usuário não tem foto."},
    )


class FriendSchema(Schema):
    id = fields.Integer(metadata={"description": "Identificador do outro usuário."})
    nickname = fields.String(metadata={"description": "Apelido público no momento da leitura."})
    avatarUrl = fields.String(
        allow_none=True,
        metadata={"description": "Endereço da foto do outro usuário; null sem foto."},
    )
    online = fields.Boolean(
        metadata={"description": "Verdadeiro quando a pessoa tem ao menos uma conexão aberta."},
    )
    status = fields.String(
        metadata={"description": "Situação do vínculo: pending (convite em espera) ou accepted (amizade)."},
    )
    relation = fields.String(
        metadata={"description": "Ponto de vista de quem lista: incoming, outgoing ou friend."},
    )


class ChatMessageSchema(Schema):
    id = fields.String(
        metadata={"description": "Identificador da mensagem, em texto."},
    )
    userId = fields.Integer(metadata={"description": "Identificador de quem enviou."})
    nickname = fields.String(metadata={"description": "Apelido de quem enviou, no momento da leitura."})
    avatarUrl = fields.String(
        allow_none=True,
        metadata={"description": "Endereço da foto de quem enviou."},
    )
    text = fields.String(metadata={"description": "Conteúdo da mensagem."})
    createdAt = fields.Integer(metadata={"description": "Momento do envio, em milissegundos desde 1970."})
    otherUserId = fields.Integer(
        required=False,
        metadata={"description": "Só em conversas privadas: identificador de quem recebeu."},
    )
    conversationId = fields.String(
        required=False,
        metadata={"description": "Só em conversas privadas: id da conversa em \"menor id:maior id\"."},
    )


class ConversationHistorySchema(Schema):
    conversationId = fields.String(metadata={"description": "Id da conversa em \"menor id:maior id\"."})
    otherUserId = fields.Integer(metadata={"description": "Identificador da outra pessoa da conversa."})
    otherNickname = fields.String(
        metadata={"description": "Apelido da outra pessoa da conversa."},
    )
    messages = fields.List(
        fields.Nested(ChatMessageSchema),
        metadata={"description": "Mensagens da conversa, da mais antiga para a mais recente."},
    )


class ChatHistorySchema(Schema):
    global_messages = fields.List(
        fields.Nested(ChatMessageSchema),
        attribute="global",
        data_key="global",
        metadata={"description": "Mensagens da sala pública."},
    )
    conversations = fields.List(
        fields.Nested(ConversationHistorySchema),
        metadata={"description": "Conversas privadas, na ordem da primeira mensagem de cada uma."},
    )
    blockedUserIds = fields.List(
        fields.Integer(),
        metadata={"description": "Usuários bloqueados pela sessão."},
    )
    blockingUserIds = fields.List(
        fields.Integer(),
        metadata={"description": "Usuários que bloquearam a sessão."},
    )


class ChatBlockSchema(Schema):
    status = fields.String(metadata={"description": "Resultado da ação de bloqueio."})
    userId = fields.Integer(metadata={"description": "Usuário atualizado."})
