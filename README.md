<div align="center">

# Infram Enterprise

**Secure infrastructure access and operations platform for enterprise teams**

[Deployment Quick Start](#deployment-quick-start-container) •
[Security and Compliance](#security-and-compliance) •
[Licensing and Commercial Use](#licensing-and-commercial-use)

</div>

Infram provides a central control plane for secure remote access,
identity-aware administration, automation, and audited operations across
distributed Linux and mixed-protocol environments.

## Product Overview

Infram is designed for organizations that need controlled infrastructure access,
high operational traceability, and standardized runbook execution from one
enterprise platform.

Core capabilities:

- Remote access over SSH, RDP, VNC, and Telnet
- Integrated remote file operations over SSH sessions
- Multi-tenant isolation with organizations, folders, and scoped identities
- NetBox integration: scheduled CMDB sync and inventory updates with role-based filters for devices and VMs
- Authentication options: local users, LDAP, OIDC/SSO and passkeys (all combined with TOTP)
- Managed scripts and snippets integradtion for repeatable operational workflows
- Session lifecycle visibility, audit events, and status checks

## Deployment Quick Start (Container)

Image: [`swissmakers/infram`](https://hub.docker.com/r/swissmakers/infram)

1) Create persistent storage:

```sh
mkdir -p /opt/podman-infram
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
  -v /opt/podman-infram:/app/data:Z \
  swissmakers/infram:latest
```

4) Open `http://<host>:6989`.

> `ENCRYPTION_KEY` can also be supplied as a runtime secret file
> (`/run/secrets/encryption_key`), which is auto-loaded as `ENCRYPTION_KEY`. (if needed)

Runtime variables:

- `ENCRYPTION_KEY` (required): 64-char hex key used for credential encryption
- `SERVER_PORT` (default `6989`): HTTP listener
- `HTTPS_PORT` (default `5878`): optional HTTPS listener when cert files exist
- `TRUST_PROXY` (default `false`): Express proxy trust policy (`true`, `false`,
  count, CIDR/IP list)
- `STRICT_TLS` (default `true`): strict certificate validation for outbound TLS
  integrations
- `ENABLE_SOURCE_SYNC` (default `false`): enables/disables custom source sync
  worker
- `ENABLE_VERSION_CHECK` (default `true`): enables/disables release check
  endpoint
- `VITE_ENABLE_EXTERNAL_LINKS` (default `false`): client-side external URL
  opening policy

## Security and Compliance

- Keep Infram behind a reverse proxy, VPN, or private network boundary
- Set `TRUST_PROXY` correctly to preserve accurate client IP attribution
- Keep `STRICT_TLS=true` in production unless explicitly troubleshooting
- Store and rotate `ENCRYPTION_KEY` using your enterprise secrets standard
- Back up `/app/data` before upgrades

Security pipeline helpers:

```sh
make security-update
make security-audit
make security-all
make security-sbom
```

## Documentation

- [Installation](docs/installation.md)
- [Reverse Proxy](docs/reverse-proxy.md)
- [SSL/HTTPS](docs/ssl.md)
- [LDAP](docs/ldap.md)
- [OIDC / SSO](docs/oidc.md)
- [Custom Sources](docs/customsource.md)
- [Scripts and Snippets](docs/scripts&snippets.md)
- [Scripting Variables and Directives](docs/ScriptingVariables.md)
- [API Reference](docs/api-reference.md)
- [Screenshots](docs/screenshots.md)
- [Licensing](docs/licensing.md)

## Licensing and Commercial Use

Infram is provided under **PolyForm Noncommercial 1.0.0** with additional
licensor terms from Swissmakers GmbH.

- Private noncommercial users can use Infram free of charge
- Commercial usage requires a separate commercial license from Swissmakers GmbH
- Redistribution is not permitted unless explicitly authorized in writing
- Third-party support and managed services are not permitted unless explicitly
  authorized in writing

See `LICENSE` and [docs/licensing.md](docs/licensing.md) for details.

## Support

Official product support, commercial licensing, and partner authorization are
provided by Swissmakers GmbH.
