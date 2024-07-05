# NativeScript Dotenv Plugin
[![NPM](https://img.shields.io/npm/v/%40ontrackms%2Fnativescript-dotenv)][0]
[![GitHub License](https://img.shields.io/github/license/ontrackms/nativescript-dotenv)][1]
[![Static Badge](https://img.shields.io/badge/Ontrack-The_Smarter_Works_Management_Solution-B1BF21)][2]

Adds common NativeScript configurations to Dotenv

### Installation

`npm i -D @ontrackms/nativescript-dotenv`

### Usage
Add the following lines to the exported function in `webpack.config.js`

```javascript
const { NativeScriptDotEnvPlugin } = require("@ontrackms/nativescript-dotenv");

module.exports = (env) => {
  webpack.init(env);
  // must be called after webpack.init
  NativeScriptDotEnvPlugin.init(webpack);
  return webpack.resolveConfig();
};
```

### Configuration
The following environment variables are supported in the dotenv (.env) file.

[0]: https://www.npmjs.com/package/@ontrackms/nativescript-dotenv
[1]: https://github.com/ontrackms/nativescript-dotenv/blob/main/LICENSE
[2]: https://ontrackms.com

```.env
NATIVESCRIPT_BUNDLE_ID=com.corp.app.test
NATIVESCRIPT_BUNDLE_VERSION=3.2.1
NATIVESCRIPT_APPLE_TEAM_ID=ASDFG1234
```
