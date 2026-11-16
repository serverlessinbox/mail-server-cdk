# pack-install-synth

Packs the published packages, installs them into an empty project and requires the example consumer stack
synthesized there to produce the same CloudFormation template as the same stack synthesized from source.
It is the check that a customer's install of the packages matches what the repository builds.

It runs as the `pack-install-synth` job of the pull-request workflow, and developers run it before they change how a package is packed or
how a helper is shared between its bundled copies.

## Usage

```
yarn pack-install-synth
```

Run it from the repository root. It takes no arguments.

## What it does

1. Synthesizes the example stack from the packages in this repository (`mailbox` and `mailbox-cognito`).
2. Packs `@serverlessinbox/mail-server` and then `@serverlessinbox/mail-server-cognito` with `yarn workspace <name> pack`,
   which runs each package's `prepack` chain.
3. Installs the two tarballs into a temporary project. The packages' other peers are pinned to the versions
   the repository's `yarn.lock` resolves.
4. Synthesizes the same stack in that project and compares the two templates.

Both synthesis runs freeze `Date.now` and `Math.random`, so the only difference the comparison can report is a
real one. The templates are compared as they are; nothing is normalized before the comparison.

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Every check passed: the packed template is identical to the source template, the packed synthesis ran, and one copy of `aws-cdk-lib` and one copy of `constructs` are installed. The temporary folder is removed. |
| `1` | A check failed. The failing parts are printed: the packed synthesis error output (the runner's stderr), the installed copies, or the differing template entries and property paths. The temporary folder is kept and printed as `Kept: <directory>`. |
| `2` | The check could not run, for example packing or installing failed. The error is printed on stderr. |

## Requirements

- Network access to the npm registry, for the install into the temporary project.

## Side effects

The packing writes the packages' gitignored build outputs (`lib`, `dist`, `LICENSE`). The command also creates a
temporary folder under the operating system's temp directory and removes it on exit 0.
