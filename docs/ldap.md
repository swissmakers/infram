# LDAP Authentication

Use LDAP or Active Directory integration for centralized login and role mapping.

## Authentication Flow

1. Infram binds using the configured service account (`bindDN`).
2. Infram searches for the user with `userSearchFilter`.
3. User credentials are validated against the discovered entry.
4. Local account fields are synchronized from LDAP attributes.
5. Admin privileges are resolved via configured group mapping.

## Required Provider Settings

Configure under **Settings -> Authentication -> LDAP Provider**:

- `name`
- `host`
- `port` (`389` LDAP, `636` LDAPS)
- `bindDN`
- `bindPassword`
- `baseDN`
- `userSearchFilter` (must include `{{username}}`)
- `usernameAttribute`

Useful defaults:

- `userSearchFilter`: `(uid={{username}})`
- `usernameAttribute`: `uid`
- `firstNameAttribute`: `givenName`
- `lastNameAttribute`: `sn`
- `emailAttribute`: `mail`

## Search Filter Examples

| Directory | User Search Filter |
|---|---|
| Active Directory | `(sAMAccountName={{username}})` |
| OpenLDAP | `(uid={{username}})` |
| Email login pattern | `(mail={{username}})` |

## Admin Group Mapping

Use these fields for elevated role mapping:

- `adminGroupDNs`: explicit allow-list of admin groups
- `groupSearchBaseDN`: group search root
- `groupSearchFilter`: default `(member={{dn}})`
- `groupNameAttribute`: default `cn`
- `groupMemberAttribute`: default `member`

## TLS and Certificate Validation

- Set `useTLS=true` for LDAPS deployments.
- Keep `STRICT_TLS=true` in production so LDAP server certificates are verified.
- Only disable strict TLS in isolated troubleshooting scenarios.

## Timeout Tuning

Provider timeout fields:

- `connectionTimeoutMs` (default `10000`)
- `searchTimeoutMs` (default `10000`)

Increase values for high-latency links or large directory trees.

## Validation Workflow

1. Save provider settings.
2. Run **Test Connection**.
3. Run **Test Users** and verify:
   - expected users are discovered
   - usernames are unique and deduplicated
   - admin candidate mapping behaves as expected
4. Perform an end-to-end login test with a non-admin and admin user.

## Troubleshooting

- **`ECONNREFUSED`**: LDAP host/port unreachable.
- **`INVALID_CREDENTIALS`**: incorrect bind credentials.
- **No users found**: verify `baseDN` and `userSearchFilter`.
- **Admin role missing**: verify `adminGroupDNs` and group search fields.
- **TLS handshake failure**: verify LDAP certificate chain and `STRICT_TLS` policy.
