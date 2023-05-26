# NativeScript Dotenv Plugin

_Developed by Ontrack!_

## Installation

`npm i -D ontrackms/nativescript-dotenv`

### Usage

```javascript
// webpack.config.js
const webpack = require("@nativescript/webpack");
const NativeScriptDotenv = require("@ontrackms/nativescript-dotenv");

module.exports = (env) => {
  webpack.init(env);
  
  NativeScriptDotenv.init(webpack);
  
  return webpack.resolveConfig();
};
```

### Configuration

```.env
NATIVESCRIPT_BUNDLE_ID=com.corp.app.test
NATIVESCRIPT_BUNDLE_VERSION=3.2.1
NATIVESCRIPT_APPLE_TEAM_ID=ASDFG1234
```
