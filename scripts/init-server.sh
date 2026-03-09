#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/init-server.sh
# Prepares a fresh Ubuntu box with Docker, docker compose plugin, firewall rules, and directories.

if [[ $EUID -ne 0 ]]; then
  echo "Please run as root (sudo)."
  exit 1
fi

apt update
apt install -y git docker.io docker-compose-plugin ufw
systemctl enable docker
systemctl start docker

# Basic firewall hardening
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Create Huao directories
install -d -m 755 /opt/huao/{app,storage,postgres/config,postgres/data,config/env,config/caddy,scripts}
install -d -m 750 /opt/huao/config/env
install -d -m 700 /opt/huao/config/caddy
install -d -m 755 /opt/huao/storage/{auth_info,sessions,uploads,logs,backups,caddy-data,caddy-config}

chown -R ${SUDO_USER:-ubuntu}:${SUDO_USER:-ubuntu} /opt/huao

echo "Server initialization complete. Clone the repo into /opt/huao/app next."
