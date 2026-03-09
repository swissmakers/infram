[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![MIT License][license-shield]][license-url]
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

Infram (short form) is an open-source server management software that allows you to:

-   Connect remotely via SSH, VNC and RDP
-   Manage files through SFTP
-   Deploy applications via Docker
-   Manage Proxmox LXC and QEMU containers
-   Secure access with two-factor authentication and OIDC SSO
-   Separate users and servers into Organizations

## Upstream Attribution

This project is a fork/rebrand maintained by Swissmakers GmbH.
It is based on the original Nexterm project by Mathias Wagner.
Our roadmap focuses on privacy and security optimization, including a hardened containerized version for enterprise use cases.

Original copyright and third-party notices are preserved in `LICENSE` and `NOTICE`.

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
-   [Report a bug](https://github.com/swissmakers/infra-manager/issues)
-   [Request a feature](https://github.com/swissmakers/infra-manager/issues)


## License

Distributed under the MIT license. See `LICENSE` for more information.

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
