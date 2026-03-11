[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![GNU GPL v3 License][license-shield]][license-url]
[![Release][release-shield]][release-url]

<br />
<!--
<p align="center">
  <a href="https://github.com/swissmakers/infra-manager">
    <picture>
        <source media="(prefers-color-scheme: dark)" srcset="https://i.imgur.com/WhNYRgX.png">
        <img alt="Infram Banner" src="https://i.imgur.com/TBMT7dt.png">
    </picture>
  </a>
</p>-->

## What is infra-manager?

Infram (infra-manager) is a privacy-first and security focused platform for remote infrastructure operations.
It combines remote access, identity-aware administration, inventory synchronization, and auditability in one system.

Core capabilities:

- Remote access to Servers / Clients / IoT, via SSH, RDP, VNC (or Telnet)
- Integrated file management over same SSH-session that used by terminal
- Team isolation through seperate tenant Organizations and access-rules
- LDAP / 2FA / FIDO2 capability for identity and access control. (OIDC as addition)
- Script and snippet automation for repeatable operations (e.g. give a long command "a name", and execute it directly from the WebUI console)
- NetBox (and Proxmox -> we may remove that) integration for infrastructure sync and manager automation.
- Audit logs and session lifecycle controls for operational traceability
- Optional session recording (video) for productive systems

## Upstream Attribution

This project is a fork/rebrand maintained by Swissmakers GmbH.
It is based on the original Nexterm project by Mathias Wagner.
Infram follows an independent roadmap centered on production reliability, security hardening, and privacy-by-default operation.

Original copyright and third-party notices are preserved in `LICENSE` and `NOTICE`.

## Fork Changes vs Upstream (Nexterm)

Infram is intentionally maintained as an operationally independent software because our product goals prioritize stricter security and privacy controls.

### Security and Privacy Hardening

- Removed AI runtime integrations and related backend/frontend feature surfaces.
- Hardened default behavior with strict outbound TLS validation (`STRICT_TLS=true`).
- Disabled external source synchronization by default (`ENABLE_SOURCE_SYNC=false`).
- Added UI/runtime control for external link handling (`VITE_ENABLE_EXTERNAL_LINKS=false` by default).
- Restricted sensitive audit capabilities to admin-level access.
- Build/runtime cleanup with reduced non-essential runtime dependencies.
- Added container-first dependency and vulnerability workflow with optional SBOM generation:
  - `make security-update`, `make security-audit`, `make security-all`, `make security-sbom`
  - `yarn security:update`, `yarn security:audit`, `yarn security:all`, `yarn security:sbom`

### Platform and Feature Architecture

- Replaced the old broad monitoring module with a focused status-checker architecture (that only checks if a server is online or not).
- Added NetBox integration and synchronization services:
  - inventory import for devices/VMs
  - auto-create/update of managed entries
  - role/tag filtering and protocol mapping
  - delete-on-remote-delete synchronization behavior
- Extended LDAP integration:
  - additional directory attributes
  - automatic organization assignment on login
  - improved org-admin mapping support
- Evolved File Manager implementation:
  - SSH-session-based operation model
  - improved multi-file download/upload behavior and failure handling for e.g. permission-denied paths
- Improved lockfile/dependency hygiene across root/client/landing/connector.

### Upstream Sync Policy

Once again, the upstream is treated as a historical source, not as the product roadmap baseline.
Relevant upstream fixes can be selectively backported after compatibility review.

## Screenshots

<table>
  <tr>
    <td><img src="docs/public/assets/showoff/servers.png" alt="Servers" /></td>
    <td><img src="docs/public/assets/showoff/connections.png" alt="Connections" /></td>
    <td><img src="docs/public/assets/showoff/sftp.png" alt="SFTP" /></td>
  </tr>
  <tr>
    <td><img src="docs/public/assets/showoff/snippets.png" alt="Snippets" /></td>
    <td><img src="docs/public/assets/showoff/monitoring.png" alt="Monitoring" /></td>
    <td><img src="docs/public/assets/showoff/recordings.png" alt="Recordings" /></td>
  </tr>
</table>

## Install

