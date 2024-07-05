
import { resolve } from 'path'
import { readFileSync, writeFileSync } from 'fs'
import { isValidSemVer, parseSemVer } from 'semver-parser'
import { build as objectToPlist, parse as plistToObject } from 'plist'
import { config } from 'dotenv'
import Config from 'webpack-chain'
import { IntegrationError, ResourceRequiredError, ValidationError } from './error'
import NSWebpack, { IWebpackEnv } from "@nativescript/webpack"

export type NativeScriptDotenvOptions = {
  appResourcesPath: string,
  isAndroid: boolean,
  isIOS: boolean,
  dotenvPath: string,
  projectRoot: string,
  semver?: any,
  verbose: true,
}

enum EnvironmentVariableName {
  AppleTeamID = 'NATIVESCRIPT_APPLE_TEAM_ID',
  BundleID = 'NATIVESCRIPT_BUNDLE_ID',
  BundleVersion = 'NATIVESCRIPT_BUNDLE_VERSION',
}

export class NativeScriptDotEnvPlugin {
  options: NativeScriptDotenvOptions

  static defaultOptions: NativeScriptDotenvOptions = {
    appResourcesPath: 'App_Resources',
    isAndroid: false,
    isIOS: false,
    dotenvPath: '',
    projectRoot: process.cwd(),
    verbose: true,
  }

  static EnvironmentVariableMap = EnvironmentVariableName

  static ANDROID_VERSION_CODE_MAX = 2100000000

  constructor(options: Partial<NativeScriptDotenvOptions> = {}) {
    this.options = { ...NativeScriptDotEnvPlugin.defaultOptions, ...options }

    if (!this.options.isAndroid && !this.options.isIOS) {
      throw new ValidationError("No platform provided, expecting isIOS|isAndroid options.")
    }

    this.loadDotenv()

    const semver = parseSemVer(options.semver || this.getEnv(NativeScriptDotEnvPlugin.EnvironmentVariableMap.BundleVersion))

    if (!isValidSemVer(this.getEnv(NativeScriptDotEnvPlugin.EnvironmentVariableMap.BundleVersion))) {
      throw new ValidationError('Invalid version string provided.');
    }

    this.options.semver = {
      ...semver,
      /**
       * @todo refactor version string templates
       * @todo refactor build number strategies
       */
      build: `${semver.build || 1}`,
      versionString: `${semver.major}.${semver.minor}.${semver.patch}`
    }

    if (this.options.isAndroid && NativeScriptDotEnvPlugin.ANDROID_VERSION_CODE_MAX < parseInt(this.options.semver.build, 10)) {
      throw new ValidationError('Android versionCode exceeds ANDROID_VERSION_CODE_MAX')
    }
  }

  static init(webpack: typeof NSWebpack & { env: IWebpackEnv }, options: Partial<NativeScriptDotenvOptions> = {}) {
    webpack.chainWebpack((config: Config) => {
      const { env } = webpack
      const DotEnvPlugin = config.plugin('DotEnvPlugin')

      if (!DotEnvPlugin.has('plugin')) {
        throw new IntegrationError('DotEnv plugin not found in NativeScript.')
      }

      const [dotenvConfig] = DotEnvPlugin.get('args')

      webpack.mergeWebpack({
        // @ts-ignore
        plugins: [
          new NativeScriptDotEnvPlugin({
            isIOS: env.ios,
            isAndroid: env.android,
            dotenvPath: dotenvConfig.path,
            ...options
          })
        ]
      })
    })
  }

  /**
   *
   * @param {NativeScriptDotenv.DotenvVariableMap} key
   * @param {*} defaultValue
   * @returns process.env[`key`]
   */
  getEnv(key: string, defaultValue?: any) {
    return process.env[key] || defaultValue
  }

  apply(compiler: any) {
    const hook = this.processEnvVars.bind(this)
    compiler.hooks.beforeRun.tap(this.constructor.name, hook)
  }

