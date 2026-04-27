#!/usr/bin/env bash
#
# Pushes the locally-built whatsapp-worker image to the OCI VM via scp + docker load,
# then restarts the systemd unit. No registry required — this is the MVP path.
#
# Required env:
#   OCI_HOST       Public IP or hostname of the VM
#
# Optional env:
#   OCI_USER       SSH user (default: ubuntu)
#   SSH_KEY_PATH   Path to private SSH key (default: ~/.ssh/id_ed25519)
#   IMAGE_TAG      Docker tag to push (default: latest)
#
# Preconditions on the VM:
#   - Docker installed and the user is in the docker group
#   - /etc/systemd/system/whatsapp-worker.service installed (run install-systemd.sh once)
#   - /opt/whatsapp-worker/service-account.json present and 0600

set -euo pipefail

if [[ -z "${OCI_HOST:-}" ]]; then
  echo "ERROR: OCI_HOST is required (e.g. OCI_HOST=1.2.3.4)" >&2
  exit 1
fi

OCI_USER="${OCI_USER:-ubuntu}"
SSH_KEY_PATH="${SSH_KEY_PATH:-$HOME/.ssh/id_ed25519}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
IMAGE_REF="whatsapp-worker:${IMAGE_TAG}"

# A local tarball next to the script avoids polluting the user's CWD.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARBALL="${SCRIPT_DIR}/whatsapp-worker-${IMAGE_TAG}.tar.gz"
REMOTE_TARBALL="/tmp/whatsapp-worker-${IMAGE_TAG}.tar.gz"

SSH_OPTS=(-i "$SSH_KEY_PATH" -o StrictHostKeyChecking=accept-new)
SCP_OPTS=(-i "$SSH_KEY_PATH" -o StrictHostKeyChecking=accept-new)

cleanup() {
  rm -f "$TARBALL" || true
}
trap cleanup EXIT

echo "==> Saving ${IMAGE_REF} → ${TARBALL}"
docker save "$IMAGE_REF" | gzip > "$TARBALL"

echo "==> Copying tarball to ${OCI_USER}@${OCI_HOST}:${REMOTE_TARBALL}"
scp "${SCP_OPTS[@]}" "$TARBALL" "${OCI_USER}@${OCI_HOST}:${REMOTE_TARBALL}"

echo "==> Loading image on remote and restarting systemd unit"
ssh "${SSH_OPTS[@]}" "${OCI_USER}@${OCI_HOST}" "bash -s" <<EOSSH
set -euo pipefail
echo "  -> docker load"
gunzip -c "${REMOTE_TARBALL}" | docker load
echo "  -> rm tarball"
rm -f "${REMOTE_TARBALL}"
echo "  -> systemctl restart whatsapp-worker"
sudo systemctl restart whatsapp-worker
echo "  -> systemctl status (last 10 lines)"
sudo systemctl status whatsapp-worker --no-pager --lines=10 || true
EOSSH

echo "==> Deploy complete. Tail logs with:"
echo "    ssh ${OCI_USER}@${OCI_HOST} 'sudo journalctl -u whatsapp-worker -f'"