You can install Infram by clicking [here](https://github.com/swissmakers/infra-manager).

## Development

### Prerequisites

-   Node.js 18+
-   Yarn
-   Docker (optional)

### Local Setup

#### Clone the repository

```sh
git clone https://github.com/swissmakers/infra-manager.git
cd infra-manager
```

#### Install dependencies

```sh
yarn install
cd client && yarn install
cd ..
```

#### Start development mode

```sh
yarn dev
```

## Configuration

The server listens on port 6989 by default. You can modify this behavior using environment variables:

-   `SERVER_PORT`: Server listening port (default: 6989)
-   `NODE_ENV`: Runtime environment (development/production)
-   `ENCRYPTION_KEY`: Encryption key for passwords, SSH keys and passphrases. Supports Docker secrets via /run/secrets/encryption_key`
-   `LOG_LEVEL`: Logging level for application and guacd (system/info/verbose/debug/warn/error, default: system)
-   `STRICT_TLS`: Enforce TLS certificate validation for outbound integrations like Proxmox and LDAP (default: true)
-   `ENABLE_SOURCE_SYNC`: Enable source synchronization requests and default official source creation (default: false)
-   `ENABLE_VERSION_CHECK`: Allow GitHub version check endpoint (`/api/service/version/check`) (default: true)
-   `VITE_ENABLE_EXTERNAL_LINKS`: Allow opening external links from the web UI (default: false)

### Offline Runtime Defaults

- AI assistant features are removed from the productive app runtime.
- External source synchronization is disabled by default (`ENABLE_SOURCE_SYNC=false`).
- External link opening in the web client is disabled by default (`VITE_ENABLE_EXTERNAL_LINKS=false`).
- GitHub version check remains available through `/api/service/version/check` and can be disabled with `ENABLE_VERSION_CHECK=false`.

### NetBox Inventory Sync

- Add a NetBox integration in the Servers import menu (folder or organization scope).
- Initial sync imports all matching devices/VMs and auto-creates missing entries.
- Ongoing sync applies configurable filters (roles/tags) and protocol mapping rules.
- Default protocol is SSH; rules can switch matching entries to RDP/VNC.
- Entries removed from NetBox (or filtered out later) are deleted from managed entries during sync.

## Security

-   Two-factor authentication
-   Session management
-   Password encryption
-   Docker container isolation
-   Oauth 2.0 OpenID Connect SSO

### Container-Only Security Pipeline

You can run dependency updates and vulnerability audits without installing Node.js, Yarn, pnpm, Flutter or Cargo on your host.
Only Docker or Podman is required.

```sh
# Update dependency locks (root/client/landing/connector) in containers
make security-update

# Run vulnerability audits with fail-on threshold (default: high)
make security-audit

# Update + audit in one run
make security-all

# Audit + SBOM generation
make security-sbom
```

Equivalent npm scripts are available:

```sh
yarn security:update
yarn security:audit
yarn security:all
yarn security:sbom
```

Useful environment variables:

- `SECURITY_FAIL_ON` (`none|critical|high|moderate|low|info`, default: `high`)
- `SECURITY_GENERATE_SBOM` (`1` to enable SBOM output under `artifacts/security/`)
- `SECURITY_NODE_IMAGE` (override Node image, default: `node:22-bookworm-slim`)
- `SECURITY_SYFT_IMAGE` (override Syft image, default: `anchore/syft:latest`)
- `SECURITY_DRY_RUN` (`1` to print container commands without executing)

## Contributing

Contributions are welcome! Please feel free to:

1. Fork the project
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Useful Links

-   [Documentation](https://github.com/swissmakers/infra-manager)
-   [License & Third-Party Notices](docs/licensing.md)
-   [Report a bug](https://github.com/swissmakers/infra-manager/issues)
-   [Request a feature](https://github.com/swissmakers/infra-manager/issues)


## License

Distributed under the GNU General Public License v3.0. See `LICENSE` for more information.

[contributors-shield]: https://img.shields.io/github/contributors/swissmakers/infra-manager.svg?style=for-the-badge
[contributors-url]: https://github.com/swissmakers/infra-manager/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/swissmakers/infra-manager.svg?style=for-the-badge
[forks-url]: https://github.com/swissmakers/infra-manager/network/members
[stars-shield]: https://img.shields.io/github/stars/swissmakers/infra-manager.svg?style=for-the-badge
[stars-url]: https://github.com/swissmakers/infra-manager/stargazers
[issues-shield]: https://img.shields.io/github/issues/swissmakers/infra-manager.svg?style=for-the-badge
[issues-url]: https://github.com/swissmakers/infra-manager/issues
[license-shield]: https://img.shields.io/github/license/swissmakers/infra-manager.svg?style=for-the-badge
[license-url]: https://github.com/swissmakers/infra-manager/blob/master/LICENSE
[release-shield]: https://img.shields.io/github/v/release/swissmakers/infra-manager.svg?style=for-the-badge
[release-url]: https://github.com/swissmakers/infra-manager/releases/latest
