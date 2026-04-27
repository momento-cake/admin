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

echo "==> systemctl daemon-reload"
sudo systemctl daemon-reload

echo "==> systemctl enable --now whatsapp-worker"
sudo systemctl enable --now whatsapp-worker

echo "==> systemctl status (last 10 lines)"
sudo systemctl status whatsapp-worker --no-pager --lines=10 || true

echo
echo "Done. Tail logs with: sudo journalctl -u whatsapp-worker -f"
