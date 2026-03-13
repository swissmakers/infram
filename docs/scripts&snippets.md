# Scripts & Snippets

Infram classifies automation files by extension, not folder structure. This supports flexible repository layouts while preserving predictable behavior.

## Scripts vs Snippets

- **Scripts**: executable automation files intended for full task execution.
- **Snippets**: quick command fragments for interactive terminal use.

## Metadata Header

Use comment tags at the top of each file:

```sh
# @name: Largest files
# @description: Show the ten largest files on the target system.
# @os: Ubuntu, Debian, Rocky Linux
```

## Supported File Extensions

- **Snippets**: `.snippet`, `.txt`, `.cmd`
- **Scripts**: `.sh`, `.bash`, `.zsh`, `.fish`, `.ps1`

## Supported Metadata Tags

| Tag | Purpose |
|---|---|
| `@name` | Display name in UI |
| `@description` | Functional description |
| `@os` | Comma-separated OS filter |

## Supported `@os` Values

Use these exact values:

`Ubuntu`, `Debian`, `Alpine Linux`, `Fedora`, `CentOS`, `Red Hat`, `Rocky Linux`, `AlmaLinux`, `openSUSE`, `Arch Linux`, `Manjaro`, `Gentoo`, `NixOS`, `Proxmox VE`

If `@os` is omitted, the entry is shown for all systems.

## Repository Layout Example

```text
automation-repo/
├─ snippets/
│  ├─ update-packages.snippet
│  └─ check-disk.txt
└─ scripts/
   ├─ rotate-logs.sh
   └─ backup-db.sh
```

## Quality Guidelines

- Keep commands idempotent where possible.
- Include explicit error handling in scripts.
- Avoid interactive prompts unless required.
- Document destructive actions clearly in `@description`.

## Validation Checklist

- Header includes `@name` and `@description`.
- Extension matches intended behavior (script vs snippet).
- `@os` values are valid and spelled exactly.
- Script executes successfully in a non-production environment first.

## Advanced Interactivity

For guided prompts, confirmations, progress markers, and result summaries, see [Scripting Variables & Directives](/ScriptingVariables).
