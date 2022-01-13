# ORGiD DID Resolver mono repository

## Documentation

[https://windingtree.github.io/org.id-sdk/](https://windingtree.github.io/org.id-sdk/)

## Setup

When you adding dependencies to your packages it is recommended to run `bootstrap` command from the root of the repository. This command will update packages dependencies.

```bash
yarn install
yarn bootstrap
yarn build
```

## Testing and linting

```bash
yarn lint
yarn test
```

## Maintenance

New repository version setup (according to the SDK stake should be chosen custom `prerelease` or `major` release version type from the `lerna` CLI dialog):

Prerelease:

```bash
npx lerna version --conventional-commits --conventional-prerelease --preid beta --sign-git-commit --sign-git-tag --yes
```

Major release:

```bash
npx lerna version --conventional-commits --conventional-graduate --sign-git-commit --sign-git-tag --yes
```

Publishing of the updated packages:

```bash
yarn build
npx lerna publish from-git
```
