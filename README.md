# ft_transcendence

| Target      | Action                             |
| ----------- | ---------------------------------- |
| `make up`   | Criar e iniciar os containers      |
| `make down` | Parar os containers                |
| `make logs` | Verificar logs dos containers      |
| `make clean`| Ralizar limpeza dos containers     |
| `make re`   | Limpeza e reinicialização          |

## Configuração e secrets

O arquivo `.env` é local e ignorado pelo Git. Na primeira execução, `make up`
cria uma cópia de `.env.example`, gera os secrets ausentes e inicia os containers
sem prompts, edição de `/etc/hosts` ou uso de `sudo`.

O acesso local padrão é `https://localhost:8443`. O certificado do navegador é
autoassinado. O tráfego entre Nginx e backend também usa HTTPS, com certificado
interno gerado localmente e validado pelo Nginx.

`secrets/` não é versionado. O setup gera:

| Arquivo | Origem |
| ------- | ------ |
| `secrets/db_password.txt` | gerado localmente |
| `secrets/flask_secret_key.txt` | gerado localmente |
| `secrets/backend.crt` e `secrets/backend.key` | certificado TLS interno |

Os secrets são montados em `/run/secrets/` nos containers que precisam deles.

## Schema do banco

Os scripts de `database/init/` rodam somente na criação do volume. Ao adicionar um script novo, use `make re` ou aplique no banco existente:

```sh
docker compose exec database psql -U ft_user -d ft_transcendence -f /docker-entrypoint-initdb.d/02-users.sql
```
