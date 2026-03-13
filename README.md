[![Contributors][contributors-shield]][contributors-url]
[![Issues][issues-shield]][issues-url]
[![GNU GPL v3 License][license-shield]][license-url]
[![Latest Release][release-shield]][release-url]

<div align="center">

# Infram

**Open-source platform for secure remote infrastructure operations**

[Quick Start](#quick-start-container) •
[Documentation](#documentation) •
[API Reference](docs/api-reference.md) •
[Security Notes](#security-notes)

</div>

Infram (infra-manager) provides a central control plane for day-to-day infrastructure access and operations across distributed Linux and mixed-protocol environments. It combines remote access, identity-aware authentication, automation, and auditability in one operational surface.

## What Infram Provides

- Remote access over SSH, RDP, VNC, and Telnet
- Integrated remote file operations over SSH sessions
- Multi-tenant isolation with organizations, folders, and scoped identities
- Authentication options: local users, LDAP, OIDC/SSO, TOTP, and passkeys
- Scripts and snippets for repeatable operations and runbooks
- Session lifecycle visibility, audit events, and status-checking features

## Quick Start (Container)

Image: [`swissmakers/infram`](https://hub.docker.com/r/swissmakers/infram)

1) Create persistent storage:

```sh
mkdir -p /opt/podman-infra-manager
```

2) Generate a 64-character hex encryption key:

```sh
openssl rand -hex 32
```

3) Start Infram:

```sh
podman run -d \
  --name infram \
  --network host \
  --restart always \
  -e ENCRYPTION_KEY="<replace-with-generated-key>" \
  -e TRUST_PROXY=1 \
  -v /opt/podman-infra-manager:/app/data:Z \
  swissmakers/infram:latest
```

4) Open `http://<host>:6989`.

> [!TIP]
> `ENCRYPTION_KEY` can also be supplied as a runtime secret file (`/run/secrets/encryption_key`), which is auto-loaded as `ENCRYPTION_KEY`.

## Documentation

- [Installation](docs/installation.md)
- [Reverse Proxy](docs/reverse-proxy.md)
- [SSL/HTTPS](docs/ssl.md)
- [LDAP](docs/ldap.md)
- [OIDC / SSO](docs/oidc.md)
- [Custom Sources](docs/customsource.md)
- [Scripts & Snippets](docs/scripts&snippets.md)
- [Scripting Variables & Directives](docs/ScriptingVariables.md)
- [API Reference](docs/api-reference.md)
- [Screenshots](docs/screenshots.md)
- [Licensing](docs/licensing.md)
- [Contributing](docs/contributing.md)

## Configuration Baseline

Core runtime variables:

- `ENCRYPTION_KEY` (required): 64-char hex key used for credential encryption
- `SERVER_PORT` (default `6989`): HTTP listener
- `HTTPS_PORT` (default `5878`): optional HTTPS listener when cert files exist
- `TRUST_PROXY` (default `false`): Express proxy trust policy (`true`, `false`, count, CIDR/IP list)
- `STRICT_TLS` (default `true`): strict certificate validation for outbound TLS integrations
- `ENABLE_SOURCE_SYNC` (default `false`): enables/disables custom source sync worker
- `ENABLE_VERSION_CHECK` (default `true`): enables/disables release check endpoint
- `VITE_ENABLE_EXTERNAL_LINKS` (default `false`): client-side external URL opening policy

## Development

Prerequisites:

- Node.js 18+
- Yarn
- Podman or Docker (optional, for local container testing)

```sh
git clone https://github.com/swissmakers/infra-manager.git
cd infra-manager
yarn install
cd client && yarn install && cd ..
yarn dev
```

Useful docs commands:

```sh
yarn docs:dev
yarn docs:build
```

## Security Notes

- Keep Infram behind a reverse proxy, VPN, or private network boundary
- Set `TRUST_PROXY` correctly to preserve accurate client IP attribution
- Keep `STRICT_TLS=true` for production unless explicitly troubleshooting
- Store and rotate `ENCRYPTION_KEY` using your secrets management standard
- Back up `/app/data` before upgrades

Security pipeline helpers:

```sh
make security-update
make security-audit
make security-all
make security-sbom
```

## Contributing

Contribution workflow, coding conventions, and validation steps are documented in [docs/contributing.md](docs/contributing.md).

## License

This repository is distributed under **GNU GPL v3.0**. See `LICENSE` and `NOTICE` for terms and third-party attribution.

## Upstream Attribution

Infram is maintained by Swissmakers GmbH and based on the original Nexterm project by Mathias Wagner. Upstream and third-party attribution is preserved in `LICENSE` and `NOTICE`.

[contributors-shield]: https://img.shields.io/github/contributors/swissmakers/infra-manager.svg?style=for-the-badge
[contributors-url]: https://github.com/swissmakers/infra-manager/graphs/contributors
[issues-shield]: https://img.shields.io/github/issues/swissmakers/infra-manager.svg?style=for-the-badge
[issues-url]: https://github.com/swissmakers/infra-manager/issues
[license-shield]: https://img.shields.io/github/license/swissmakers/infra-manager.svg?style=for-the-badge
[license-url]: https://github.com/swissmakers/infra-manager/blob/main/LICENSE
[release-shield]: https://img.shields.io/github/v/release/swissmakers/infra-manager.svg?style=for-the-badge
[release-url]: https://github.com/swissmakers/infra-manager/releases/latest