  processEnvVars(compiler: any) {
    const envVarMap = new Map<EnvironmentVariableName, Function>([
      [EnvironmentVariableName.AppleTeamID, this.setAppleDevelopmentTeam],
      [EnvironmentVariableName.BundleID, this.setBundleID],
      [EnvironmentVariableName.BundleVersion, this.setBundleVersion],
    ]);
    Object.values(NativeScriptDotEnvPlugin.EnvironmentVariableMap).forEach(variable => {
      if (this.getEnv(variable)) {
        envVarMap.get(variable).call(this, compiler);
      }
    })
  }

  setAppleDevelopmentTeam(compiler: any) {
    if (this.options.isAndroid) {
      return;
    }

    const xcconfigString = readFileSync(this.xcconfigPath, 'utf-8')
    const xcconfigDevTeamMatches = xcconfigString.match(/DEVELOPMENT_TEAM\s+=\s+(\w+);?/)

    if (xcconfigDevTeamMatches && xcconfigDevTeamMatches[1] && xcconfigDevTeamMatches[1] !== this.getEnv(NativeScriptDotEnvPlugin.EnvironmentVariableMap.AppleTeamID)) {
      writeFileSync(this.xcconfigPath, xcconfigString.replace(xcconfigDevTeamMatches[1], process.env.APPLE_TEAM_ID));
    }
  }

  setBundleID(compiler: any) {
    const packageJSON = JSON.parse(readFileSync(this.packageJSONPath, 'utf-8'));
    packageJSON.name = this.getEnv(NativeScriptDotEnvPlugin.EnvironmentVariableMap.BundleID);
    writeFileSync(this.packageJSONPath, JSON.stringify(packageJSON, null, 2));
  }

  setBundleVersion(compiler: any) {
    const { isAndroid, semver } = this.options
    const absPath = isAndroid ? this.androidManifestPath : this.iOSPlistPath
    let fileContent = readFileSync(absPath, 'utf8');

    const packageJSON = JSON.parse(readFileSync(this.packageJSONPath, 'utf-8'))
    packageJSON.version = semver.versionString
    writeFileSync(this.packageJSONPath, JSON.stringify(packageJSON, null, 2))

    if (isAndroid) {
      fileContent = fileContent
        .replace(/(versionCode=".*?")/, `versionCode="${semver.major}${semver.minor}${semver.patch}${semver.build}"`)
        .replace(/(versionName=".*?")/, `versionName="${semver.versionString}"`);
    } else {
      const { build: CFBundleVersion, versionString: CFBundleShortVersionString } = semver;
      fileContent = objectToPlist({
        ...plistToObject(fileContent) as Record<string, unknown>,
        CFBundleShortVersionString,
        CFBundleVersion
      });
    }

    writeFileSync(absPath, fileContent, 'utf8');
  }

  loadDotenv() {
    const dotenvOptions = {
      path: this.options.dotenvPath,
      override: false
    }

    if (process.env.NODE_ENV === 'test') {
      dotenvOptions.override = true
    }

    const dotenvResponse = config(dotenvOptions)

    if (dotenvResponse.error) {
      throw new ResourceRequiredError(dotenvResponse.error.message);
    }

    if (this.options.verbose) {
      console.table(dotenvResponse.parsed);
    }
  }

  get androidManifestPath() {
    return resolve(this.options.projectRoot, this.options.appResourcesPath, 'Android/src/main/AndroidManifest.xml');
  }

  get iOSPlistPath() {
    return resolve(this.options.projectRoot, this.options.appResourcesPath, 'iOS/Info.plist');
  }

  get packageJSONPath() {
    return resolve(this.options.projectRoot, 'package.json');
  }

  get xcconfigPath() {
    return resolve(this.options.projectRoot, this.options.appResourcesPath, 'iOS/build.xcconfig');
  }
}

export default NativeScriptDotEnvPlugin
