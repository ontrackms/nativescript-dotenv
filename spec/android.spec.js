/* eslint-env jest */
'use strict';

const fs = require('fs');
const path = require('path');
const semver = require('semver-parser/modules/semver');
const {
  appResourcesPath,
  runWebpackWithPluginConfig,
  setupBeforeAndAfter,
  webpackConfig
} = require('./spec.common');

const NativeScriptDotenv = require('../src');

describe('NativeScriptBundlePlugin for Android', () => {

  setupBeforeAndAfter(webpackConfig);

  it('writes the correct version codes to AndroidManifest.xml file', done => {

    runWebpackWithPluginConfig({
      isAndroid: true,
    },
    (err, stats) => {
      expect(err).toBeFalsy();
      const fileContent = fs.readFileSync(path.resolve(appResourcesPath, 'Android', 'src', 'main', 'AndroidManifest.xml'), 'utf-8');
      const semverDefinition = semver.parseSemVer(process.env[NativeScriptDotenv.DotenvVariableMap.BUNDLE_VERSION]);
      // @todo refactor these templates
      const versionCode = `${semverDefinition.major}${semverDefinition.minor}${semverDefinition.patch}${semverDefinition.build || 1}`;
      const versionName = `${semverDefinition.major}.${semverDefinition.minor}.${semverDefinition.patch}`;
      const versionCodeMatch = fileContent.match(/versionCode="(.*?)"/);
      expect(versionCodeMatch).toHaveLength(2);
      expect(versionCodeMatch).toContain(versionCode);
      const versionNameMatch = fileContent.match(/versionName="(.*?)"/)
      expect(versionNameMatch).toHaveLength(2);
      expect(versionNameMatch).toContain(versionName);
      done();
    });
  });

  it('should stop webpack if the version code exceeds the limit for Android', done => {
    const badWebpackConfig = () => {
      runWebpackWithPluginConfig({
        isAndroid: true,
        dotenvPath: path.resolve(webpackConfig.output.path, '.env.android_limit_exceeds')
      });
    }
    expect(badWebpackConfig).toThrow('Android versionCode exceeds ANDROID_VERSION_CODE_MAX');
    done();
  });

});
