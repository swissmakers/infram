# OIDC / SSO Authentication

Use OpenID Connect (OIDC) to authenticate users with a centralized identity provider.

## Prerequisites

- OIDC-compatible IdP (for example Keycloak, Entra ID, Authentik, Google)
- Public URL for Infram
- Registered OIDC client/application in your IdP
- Redirect URI configured in IdP and Infram

## Required Provider Fields

Configure in **Settings -> Authentication -> Add OIDC Provider**:

- `name`
- `issuer` (must match IdP metadata exactly)
- `clientId`
- `clientSecret` (if confidential client)
- `redirectUri`
- `scope` (default: `openid profile`)

Recommended baseline scope:

`openid profile email`

## Redirect URI

Use the callback endpoint exposed by Infram:

`https://<infram-host>/api/auth/oidc/callback`

> [!WARNING]
> Redirect URI mismatch is the most common cause of failed OIDC sign-in.

## Claim Mapping

Default mappings:

| Infram Field | OIDC Claim |
|---|---|
| Username | `preferred_username` |
| First Name | `given_name` |
| Last Name | `family_name` |

Adjust `usernameAttribute`, `firstNameAttribute`, and `lastNameAttribute` if your IdP uses non-standard claim names.

## Provider Examples

- **Entra ID** issuer: `https://login.microsoftonline.com/<tenant-id>/v2.0`
- **Google** issuer: `https://accounts.google.com`
- **Keycloak** issuer: `https://<host>/realms/<realm>`
- **Authentik** issuer: `https://<host>/application/o/<slug>/`

Always verify the issuer and endpoints through:

`<issuer>/.well-known/openid-configuration`

## Validation Workflow

1. Save provider configuration.
2. Enable provider.
3. Confirm login page displays provider button.
4. Complete login flow and return to Infram.
5. Verify mapped user profile fields after first login.

## Security Guidance

- Keep Infram behind HTTPS when using OIDC.
- Use confidential clients where supported.
- Restrict client redirect URIs to exact production URLs.
- Rotate client secrets according to security policy.

## Troubleshooting

- **Issuer mismatch**: use exact `issuer` from metadata.
- **Callback error**: check redirect URI and proxy forwarding.
- **Missing username/name fields**: adjust scope and claim mapping.
- **Login loop**: verify system clock synchronization on both IdP and Infram hosts.
