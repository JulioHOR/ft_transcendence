COMPOSE = docker compose -f ./docker-compose.yml
DATA_DIR = /home/$(USER)/data/ft_transcendence/postgres

all: up

setup:
	@bash ./tools/setup.sh

up: setup
	@mkdir -p $(DATA_DIR)
	$(COMPOSE) up --build -d

down:
	$(COMPOSE) down

logs:
	$(COMPOSE) logs -f

ps:
	$(COMPOSE) ps

clean: setup
	@$(COMPOSE) down -v
	@$(COMPOSE) run --rm --no-deps --build --user root --entrypoint sh database -c 'find /var/lib/postgresql/data -mindepth 1 -delete'
	@$(COMPOSE) down --rmi all

re: clean up

.PHONY: all setup up down logs ps clean re
