# Licensing and Third-Party Notices

## Project License

Infram (infra-manager) is distributed under the **GNU General Public License v3.0 (GPL-3.0)**.
The full license text is provided in the repository root at `LICENSE`.

## Scope of GPL-3.0 in This Repository

- The original project code maintained in this repository is licensed under GPL-3.0.
- Modifications made in this fork are released under GPL-3.0.
- Distribution of modified binaries/images must follow GPL-3.0 obligations, including source availability requirements.

## Third-Party Components and Their Licenses

This repository includes third-party components that keep their original licenses.
These licenses remain valid for those specific components and do not get replaced by the project root GPL file.

Notable examples:

- Apache Guacamole sources under `vendor/guacamole-server/` and `vendor/guacamole-client/` (Apache-2.0).
- Guacamole-derived connection library files:
  - `server/lib/ClientConnection.js`
  - `server/lib/GuacdClient.js`
- Bundled fonts/assets with their own licenses (for example Apache-2.0 or MIT in their respective license files).

## NOTICE File

The repository-level `NOTICE` file documents key third-party attribution and licensing obligations for included components.
When adding, replacing, or updating third-party code, keep `NOTICE` and related attributions up to date.

## Compliance Guidance

When contributing:

- Keep existing copyright headers on third-party files.
- Do not remove or alter third-party license files in vendored directories.
- Add attribution and license metadata for newly introduced third-party code/assets.
- Prefer adding explicit references in `NOTICE` when redistribution obligations apply.

If you are packaging Infram for internal or external distribution, review:

- `LICENSE` (GPL-3.0 terms),
- `NOTICE` (third-party attributions),
- license files shipped with vendored code and bundled assets.
