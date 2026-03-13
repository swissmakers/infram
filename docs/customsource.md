# Custom Sources

Custom Sources allow Infram to synchronize scripts and snippets from external Git repositories.

## Typical Use Cases

- Shared operational command libraries across teams
- Environment-specific runbooks (prod/stage/dev)
- Centralized script governance with pull-request workflows

## Enable Source Sync

Source synchronization is controlled by:

- `ENABLE_SOURCE_SYNC=true` to enable periodic sync worker
- `ENABLE_SOURCE_SYNC=false` to disable sync worker (default)

## Add a Source

1. Open **Settings -> Sources**.
2. Select **Add Source**.
3. Provide:
   - display name
   - repository URL
4. Save and trigger initial sync.

## Operational Best Practices

- Use read-only deploy keys or tokens where possible.
- Keep script repositories private when containing internal logic.
- Separate production and non-production sources.
- Require code review on script/snippet changes.
- Keep scripts idempotent and rollback-aware.

## Validation Checklist

- Source status shows healthy in UI.
- Expected scripts appear in the **Scripts** tab.
- Expected snippets appear in terminal/snippet picker.
- Metadata tags render correctly (`@name`, `@description`, `@os`).

## Troubleshooting

- **No sync activity**: verify `ENABLE_SOURCE_SYNC=true`.
- **Auth failures**: check repository credentials/keys.
- **Unexpected content**: review default branch and source URL.

## Related

- [Scripts & Snippets](/scripts&snippets)
- [Scripting Variables & Directives](/ScriptingVariables)
