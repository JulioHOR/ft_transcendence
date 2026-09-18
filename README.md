# ft_transcendence

| Target      | Action                             |
| ----------- | ---------------------------------- |
| `make up`   | Criar e iniciar os containers      |
| `make down` | Parar os containers                |
| `make logs` | Verificar logs dos containers      |
| `make clean`| Ralizar limpeza dos containers     |
| `make re`   | Limpeza e reinicialização          |

## Secrets

`secrets/` não é versionado. O `make setup` (rodado pelo `make up`) garante:

| Arquivo | Origem |
| ------- | ------ |
| `secrets/db_password.txt` | perguntado no terminal |
| `secrets/flask_secret_key.txt` | gerado com `openssl rand -hex 32` |

Os dois são montados em `/run/secrets/` e precisam ser legíveis pelo `appuser` do container backend (mode `644`).

## Schema do banco

Os scripts de `database/init/` rodam somente na criação do volume. Ao adicionar um script novo, use `make re` ou aplique no banco existente:

```sh
docker compose exec database psql -U ft_user -d ft_transcendence -f /docker-entrypoint-initdb.d/02-users.sql
```
