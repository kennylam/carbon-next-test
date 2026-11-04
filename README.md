# carbon-next-test

This repoi installs Carbon packages published from the
[next](https://github.com/carbon-design-system/carbon/tree/next)
and uses them the same way consumers do: in fresh installs, real bundlers, server
rendering, Sass builds, and browsers. The goal is to catch problems that only appear in
the published packages, such as missing files, mismatched internal versions,
broken entry points, or builds that fail in a framework.

Component behavior, accessibility, and visual regressions are tested upstream.
This repo does not repeat those tests.

## What runs

| Check                    | Where                         | Catches                                                                                                                                                                                                                                                         |
| ------------------------ | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Package contract         | `tests/contract`              | Version mismatches between packages in a release, duplicate installs, files missing from a package, `publint` errors, entry points Node cannot resolve or load                                                                                                  |
| Public API diff          | `tests/contract/src/api.*`    | Exports, custom elements, attributes, and Sass modules removed since the previous release                                                                                                                                                                       |
| v12 defaults             | `tests/contract/src/v12.*`    | v12 enabled by default in JavaScript, React, and Sass; components migrated from `@carbon/ibm-products`; Temporal polyfill; manifest format. Each check tied to a section of `docs/migration/v12.md` only runs once that section exists at the release's git tag |
| React + Vite             | `apps/react-vite`             | Strict TypeScript, production build, jsdom unit tests, browser smoke tests. Also runs against React 18                                                                                                                                                          |
| React + Next.js          | `apps/react-nextjs`           | App Router build, server rendering, hydration                                                                                                                                                                                                                   |
| Web Components + Vite    | `apps/web-components-vite`    | TypeScript, production build, element registration, browser smoke tests                                                                                                                                                                                         |
| Web Components + webpack | `apps/web-components-webpack` | webpack 5 with `sass-loader`, browser smoke tests                                                                                                                                                                                                               |
| Sass                     | `apps/styles-sass`            | `@carbon/styles`, `@carbon/react`, `@carbon/elements`, grid, type, and every theme compile; custom `$prefix` is applied everywhere; Sass deprecations are reported                                                                                              |

## Running locally

Requires the Node version in `.nvmrc` and Corepack.

```sh
corepack enable
yarn use-carbon --tag v12-alpha   # or --ref v12.0.0-alpha.5
yarn install
yarn test                         # contract, builds, unit, end-to-end; stops at the first failure
```

Run one part at a time with `yarn test:contract`, `yarn build`,
`yarn test:unit`, or `yarn test:e2e`. The end-to-end tests need
`yarn workspace @carbon-next-test/e2e playwright install chromium` once, and
`APPS=react-vite,web-components-vite yarn test:e2e` limits them to some apps.

## Choosing what to test

`scripts/use-carbon.mjs` writes `carbon-release.json` and the Yarn catalog in
`.yarnrc.yml`. Every workspace depends on Carbon through `catalog:`, so all
packages come from one release.

| Option                  | Tests                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------ |
| `--tag v12-alpha`       | The version each package has under an npm dist-tag (default)                         |
| `--ref v12.0.0-alpha.5` | The versions in each `package.json` at an upstream git ref, which must all be on npm |
| `--tarballs <dir>`      | Unpublished `npm pack` output, for testing commits before they are released          |
| `--release <file>`      | A `carbon-release.json` from an earlier run, so CI jobs share one set                |
| `--react 18`            | React 18 instead of 19                                                               |

Only direct dependencies are pinned. Each package's own `@carbon/*` dependencies
resolve from the ranges it declares, as they would for a consumer, so a stale
range shows up as a duplicate install instead of being hidden. In `--tarballs`
mode, resolutions are required to reach unpublished versions, so the contract
tests check the declared ranges directly.

The packages under test are listed in `carbon.config.json`.

## Public API removals

The API diff fails when a release removes an export, custom element, attribute,
or Sass module that the previous release in the same prerelease line had.
Removals are expected in a major release, so acknowledge intended ones in
`api-changes.json`:

```json
{
  "@carbon/react": {
    "2.0.0-alpha.6": ["OldComponent"]
  }
}
```

Each run writes the full diff, including additions, to `reports/api-diff.md` and
the workflow summary.

## CI

`.github/workflows/test.yml` runs on:

- `repository_dispatch` with type `carbon-published`, sent by upstream after a
  release (see below)
- a schedule every 6 hours as a fallback, which skips a release set that already
  passed
- manual dispatch, with a dist-tag or git ref
- pull requests and pushes to this repo

Secrets:

| Secret              | Used for                                                                                                          |
| ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `CARBON_REPO_TOKEN` | Optional. Reports a commit status on carbon-design-system/carbon and downloads unpublished tarballs from its runs |
| `SLACK_WEBHOOK_URL` | Optional. Posts failures to Slack                                                                                 |

## Connecting upstream

### After each release

Add these steps to the end of the `build` job in upstream
`.github/workflows/release.yml`, after `Publish packages`. They need the GitHub
App already used upstream to be installed on this repository.

```yaml
- name: Generate token for carbon-next-test
  if: env.DIST_TAG == 'v12-alpha'
  id: next_test_token
  uses: actions/create-github-app-token@64ab729a6294000f5aa4a4bc0b73d1f32bc45510 # v3.3.0
  with:
    app-id: ${{ secrets.APP_ID }}
    private-key: ${{ secrets.APP_PRIVATE_KEY }}
    repositories: carbon-next-test

- name: Test the published packages
  if: env.DIST_TAG == 'v12-alpha'
  env:
    GH_TOKEN: ${{ steps.next_test_token.outputs.token }}
  run: |
    gh api repos/carbon-design-system/carbon-next-test/dispatches \
      -f event_type=carbon-published \
      -f "client_payload[ref]=${{ github.ref_name }}" \
      -f "client_payload[sha]=${{ github.sha }}"
```

### On every commit

If `next` starts publishing on every commit, the same dispatch works unchanged.
To test commits without publishing them, a workflow on pushes to `next` can
upload tarballs and pass its run ID instead. This runs alongside upstream CI and
does not add time to it:

```yaml
- run: yarn build
- run: |
    mkdir carbon-tarballs
    yarn workspaces foreach --all --no-private \
      exec npm pack --pack-destination "$GITHUB_WORKSPACE/carbon-tarballs"
- uses: actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9 # v7.0.2
  with:
    name: carbon-tarballs
    path: carbon-tarballs
- env:
    GH_TOKEN: ${{ steps.next_test_token.outputs.token }}
  run: |
    gh api repos/carbon-design-system/carbon-next-test/dispatches \
      -f event_type=carbon-published \
      -f "client_payload[ref]=${{ github.sha }}" \
      -f "client_payload[sha]=${{ github.sha }}" \
      -f "client_payload[run_id]=${{ github.run_id }}"
```

## Consumer workarounds in the apps

These match v11 behavior and are configured the way a consumer would, so they do
not hide new problems:

- **Fonts with Next.js.** Turbopack cannot resolve the default
  `$font-path: '~@ibm/plex'`, so `apps/react-nextjs` sets
  `$use-akamai-cdn: true`. Vite leaves the URLs unresolved with a warning, and
  the end-to-end tests ignore font requests.
- **jsdom.** `apps/react-vite/src/setup-tests.ts` stubs `ResizeObserver`,
  `IntersectionObserver`, and `matchMedia`, which jsdom lacks and several
  components call when they mount.
- **Custom `$prefix`.** `--cds-grid-*`, `--cds-layer`, and
  `--cds-ai-border-start`/`-end` ignore `$prefix` in v11 too. The Sass build
  only fails on other names.
- **`skipLibCheck`.** The TypeScript apps use `skipLibCheck: true`, as most
  projects do. The `@carbon/react` declarations import `prop-types` without a
  dependency on `@types/prop-types`.
