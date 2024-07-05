const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const webpack = require('webpack');

const { NativeScriptDotEnvPlugin } = require('@ontrackms/nativescript-dotenv');

const OUTPUT_DIR = path.resolve(__dirname, 'dist');

const webpackConfig = {
  // mode: 'production',
  context: path.resolve(__dirname, 'fixtures'),
  entry: {
    app: path.join(__dirname, 'fixtures', 'index.js')
  },
  output: {
    path: OUTPUT_DIR,
    filename: 'index.bundle.js'
  }
};

const appResourcesPath = path.resolve(webpackConfig.output.path, 'App_Resources');

function setupBeforeAndAfter(webpackConfig) {
  beforeAll(done => {
    process.on('unhandledRejection', r => console.log(r));

    jest.setTimeout(30000);

    done();
  });

  afterAll(done => {
    clearDistDir(webpackConfig, done);
  });

  beforeEach(done => {
    clearDistDir(webpackConfig,
      copyDistDir.bind(null, webpackConfig, done))
  });
}

function clearDistDir(webpackConfig, callback) {
  fs.rm(webpackConfig.output.path, {
    recursive: true,
    force: true
  }, callback);
}

function copyDistDir(webpackConfig, callback) {
  fs.cp(webpackConfig.context, webpackConfig.output.path, {
    recursive: true
  }, callback);
}

function runWebpackWithPluginConfig(pluginConfig, callback) {
  webpack({
    ...webpackConfig,
    plugins: [
      new NativeScriptDotEnvPlugin({
        appResourcesPath,
        dotenvPath: path.resolve(webpackConfig.output.path, '.env'),
        projectRoot: webpackConfig.output.path,
        ...pluginConfig,
      }),
    ]
  }, callback);
}

module.exports = {
  appResourcesPath,
  runWebpackWithPluginConfig,
  setupBeforeAndAfter,
  webpackConfig,
};
