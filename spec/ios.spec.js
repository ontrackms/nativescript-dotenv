/* eslint-env jest */
'use strict';

const fs = require('fs');
const path = require('path');
const plist = require('plist');
const semver = require('semver-parser');
const { NativeScriptDotEnvPlugin } = require('@ontrackms/nativescript-dotenv');
const {
  appResourcesPath,
  runWebpackWithPluginConfig,
  setupBeforeAndAfter,
  webpackConfig
} = require('./spec.common');

describe('NativeScriptDotEnvPlugin for iOS', () => {
  
  setupBeforeAndAfter(webpackConfig);

  it('writes the correct version codes to iOS Info.plist file', done => {

    runWebpackWithPluginConfig({
      isIOS: true,
    },
    (err, stats) => {
      expect(err).toBeFalsy();
      const semverDefinition = semver.parseSemVer(process.env[NativeScriptDotEnvPlugin.EnvironmentVariableMap.BundleVersion]);
      const plistContent = fs.readFileSync(path.resolve(webpackConfig.output.path, 'App_Resources', 'iOS', 'Info.plist'), 'utf-8');
      const plistDict = plist.parse(plistContent);
      expect(plistDict).toHaveProperty('CFBundleShortVersionString', process.env[NativeScriptDotEnvPlugin.EnvironmentVariableMap.BundleVersion]);
      expect(plistDict).toHaveProperty('CFBundleVersion', String(semverDefinition.build || 1));
      done();
    });
  });

  it('wirte the correct development team to the build.xcconfig file', done => {

    runWebpackWithPluginConfig({
      isIOS: true,
    },
    (err, stats) => {
      expect(err).toBeFalsy();
      const xcconfigString = fs.readFileSync(path.resolve(webpackConfig.output.path, appResourcesPath, 'iOS', 'build.xcconfig'), 'utf-8');
      const matches = xcconfigString.match(/DEVELOPMENT_TEAM\s+=\s+(\w+);?/);
      expect(Array.isArray(matches)).toBe(true);
      expect(matches).toHaveLength(2);
      expect(matches).toContain(process.env[NativeScriptDotEnvPlugin.EnvironmentVariableMap.AppleTeamID]);
      done();
    });
  });

});
