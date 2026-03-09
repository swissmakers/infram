# 🚀 Installation

> [!WARNING]
> Infram is still in beta. Please back up your data regularly and report any issues on [GitHub](https://github.com/swissmakers/infra-manager/issues).

## 🔐 Generate Encryption Key

Infram requires an encryption key to securely store your data. You can generate a strong key using the following command:

```sh
openssl rand -hex 32
```

## 🐳 Docker

::: code-group

```shell [Host Network (Recommended)]
docker run -d \
  -e ENCRYPTION_KEY=aba3aa8e29b9904d5d8d705230b664c053415c54be20ad13be99af0057dfa23a \
  --network host \
  --name infram \
  --restart always \
  -v infram:/app/data \
  germannewsmaker/infram:latest
```

```shell [Bridge Network]
docker run -d \
  -e ENCRYPTION_KEY=aba3aa8e29b9904d5d8d705230b664c053415c54be20ad13be99af0057dfa23a \
  -p 6989:6989 \
  --name infram \
  --restart always \
  -v infram:/app/data \
  germannewsmaker/nexterm:latest
```

:::

> [!NOTE]
> **Host Network** is strongly recommended. It allows Infram to access your host's network stack directly, which is required for features like Wake-on-LAN and connecting to servers via `localhost`. Only use **Bridge Network** if you specifically need network isolation.

## 📦 Docker Compose

::: code-group

```yaml [Host Network (Recommended)]
services:
  infram:
    environment:
      ENCRYPTION_KEY: "aba3aa8e29b9904d5d8d705230b664c053415c54be20ad13be99af0057dfa23a" # Replace with your generated key
    network_mode: host
    restart: always
    volumes:
      - infram:/app/data
    image: germannewsmaker/nexterm:latest
volumes:
  infram:
```

```yaml [Bridge Network]
services:
  infram:
    environment:
      ENCRYPTION_KEY: "aba3aa8e29b9904d5d8d705230b664c053415c54be20ad13be99af0057dfa23a" # Replace with your generated key
    ports:
      - "6989:6989"
    restart: always
    volumes:
      - infram:/app/data
    image: germannewsmaker/nexterm:latest
volumes:
  infram:
```

:::

```sh
docker-compose up -d
```

### 🌐 IPv6 Support

To connect to IPv6 servers from within the container using bridge networking, add the following to your existing `docker-compose.yml` (not needed for host network):

```diff
services:
  infram:
+   networks:
+     - infram-net

+networks:
+  infram-net:
+    enable_ipv6: true
```

## Security Maintenance (Container-Only)

For dependency updates and vulnerability scans, you can run the built-in container pipeline:

```sh
make security-update
make security-audit
make security-all
make security-sbom
```

This only requires Docker or Podman on the host. The required Node/Yarn/pnpm tooling is executed inside ephemeral containers.
