#!/usr/bin/env bash
#
# One-shot installer for the whatsapp-worker systemd unit on the OCI VM.
# Run this ONCE on the VM after the following preconditions are met:
#
#   1. Docker is installed and the current user is in the docker group:
#        sudo apt update && sudo apt install -y docker.io
#        sudo usermod -aG docker "$USER" && newgrp docker
#   2. /opt/whatsapp-worker/service-account.json exists with 0600 perms:
#        sudo mkdir -p /opt/whatsapp-worker
#        sudo mv /tmp/service-account.json /opt/whatsapp-worker/
#        sudo chmod 600 /opt/whatsapp-worker/service-account.json
#   3. The whatsapp-worker:latest image is loaded locally (deploy-via-ssh.sh handles this).
#
# This script also provisions /opt/whatsapp-worker/auth_info_baileys/ — the host
# directory where Baileys persists its WhatsApp Web auth state (Signal Protocol
# session keys, registration credentials, etc.). The directory is bind-mounted
# into the container at /app/auth_info_baileys. Notes:
#
#   - Owned by ubuntu:ubuntu, mode 0700 (contains sensitive private keys).
#   - Survives container restarts AND image redeploys (deploy-via-ssh.sh does
#     not touch /opt/whatsapp-worker/).
#   - Losing this folder = the bakery must re-pair the WhatsApp number by
#     scanning a new QR code from their phone's "Linked devices" menu.
#   - Backing it up offsite (encrypted) is recommended for DR; see README.
#
# Run from the directory containing whatsapp-worker.service, or pass its path as $1.

set -euo pipefail

UNIT_SRC="${1:-whatsapp-worker.service}"
UNIT_DST="/etc/systemd/system/whatsapp-worker.service"

if [[ ! -f "$UNIT_SRC" ]]; then
  echo "ERROR: unit file '$UNIT_SRC' not found." >&2
  echo "Pass the path as an argument or run this from the directory containing it." >&2
  exit 1
fi

echo "==> Installing $UNIT_SRC -> $UNIT_DST"
sudo cp "$UNIT_SRC" "$UNIT_DST"

# Provision the Baileys auth state directory on the host. `install -d` is
# idempotent: it's a no-op if the directory already exists with matching
# ownership and mode, otherwise it creates / fixes them. Safe to re-run.
# Owner uid 100 / gid 101 matches the container image's `app` system user
# (Alpine `adduser -S app -G app` allocates uid 100). The container needs
# to read AND write this folder; the host's `ubuntu` user does not need
# access. Baileys keys are sensitive — only the worker process should read.
echo "==> Ensuring /opt/whatsapp-worker/auth_info_baileys (0700 100:101)"
sudo install -d -o 100 -g 101 -m 0700 /opt/whatsapp-worker/auth_info_baileys

echo "==> systemctl daemon-reload"
sudo systemctl daemon-reload

echo "==> systemctl enable --now whatsapp-worker"
sudo systemctl enable --now whatsapp-worker

echo "==> systemctl status (last 10 lines)"
sudo systemctl status whatsapp-worker --no-pager --lines=10 || true

echo
echo "Done. Tail logs with: sudo journalctl -u whatsapp-worker -f"
