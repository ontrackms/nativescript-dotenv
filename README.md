<div align="center">
  
  # NativeScript Dotenv Plugin

  [![Static Badge](https://img.shields.io/badge/Ontrack-The_Smarter_Works_Management_Solution-B1BF21)][2]

  [![NPM](https://img.shields.io/npm/v/%40ontrackms%2Fnativescript-dotenv)][0]
  ![Test Workflow](https://github.com/ontrackms/nativescript-dotenv/actions/workflows/test.yml/badge.svg)
  [![GitHub License](https://img.shields.io/github/license/ontrackms/nativescript-dotenv)][1]

  Adds common NativeScript configurations to Dotenv

</div>

## Contents

- [Installation](#installation)
- [Usage](#usage)
- [Configuration](#configuration)
- [Android versionCode](#android-versioncode)
- [Verbose logging](#verbose-logging)
- [Development](#development)

## Installation

```console
npm i -D @ontrackms/nativescript-dotenv
```

## Usage

Add these lines to the exported function in `webpack.config.js`:

```javascript
const { NativeScriptDotEnvPlugin } = require("@ontrackms/nativescript-dotenv");

module.exports = (env) => {
  webpack.init(env);
  // must be called after webpack.init
  NativeScriptDotEnvPlugin.init(webpack);
  return webpack.resolveConfig();
};
```

## Configuration

All of the following `.env` variables are optional ⚙️ — set only the ones you need.

| Variable | Controls |
| --- | --- |
| `NATIVESCRIPT_BUNDLE_ID` | The app's bundle identifier, written to `package.json`'s `name` field. |
| `NATIVESCRIPT_BUNDLE_VERSION` | A semver string (e.g. `3.2.1`, or `3.2.1+42` for an explicit build number). Written to `package.json`'s `version`, iOS's `CFBundleShortVersionString`/`CFBundleVersion`, and Android's `versionName` (see [Android versionCode](#android-versioncode) below for `versionCode`). |
| `NATIVESCRIPT_APPLE_TEAM_ID` | The iOS code-signing team, written to `DEVELOPMENT_TEAM` in `build.xcconfig`. |

```.env
NATIVESCRIPT_BUNDLE_ID=com.corp.app.test
NATIVESCRIPT_BUNDLE_VERSION=3.2.1
NATIVESCRIPT_APPLE_TEAM_ID=ASDFG1234
```

## Android versionCode

Android's `versionCode` (in `App_Resources/Android/src/main/AndroidManifest.xml`) is auto-incremented on **release** builds only — `ns build android --release` or `ns run android --release` — which set webpack's `env.production` flag.

Regular dev builds (`ns run android` without `--release`) leave `AndroidManifest.xml` untouched, so `versionCode` doesn't creep up on every rebuild.

## Verbose logging

By default, the plugin prints the parsed `.env` values to the console — handy while developing locally.

Since a `.env` file may hold secrets unrelated to this plugin, that logging is automatically disabled on CI/cloud builds, detected via the `CI` environment variable set by virtually every provider (GitHub Actions, GitLab CI, Bitrise, App Center, Codemagic, Travis, etc.).

Override this explicitly with the `verbose` option:

```javascript
NativeScriptDotEnvPlugin.init(webpack, { verbose: false });
```

## Development

### Setup

```console
git clone git@github.com:ontrackms/nativescript-dotenv.git
cd nativescript-dotenv
nvm use   # installs/selects the Node version pinned in .nvmrc
npm install
```

### Build & test

```console
npm run build   # compiles src/ (TypeScript) to dist/, which is what gets published
npm test        # runs the Jest suite, including real @nativescript/webpack builds against spec/fixtures
```

`jest.config.ts` enforces 100% coverage on `plugin.ts`/`error.ts` — a change that drops it fails both locally and in CI. CI ([`.github/workflows/test.yml`](.github/workflows/test.yml)) runs the same `npm test` on Node 20.x, 22.x, and 24.x.

### Publishing

1. Bump `version` in `package.json` ([semver](https://semver.org)).
2. Commit and tag it:
   ```console
   git commit -am "1.x.y"
   git tag v1.x.y
   git push && git push --tags
   ```
3. Build and publish:
   ```console
   npm run build
   npm publish
   ```
   `@ontrackms/nativescript-dotenv` is a public scoped package — you'll need publish access to the `@ontrackms` npm org (check with `npm whoami`) and to be logged in via `npm login`.

[0]: https://www.npmjs.com/package/@ontrackms/nativescript-dotenv
[1]: https://github.com/ontrackms/nativescript-dotenv?tab=MIT-1-ov-file
[2]: https://ontrackms.com
