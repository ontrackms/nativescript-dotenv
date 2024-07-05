/* eslint-env jest */
'use strict';

const path = require('path');
const { runWebpackWithPluginConfig, setupBeforeAndAfter, webpackConfig } = require('./spec.common');
const {
  NativeScriptDotEnvPlugin,
  ValidationError,
  ResourceRequiredError
} = require('@ontrackms/nativescript-dotenv');

describe('NativeScriptDotEnvPlugin', () => {

  setupBeforeAndAfter(webpackConfig);

  it('should stop webpack if no platform is specified', done => {
    const badWebpackConfig = () => {
      runWebpackWithPluginConfig();
    }
    expect(badWebpackConfig).toThrow(ValidationError);
    done();
  });

  it('should stop webpack if no dotenv file is not found', done => {
    const badWebpackConfig = () => {
      runWebpackWithPluginConfig({
        isIOS: true,
        dotenvPath: path.resolve(webpackConfig.output.path, '.env.404')
      });
    }
    expect(badWebpackConfig).toThrow(ResourceRequiredError);
    done();
  });

  it('should stop webpack given an invalid semver version code', done => {
    const badWebpackConfig = () => {
      runWebpackWithPluginConfig({
        isIOS: true,
        dotenvPath: path.resolve(webpackConfig.output.path, '.env.invalid_semver')
      });
    }
    expect(badWebpackConfig).toThrow(ValidationError);
    done();
  });

  it('writes the correct name and version properties to package.json file', done => {

    runWebpackWithPluginConfig({
      isIOS: true,
    },
    (err, stats) => {
      expect(err).toBeFalsy();
      const _package = require(path.resolve(webpackConfig.output.path, 'package.json'));
      expect(_package).toHaveProperty('name', process.env[NativeScriptDotEnvPlugin.EnvironmentVariableMap.BundleID]);
      expect(_package).toHaveProperty('version', process.env[NativeScriptDotEnvPlugin.EnvironmentVariableMap.BundleVersion]);
      done();
    });
  });

});
