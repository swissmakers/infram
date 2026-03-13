# API Reference

Infram exposes a REST API under `/api`. The sidebar operation pages are generated from the live OpenAPI specification.

## Base URL

- Local install: `http://<host>:6989/api`
- Reverse proxy: `https://<your-domain>/api`

## Authentication Model

Most endpoints require a bearer token:

`Authorization: Bearer <session-token>`

Session tokens are returned by login endpoints and also set in the `Authorization` response header on successful authentication.

## Public vs Protected Endpoints

- **Typically public**: selected service and authentication bootstrap endpoints (for example login/startup checks)
- **Protected**: operational resources such as entries, sessions, scripts, identities, organizations, and audit data

## How To Use This Section

1. Open an operation in the API sidebar.
2. Review request schema, auth requirements, and response schema.
3. Execute requests against your environment base URL.

## Regenerating OpenAPI Documentation

If operation docs are stale or missing:

```sh
yarn docs:openapi
yarn docs:dev
```

For static docs build:

```sh
yarn docs:build
```

## Troubleshooting

- **401/invalid token**: obtain a new session token and resend bearer header.
- **400 schema error**: compare payload with endpoint validation schema in API docs.
- **Missing endpoints in docs**: regenerate OpenAPI and rebuild docs.
