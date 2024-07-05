# NativeScript Dotenv Plugin
![NPM Version](https://img.shields.io/npm/v/%40ontrackms%2Fnativescript-dotenv)

_Developed by Ontrack!_

## Installation

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

```.env
NATIVESCRIPT_BUNDLE_ID=com.corp.app.test
NATIVESCRIPT_BUNDLE_VERSION=3.2.1
NATIVESCRIPT_APPLE_TEAM_ID=ASDFG1234
```
