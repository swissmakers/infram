# Scripting Variables & Directives

Use `@INFRAM:*` directives to make scripts interactive, safer, and easier to operate.

## Directive Syntax Reference

| Directive | Purpose | Example |
|---|---|---|
| `@INFRAM:STEP "text"` | Mark logical execution step | `@INFRAM:STEP "Validate prerequisites"` |
| `@INFRAM:INPUT <var> "prompt" "default"` | Prompt for free-text input | `@INFRAM:INPUT HOST "Target host" "localhost"` |
| `@INFRAM:SELECT <var> "prompt" "A" "B"` | Prompt for fixed options | `@INFRAM:SELECT MODE "Deploy mode" "Rolling" "BlueGreen"` |
| `@INFRAM:CONFIRM "text"` | Require explicit user confirmation | `@INFRAM:CONFIRM "Continue with restart?"` |
| `@INFRAM:INFO "text"` | Emit informational message | `@INFRAM:INFO "Applying configuration"` |
| `@INFRAM:WARN "text"` | Emit warning message | `@INFRAM:WARN "Low disk space"` |
| `@INFRAM:SUCCESS "text"` | Mark successful milestone | `@INFRAM:SUCCESS "Backup completed"` |
| `@INFRAM:PROGRESS <0-100\|$var>` | Update progress indicator | `@INFRAM:PROGRESS 75` |
| `@INFRAM:SUMMARY "title" "k1" "v1" ...` | Show structured key/value summary | `@INFRAM:SUMMARY "Result" "Changed" "14"` |
| `@INFRAM:TABLE "title" "h1" "h2" "r1c1" ...` | Render tabular output | `@INFRAM:TABLE "Users" "Name" "Role" "alice" "admin"` |
| `@INFRAM:MSGBOX "title" "message"` | Display message dialog | `@INFRAM:MSGBOX "Completed" "Operation finished"` |

## End-to-End Example

```sh
@INFRAM:STEP "Collect input"
@INFRAM:INPUT HOST "Target host" "localhost"
@INFRAM:SELECT MODE "Deployment mode" "Rolling" "BlueGreen"
@INFRAM:CONFIRM "Continue with deployment?"

@INFRAM:STEP "Deploy"
@INFRAM:INFO "Starting deployment"
@INFRAM:PROGRESS 20
# deployment commands...
@INFRAM:PROGRESS 100
@INFRAM:SUCCESS "Deployment finished"

@INFRAM:SUMMARY "Deployment Summary" "Host" "$HOST" "Mode" "$MODE" "Status" "Success"
```

## Implementation Notes

- Directives are transformed server-side before execution.
- `sudo` commands are automatically adjusted to support password prompts.
- Escape literal colons in directive payloads when needed.

## Best Practices

- Use `STEP` markers in long-running scripts.
- Use `CONFIRM` before destructive operations.
- Prefer `SELECT` over free-text where possible.
- End critical workflows with `SUMMARY` for auditable output.

## Related

- [Scripts & Snippets](/scripts&snippets)
