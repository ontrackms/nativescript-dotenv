/* eslint-env jest */
'use strict';

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { appResourcesPath, runWebpackWithPluginConfig, setupBeforeAndAfter, webpackConfig } = require('./spec.common');
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

  it('should stop webpack if instantiated with no options at all', done => {
    const badWebpackConfig = () => {
      new NativeScriptDotEnvPlugin();
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

  it('does not crash when NATIVESCRIPT_BUNDLE_VERSION is not set', done => {
    const bundleVersionKey = NativeScriptDotEnvPlugin.EnvironmentVariableMap.BundleVersion;
    const originalBundleVersion = process.env[bundleVersionKey];
    delete process.env[bundleVersionKey];

    runWebpackWithPluginConfig({
      isIOS: true,
      dotenvPath: path.resolve(webpackConfig.output.path, '.env.no_bundle_version')
    },
    (err) => {
      if (originalBundleVersion === undefined) {
        delete process.env[bundleVersionKey];
      } else {
        process.env[bundleVersionKey] = originalBundleVersion;
      }
      expect(err).toBeFalsy();
      done();
    });
  });

  it('honours an explicit options.semver even when the env var is not set', done => {
    const bundleVersionKey = NativeScriptDotEnvPlugin.EnvironmentVariableMap.BundleVersion;
    const originalBundleVersion = process.env[bundleVersionKey];
    delete process.env[bundleVersionKey];

    runWebpackWithPluginConfig({
      isIOS: true,
      dotenvPath: path.resolve(webpackConfig.output.path, '.env.no_bundle_version'),
      semver: '9.9.9',
    },
    (err) => {
      if (originalBundleVersion === undefined) {
        delete process.env[bundleVersionKey];
      } else {
        process.env[bundleVersionKey] = originalBundleVersion;
      }
      expect(err).toBeFalsy();
      // read directly rather than require(), which would return a cached
      // module for this path from an earlier test's version of the file
      const _package = JSON.parse(fs.readFileSync(path.resolve(webpackConfig.output.path, 'package.json'), 'utf-8'));
      expect(_package).toHaveProperty('version', '9.9.9');
      done();
    });
  });

  it('does not rename package.json when NATIVESCRIPT_BUNDLE_ID is not set', done => {
    const bundleIdKey = NativeScriptDotEnvPlugin.EnvironmentVariableMap.BundleID;
    const originalBundleId = process.env[bundleIdKey];
    delete process.env[bundleIdKey];

    const packageJsonPath = path.resolve(webpackConfig.output.path, 'package.json');
    const nameBefore = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')).name;

    runWebpackWithPluginConfig({
      isIOS: true,
      dotenvPath: path.resolve(webpackConfig.output.path, '.env.no_bundle_id')
    },
    (err) => {
      if (originalBundleId === undefined) {
        delete process.env[bundleIdKey];
      } else {
        process.env[bundleIdKey] = originalBundleId;
      }
      expect(err).toBeFalsy();
      const nameAfter = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')).name;
      expect(nameAfter).toEqual(nameBefore);
      done();
    });
  });

  it('does not rewrite build.xcconfig when NATIVESCRIPT_APPLE_TEAM_ID is not set', done => {
    const teamIdKey = NativeScriptDotEnvPlugin.EnvironmentVariableMap.AppleTeamID;
    const originalTeamId = process.env[teamIdKey];
    delete process.env[teamIdKey];

    const xcconfigPath = path.resolve(webpackConfig.output.path, appResourcesPath, 'iOS', 'build.xcconfig');
    const xcconfigBefore = fs.readFileSync(xcconfigPath, 'utf-8');

    runWebpackWithPluginConfig({
      isIOS: true,
      dotenvPath: path.resolve(webpackConfig.output.path, '.env.no_apple_team_id')
    },
    (err) => {
      if (originalTeamId === undefined) {
        delete process.env[teamIdKey];
      } else {
        process.env[teamIdKey] = originalTeamId;
      }
      expect(err).toBeFalsy();
      const xcconfigAfter = fs.readFileSync(xcconfigPath, 'utf-8');
      expect(xcconfigAfter).toEqual(xcconfigBefore);
      done();
    });
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

  describe('verbose logging', () => {
    const originalCI = process.env.CI;
    let tableSpy;

    beforeEach(() => {
      tableSpy = jest.spyOn(console, 'table').mockImplementation(() => {});
    });

    afterEach(() => {
      tableSpy.mockRestore();
      if (originalCI === undefined) {
        delete process.env.CI;
      } else {
        process.env.CI = originalCI;
      }
    });

    it('logs the parsed dotenv values by default (local build)', done => {
      delete process.env.CI;
      // instantiated directly rather than via runWebpackWithPluginConfig,
      // since that helper hardcodes verbose:false to quiet other tests'
      // output, which would mask the plugin's own default here
      new NativeScriptDotEnvPlugin({
        appResourcesPath,
        isIOS: true,
        dotenvPath: path.resolve(webpackConfig.output.path, '.env'),
        projectRoot: webpackConfig.output.path,
      });
      expect(tableSpy).toHaveBeenCalled();
      done();
    });

    it('does not log the parsed dotenv values on CI/cloud builds', done => {
      process.env.CI = 'true';
      // instantiated directly (see note above) so this actually exercises
      // the plugin's own CI-detection, rather than the harness's override
      new NativeScriptDotEnvPlugin({
        appResourcesPath,
        isIOS: true,
        dotenvPath: path.resolve(webpackConfig.output.path, '.env'),
        projectRoot: webpackConfig.output.path,
      });
      expect(tableSpy).not.toHaveBeenCalled();
      done();
    });

    it('honours an explicit verbose option even on CI/cloud builds', done => {
      process.env.CI = 'true';
      runWebpackWithPluginConfig({
        isIOS: true,
        verbose: true,
      },
      (err) => {
        expect(err).toBeFalsy();
        expect(tableSpy).toHaveBeenCalled();
        done();
      });
    });
  });

  it('does not force dotenv to override existing env vars outside of test mode', done => {
    const originalNodeEnv = process.env.NODE_ENV;
    const configSpy = jest.spyOn(dotenv, 'config');
    process.env.NODE_ENV = 'production';

    new NativeScriptDotEnvPlugin({
      appResourcesPath,
      isIOS: true,
      dotenvPath: path.resolve(webpackConfig.output.path, '.env'),
      projectRoot: webpackConfig.output.path,
      verbose: false,
    });

    expect(configSpy).toHaveBeenCalledWith(expect.objectContaining({ override: false }));

    configSpy.mockRestore();
    process.env.NODE_ENV = originalNodeEnv;
    done();
  });

});
