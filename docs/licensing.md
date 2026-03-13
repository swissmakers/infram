# Licensing and Third-Party Notices

## Project License

Infram (infra-manager) is distributed under **GNU GPL v3.0**.

- Full license text: `LICENSE`
- Third-party attribution and notices: `NOTICE`

## Scope of GPL-3.0 in This Repository

- Project code in this repository is released under GPL-3.0.
- Modifications and redistributed derivatives must satisfy GPL obligations.
- Distribution of binaries/images must preserve source-availability obligations.

## Third-Party Components

Third-party components retain their original licenses and are not relicensed by repository GPL terms.

Notable examples:

- Apache Guacamole sources in `vendor/guacamole-server/` and `vendor/guacamole-client/` (Apache-2.0)
- Guacamole-derived connection files:
  - `server/lib/ClientConnection.js`
  - `server/lib/GuacdClient.js`
- Bundled fonts/assets that include their own license files

## Maintainer and Contributor Guidance

When adding third-party code or assets:

- preserve upstream copyright headers
- preserve original license files
- add required attribution to `NOTICE` when redistribution obligations apply
- avoid copying third-party code without clear license provenance

## Distribution Checklist

If you distribute Infram internally or externally, include:

- `LICENSE`
- `NOTICE`
- third-party license files bundled with vendored code/assets
# Licensing and Third-Party Notices

## Project License

Infram (infra-manager) is distributed under **GNU GPL v3.0**.

- Full license text: `LICENSE`
- Third-party attribution: `NOTICE`

## Scope of GPL-3.0 in This Repository

- Project code in this repository is GPL-3.0.
- Fork modifications are GPL-3.0.
- Redistributed modified binaries/images must satisfy GPL source-availability obligations.

## Third-Party Components and Their Licenses

Third-party components retain their original licenses and are not relicensed by project GPL terms.

Notable examples:

- Apache Guacamole sources under `vendor/guacamole-server/` and `vendor/guacamole-client/` (Apache-2.0).
- Guacamole-derived connection library files:
  - `server/lib/ClientConnection.js`
  - `server/lib/GuacdClient.js`
- Bundled fonts/assets with their own licenses (for example Apache-2.0 or MIT in their respective license files).

## NOTICE File

The repository-level `NOTICE` file tracks key third-party attribution and redistribution obligations.

## Compliance Guidance

When contributing:

- Keep existing copyright headers on third-party files.
- Do not remove or alter third-party license files in vendored directories.
- Add attribution and license metadata for newly introduced third-party code/assets.
- Prefer adding explicit references in `NOTICE` when redistribution obligations apply.

## Operator Distribution Checklist

If you package or distribute Infram internally or externally, review and ship:

- `LICENSE` (GPL-3.0 terms),
- `NOTICE` (third-party attributions),
- license files shipped with vendored code and bundled assets.
