#!/usr/bin/env bash
#
# Builds the linux/arm64 worker image locally (Apple Silicon Macs build natively;
# Intel hosts will use QEMU emulation via buildx).
#
# Env:
#   IMAGE_TAG  Docker tag to apply (default: latest)
#
# Output:
#   whatsapp-worker:${IMAGE_TAG} loaded into the local Docker image store.

set -euo pipefail

IMAGE_TAG="${IMAGE_TAG:-latest}"

# Resolve to the package root regardless of where the script is invoked from.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKG_DIR="$(dirname "$SCRIPT_DIR")"

echo "==> Building whatsapp-worker:${IMAGE_TAG} for linux/arm64 from ${PKG_DIR}"

cd "$PKG_DIR"

# --load makes the image available to the local docker daemon (single-platform only).
docker buildx build \
  --platform linux/arm64 \
  -t "whatsapp-worker:${IMAGE_TAG}" \
  --load \
  .

echo "==> Built whatsapp-worker:${IMAGE_TAG}"
docker images "whatsapp-worker:${IMAGE_TAG}"
