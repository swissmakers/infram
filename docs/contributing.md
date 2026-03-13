# Contributing to Infram

This guide defines the expected workflow for code and documentation contributions.

## Prerequisites

- [Node.js](https://nodejs.org/en/download/) 18+
- [Yarn](https://yarnpkg.com/getting-started/install)
- [Git](https://git-scm.com/downloads)

## Local Setup

```sh
git clone https://github.com/swissmakers/infra-manager.git
cd infra-manager
yarn install
cd client && yarn install && cd ..
```

## Development Commands

```sh
yarn dev
```

Documentation development:

```sh
yarn docs:dev
```

## Contribution Workflow

1. Fork repository and create a focused branch:
   ```sh
   git checkout -b feature/<short-description>
   ```
2. Implement your changes with clear scope.
3. Validate locally:
   - application behavior
   - docs rendering (if docs changed)
4. Commit with descriptive messages.
5. Open a pull request that includes:
   - change purpose
   - validation performed
   - compatibility or migration impact (if applicable)

## Quality Guidelines

- Keep pull requests small and reviewable.
- Preserve existing behavior unless change is intentional.
- Update related documentation alongside functional changes.
- Avoid introducing unnecessary dependencies.

## Documentation Contributions

When updating docs:

- prefer production-safe defaults
- include verification and troubleshooting steps
- use explicit configuration paths/values instead of placeholders where feasible

## Security-Related Contributions

Run the security helper targets when relevant:

```sh
make security-update
make security-audit
make security-all
make security-sbom
```
