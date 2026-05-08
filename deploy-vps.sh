#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-$PWD}"
COMPOSE_SERVICE="${COMPOSE_SERVICE:-telegram-bot}"

log() {
  printf '\n%s\n' "$1"
}

have_command() {
  command -v "$1" >/dev/null 2>&1
}

install_docker() {
  if have_command docker; then
    log "Docker is already installed."
  else
    log "Docker is not installed. Installing Docker..."
    sudo apt-get update
    sudo apt-get install -y ca-certificates curl gnupg
    sudo install -m 0755 -d /etc/apt/keyrings
    . /etc/os-release
    if [ "$ID" != "ubuntu" ] && [ "$ID" != "debian" ]; then
      echo "Unsupported distro for automatic Docker install: $ID. Install Docker manually and rerun this script." >&2
      exit 1
    fi

    curl -fsSL "https://download.docker.com/linux/${ID}/gpg" | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/${ID} ${VERSION_CODENAME} stable" \
      | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  fi

  sudo systemctl enable docker
  sudo systemctl start docker
}

compose_cmd() {
  if docker compose version >/dev/null 2>&1; then
    echo "docker compose"
  elif have_command docker-compose; then
    echo "docker-compose"
  else
    echo ""
  fi
}

install_compose_if_missing() {
  local cmd
  cmd="$(compose_cmd)"
  if [ -n "$cmd" ]; then
    log "Docker Compose is available: $cmd"
    return
  fi

  log "Docker Compose is not installed. Installing compose plugin..."
  sudo apt-get update
  sudo apt-get install -y docker-compose-plugin

  cmd="$(compose_cmd)"
  if [ -z "$cmd" ]; then
    echo "Docker Compose installation failed." >&2
    exit 1
  fi
}

ensure_env() {
  if [ ! -f "$APP_DIR/.env" ]; then
    if [ -f "$APP_DIR/.env.example" ]; then
      cp "$APP_DIR/.env.example" "$APP_DIR/.env"
      echo ".env was created from .env.example. Fill BOT_TOKEN, ADMIN_USER_ID, and chat IDs before starting."
      exit 1
    fi

    echo ".env does not exist. Create it before starting the bot." >&2
    exit 1
  fi
}

start_bot() {
  local cmd
  cmd="$(compose_cmd)"

  cd "$APP_DIR"
  mkdir -p data
  $cmd up -d --build "$COMPOSE_SERVICE"
}

show_status() {
  local cmd
  cmd="$(compose_cmd)"

  cd "$APP_DIR"
  $cmd ps
  echo
  echo "Logs:    $cmd logs -f $COMPOSE_SERVICE"
  echo "Restart: $cmd restart $COMPOSE_SERVICE"
  echo "Stop:    $cmd down"
}

main() {
  log "Deploy/update Telegram bot in $APP_DIR"
  install_docker
  install_compose_if_missing
  ensure_env
  start_bot
  show_status
}

main "$@"
