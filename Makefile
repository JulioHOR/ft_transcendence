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

clean:
	@$(COMPOSE) down -v --rmi all 2>/dev/null || true
	@sudo rm -rf /home/$(USER)/data/ft_transcendence

re: clean up

.PHONY: all setup up down logs ps clean re
