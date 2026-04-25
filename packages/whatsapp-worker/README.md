# @momentocake/whatsapp-worker

Standalone Node.js worker that bridges WhatsApp Web (via Baileys) to Firestore. Runs on
a single Oracle Cloud always-free ARM VM. Inbound messages land in `whatsapp_messages`;
the admin UI writes to `whatsapp_outbox` and the worker delivers and updates status.

The worker is fully outbound — it talks only to Firestore and to WhatsApp's WebSocket
servers. No inbound ports are exposed.

## Architecture (TL;DR)

- **One worker per WhatsApp instance** — coordinated via a Firestore lease
  (`whatsapp_status/{instanceId}.workerInstanceId`, 60s TTL, renewed every 20s).
- **Auth state persisted in Firestore** so a restart does not require a fresh QR scan.
- **Heartbeat** every 30s into `whatsapp_status` so the UI can show "last seen".
- **Outbox subscription** watches `whatsapp_outbox` for `pending` docs and sends them.

For the full plan (collections, rules, indexes, UI flows) see
`/Users/gabrielaraujo/.claude-personal/plans/we-want-to-be-glistening-perlis.md`.

## Local development

From the repo root:

```bash
npm run whatsapp:worker:dev
```

This delegates to `npm run dev -w @momentocake/whatsapp-worker` (tsx watch). You'll need:

- `GOOGLE_APPLICATION_CREDENTIALS` pointing at a service-account JSON
- `FIREBASE_PROJECT_ID=momentocake-admin-dev`
- `WHATSAPP_INSTANCE_ID=primary`

```bash
npm test                 # vitest run
npm run test:coverage    # with v8 coverage
npm run type-check       # tsc --noEmit
```

## Deployment

### One-time setup (user-driven)

Follow Phase 5 §5a in the master plan
(`/Users/gabrielaraujo/.claude-personal/plans/we-want-to-be-glistening-perlis.md`):

1. Install `oci-cli` locally and run `oci setup config`.
2. Provision an `VM.Standard.A1.Flex` Ubuntu 22.04 ARM instance via the OCI Console.
   Capacity fallback order: `sa-saopaulo-1` → `sa-vinhedo-1` → `us-ashburn-1`.
3. Open ingress on port 22 only; egress = allow all (default).
4. SSH in, install Docker, add `ubuntu` to the `docker` group.
5. Generate a Firebase service-account JSON and place it at
   `/opt/whatsapp-worker/service-account.json` with `chmod 600`.

### Per-deploy steps (scripted)

Three small scripts under `scripts/`:

| Script | Purpose | When to run |
|---|---|---|
| `build-image.sh` | `docker buildx build --platform linux/arm64 -t whatsapp-worker:latest --load .` | Every code change. |
| `install-systemd.sh` | Copies the unit file to `/etc/systemd/system/`, reloads daemon, enables & starts. | **Once**, on the VM. |
| `deploy-via-ssh.sh` | `docker save | scp | docker load | systemctl restart` | Every deploy. |

Typical deploy loop on a Mac:

```bash
# 1. Build linux/arm64 image locally (Apple Silicon = native, Intel = QEMU)
./packages/whatsapp-worker/scripts/build-image.sh

# 2. (First time only) copy the unit file and the install script to the VM, run it
scp packages/whatsapp-worker/systemd/whatsapp-worker.service \
    packages/whatsapp-worker/scripts/install-systemd.sh \
    ubuntu@$OCI_HOST:~/
ssh ubuntu@$OCI_HOST "chmod +x install-systemd.sh && ./install-systemd.sh whatsapp-worker.service"

# 3. Push image and restart
OCI_HOST=1.2.3.4 ./packages/whatsapp-worker/scripts/deploy-via-ssh.sh
```

### Container registry options

The default `deploy-via-ssh.sh` uses `docker save | scp | docker load` so **no registry
is required**. That is the recommended MVP path.

For CI/CD or repeat deploys, two registry paths work:

- **OCIR (Oracle Cloud Infrastructure Registry)** — recommended for production. No
  Docker Hub rate limits, traffic stays inside OCI, free tier covers this workload.
  Workflow: `docker tag … <region>.ocir.io/<tenancy>/<repo>:tag` then `docker push`,
  pull on the VM with `docker pull` instead of `docker load`.
- **Docker Hub private repo** — works fine but has anonymous-pull rate limits and
  authenticated-pull rate limits. Acceptable while iterating; not recommended for
  unattended automation.

Switching to a registry means replacing the `docker save | scp | docker load` block
in `deploy-via-ssh.sh` with `docker push` locally and `docker pull` over SSH.

## systemd unit env

`systemd/whatsapp-worker.service` ships with these defaults — edit before installing on
the VM:

```
GOOGLE_APPLICATION_CREDENTIALS=/app/service-account.json
FIREBASE_PROJECT_ID=momentocake-admin-dev    # use momentocake-admin for prod
WHATSAPP_INSTANCE_ID=primary
LOG_LEVEL=info
NODE_ENV=production
```

`RestartSec=120` is intentional: the lease TTL is 60s, so a restart at 120s never
collides with the worker's own previous lock.

## Operational commands (on the VM)

```bash
sudo systemctl status whatsapp-worker
sudo systemctl restart whatsapp-worker
sudo journalctl -u whatsapp-worker -f         # tail logs
sudo journalctl -u whatsapp-worker --since "10 min ago"
```

## Future hardening

- **Service-account least privilege.** The MVP uses a broad Firebase Admin SDK key.
  Tightening to only the collections the worker writes (`whatsapp_messages`,
  `whatsapp_conversations`, `whatsapp_outbox`, `whatsapp_status`,
  `whatsapp_auth_state`) requires a custom IAM role + service account; it's deferred
  until after manual verification because the broad key is what the rest of this
  project already uses.
- **Image signing & SBOM** — out of scope for MVP.
- **OCIR-based CI/CD** — see "Container registry options" above; keep manual
  `deploy-via-ssh.sh` for now.
- **Multi-instance failover** — the lease lock supports it (any second worker exits
  cleanly), but provisioning a hot standby is out of scope.

## Troubleshooting

- **`LeaseHeldError` on startup**: another worker is already running for this
  instance. Check `whatsapp_status/{instanceId}.workerInstanceId` in Firestore. The
  lease auto-expires after 60s of no renewal.
- **QR never appears**: check `whatsapp_status/{instanceId}.state` — should flip to
  `pairing`. If it stays at `connecting`, the WhatsApp WebSocket is unreachable or
  the auth state is in a half-state — wipe `whatsapp_auth_state/{instanceId}` and
  restart the worker to force a fresh pairing.
- **Repeated reconnect loop**: usually means the WhatsApp session was logged out
  remotely (e.g. via the phone's "Linked devices" menu). The worker logs
  `logged out — manual re-pair required` and stops auto-reconnecting; visit
  `/whatsapp/settings` in the admin UI to scan a new QR.
