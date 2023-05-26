/* eslint-env jest */
'use strict';

const path = require('path');
const NativeScriptDotenv = require('../src');
const { runWebpackWithPluginConfig, setupBeforeAndAfter, webpackConfig } = require('./spec.common');

describe('NativeScriptBundlePlugin', () => {

  setupBeforeAndAfter(webpackConfig);

  it('should stop webpack if no platform is specified', done => {
    const badWebpackConfig = () => {
      runWebpackWithPluginConfig();
    }
    expect(badWebpackConfig).toThrow('No Platform Specified');
    done();
  });

  it('should stop webpack given an invalid semver version code', done => {
    const badWebpackConfig = () => {
      runWebpackWithPluginConfig({
        isIOS: true,
        dotenvPath: path.resolve(webpackConfig.output.path, '.env.invalid_semver')
      });
    }
    expect(badWebpackConfig).toThrow('Invalid Version Code');
    done();
  });

  it('writes the correct name and version properties to package.json file', done => {

    runWebpackWithPluginConfig({
      isIOS: true,
    },
    (err, stats) => {
      expect(err).toBeFalsy();
      const _package = require(path.resolve(webpackConfig.output.path, 'package.json'));
      expect(_package).toHaveProperty('name', process.env[NativeScriptDotenv.DotenvVariableMap.BUNDLE_ID]);
      expect(_package).toHaveProperty('version', process.env[NativeScriptDotenv.DotenvVariableMap.BUNDLE_VERSION]);
      done();
    });
  });

});
