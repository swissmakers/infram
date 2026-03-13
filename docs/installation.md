# Installation

This guide provides a production-oriented baseline for running Infram with Podman or Docker.

## Prerequisites

- Linux host with Podman or Docker
- `openssl` for encryption key generation
- Persistent storage for `/app/data`
- Reverse proxy plan for production exposure (recommended)

## Required Runtime Secret

Infram requires `ENCRYPTION_KEY` at startup. The value must be a 64-character hex string.

Generate one securely:

```sh
openssl rand -hex 32
```

You can provide it either as:

- environment variable `ENCRYPTION_KEY`
- runtime secret file `/run/secrets/encryption_key` (auto-loaded as `ENCRYPTION_KEY`)

## Podman Quick Start

```sh
mkdir -p /opt/podman-infra-manager

podman run -d \
  --name infram \
  --network host \
  --restart always \
  -e ENCRYPTION_KEY="<replace-with-generated-key>" \
  -e TRUST_PROXY=1 \
  -v /opt/podman-infra-manager:/app/data:Z \
  swissmakers/infram:latest
```

## Docker Run

::: code-group

```sh [Host Network]
docker run -d \
  --name infram \
  --network host \
  --restart always \
  -e ENCRYPTION_KEY="<replace-with-generated-key>" \
  -e TRUST_PROXY=1 \
  -v /opt/podman-infra-manager:/app/data \
  swissmakers/infram:latest
```

```sh [Bridge Network]
docker run -d \
  --name infram \
  --restart always \
  -p 6989:6989 \
  -e ENCRYPTION_KEY="<replace-with-generated-key>" \
  -e TRUST_PROXY=1 \
  -v /opt/podman-infra-manager:/app/data \
  swissmakers/infram:latest
```

:::

> [!NOTE]
> Use host networking if you need host-local network behavior for operations and integrations.

## Docker Compose

::: code-group

```yaml [Environment Variable]
services:
  infram:
    image: swissmakers/infram:latest
    container_name: infram
    restart: always
    network_mode: host
    environment:
      ENCRYPTION_KEY: "<replace-with-generated-key>"
      TRUST_PROXY: "1"
    volumes:
      - infram-data:/app/data

volumes:
  infram-data:
```

```yaml [Runtime Secret File]
services:
  infram:
    image: swissmakers/infram:latest
    container_name: infram
    restart: always
    network_mode: host
    environment:
      TRUST_PROXY: "1"
    volumes:
      - infram-data:/app/data
      - ./secrets/encryption_key:/run/secrets/encryption_key:ro

volumes:
  infram-data:
```

:::

Start:

```sh
docker compose up -d
```

## Post-Install Verification

1. Open `http://<host>:6989` (or your reverse-proxy URL).
2. Complete first-time setup and create an admin account.
3. Confirm data persistence under `/opt/podman-infra-manager` (or your named volume).
4. If reverse proxied, verify audit records show real client IP addresses.
5. Check container logs for startup confirmation and migration success.

## Upgrade Procedure

```sh
docker pull swissmakers/infram:latest
docker compose down
docker compose up -d
```

Podman equivalent:

```sh
podman pull swissmakers/infram:latest
podman stop infram && podman rm infram
# start again with the same run command
```

## Backup and Restore

- **Backup**: archive `/opt/podman-infra-manager` (or export named volume)
- **Restore**: stop container, restore data, start container
- **Before upgrades**: always create and verify a backup

## Runtime Hardening Recommendations

- Keep `STRICT_TLS=true` in production
- Set `TRUST_PROXY` to the exact proxy topology
- Keep `ENABLE_SOURCE_SYNC=false` unless source sync is required
- Set `ENABLE_VERSION_CHECK=false` in restricted networks
- Keep container runtime and host OS patched

## Security Maintenance Helpers (DEVS only)

```sh
make security-update
make security-audit
make security-all
make security-sbom
```
