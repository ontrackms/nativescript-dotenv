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

const { NativeScriptDotEnvPlugin, ValidationError, IntegrationError } = require('@ontrackms/nativescript-dotenv');

describe('NativeScriptDotEnvPlugin for Android', () => {

  setupBeforeAndAfter(webpackConfig);

  it('does not modify AndroidManifest.xml file for non-release builds', done => {
    const fileContent = fs.readFileSync(path.resolve(appResourcesPath, 'Android', 'src', 'main', 'AndroidManifest.xml'), 'utf-8');

    runWebpackWithPluginConfig({
      isAndroid: true,
    },
    (err, stats) => {
      expect(err).toBeFalsy();
      const fileContentNew = fs.readFileSync(path.resolve(appResourcesPath, 'Android', 'src', 'main', 'AndroidManifest.xml'), 'utf-8');
      expect(fileContentNew).toEqual(fileContent);
      done();
    });
  });

  it('writes the correct version codes to AndroidManifest.xml file for release builds', done => {
    const fileContent = fs.readFileSync(path.resolve(appResourcesPath, 'Android', 'src', 'main', 'AndroidManifest.xml'), 'utf-8');
    const currentVersionCodeMatch = fileContent.match(/versionCode="(.*?)"/);
    expect(currentVersionCodeMatch).toHaveLength(2);
    expect(currentVersionCodeMatch[1]).toMatch(/^\d+$/);

    runWebpackWithPluginConfig({
      isAndroid: true,
      isRelease: true,
    },
    (err, stats) => {
      expect(err).toBeFalsy();
      const fileContentNew = fs.readFileSync(path.resolve(appResourcesPath, 'Android', 'src', 'main', 'AndroidManifest.xml'), 'utf-8');
      const semverDefinition = semver.parseSemVer(process.env[NativeScriptDotEnvPlugin.EnvironmentVariableMap.BundleVersion]);
      // @todo refactor these templates
      const versionName = `${semverDefinition.major}.${semverDefinition.minor}.${semverDefinition.patch}`;
      const versionCodeMatch = fileContentNew.match(/versionCode="(.*?)"/);
      expect(versionCodeMatch).toHaveLength(2);
      expect(versionCodeMatch[1]).toMatch(/^\d+$/);
      expect(Number(versionCodeMatch[1]) - Number(currentVersionCodeMatch[1])).toEqual(1);
      const versionNameMatch = fileContentNew.match(/versionName="(.*?)"/)
      expect(versionNameMatch).toHaveLength(2);
      expect(versionNameMatch).toContain(versionName);
      done();
    });
  });

  it('fails loudly if AndroidManifest.xml has no versionCode attribute', done => {
    const manifestPath = path.resolve(appResourcesPath, 'Android', 'src', 'main', 'AndroidManifest.xml');
    const original = fs.readFileSync(manifestPath, 'utf-8');
    const withoutVersionCode = original.replace(/\s*versionCode="(.*?)"/, '');
    fs.writeFileSync(manifestPath, withoutVersionCode, 'utf-8');

    runWebpackWithPluginConfig({
      isAndroid: true,
      isRelease: true,
    },
    (err) => {
      expect(err).toBeInstanceOf(IntegrationError);
      done();
    });
  });

  it('fails loudly if AndroidManifest.xml has multiple versionCode attributes', done => {
    const manifestPath = path.resolve(appResourcesPath, 'Android', 'src', 'main', 'AndroidManifest.xml');
    const original = fs.readFileSync(manifestPath, 'utf-8');
    const withDuplicateVersionCode = original.replace('<manifest', '<manifest versionCode="1"');
    fs.writeFileSync(manifestPath, withDuplicateVersionCode, 'utf-8');

    runWebpackWithPluginConfig({
      isAndroid: true,
      isRelease: true,
    },
    (err) => {
      expect(err).toBeInstanceOf(IntegrationError);
      done();
    });
  });

  it('fails loudly if AndroidManifest.xml has no versionName attribute', done => {
    const manifestPath = path.resolve(appResourcesPath, 'Android', 'src', 'main', 'AndroidManifest.xml');
    const original = fs.readFileSync(manifestPath, 'utf-8');
    const withoutVersionName = original.replace(/\s*versionName="(.*?)"/, '');
    fs.writeFileSync(manifestPath, withoutVersionName, 'utf-8');

    runWebpackWithPluginConfig({
      isAndroid: true,
      isRelease: true,
    },
    (err) => {
      expect(err).toBeInstanceOf(IntegrationError);
      done();
    });
  });

  it('fails loudly if AndroidManifest.xml has multiple versionName attributes', done => {
    const manifestPath = path.resolve(appResourcesPath, 'Android', 'src', 'main', 'AndroidManifest.xml');
    const original = fs.readFileSync(manifestPath, 'utf-8');
    const withDuplicateVersionName = original.replace('<manifest', '<manifest versionName="1.0.0"');
    fs.writeFileSync(manifestPath, withDuplicateVersionName, 'utf-8');

    runWebpackWithPluginConfig({
      isAndroid: true,
      isRelease: true,
    },
    (err) => {
      expect(err).toBeInstanceOf(IntegrationError);
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
    expect(badWebpackConfig).toThrow(ValidationError);
    done();
  });

});
