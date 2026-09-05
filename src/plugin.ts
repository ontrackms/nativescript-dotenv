
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
  isRelease: boolean,
  dotenvPath: string,
  projectRoot: string,
  semver?: any,
  verbose: boolean,
}

// Virtually every CI/cloud build provider (GitHub Actions, GitLab CI,
// CircleCI, Bitrise, App Center, Codemagic, Travis, etc.) sets CI=true.
const isCI = () => Boolean(process.env.CI)

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
    isRelease: false,
    dotenvPath: '',
    projectRoot: process.cwd(),
    // verbose logging is on by default for local builds, but automatically
    // disabled on CI/cloud builds (see isCI above) unless explicitly set
    verbose: true,
  }

  static EnvironmentVariableMap = EnvironmentVariableName

  static ANDROID_VERSION_CODE_MAX = 2100000000

  constructor(options: Partial<NativeScriptDotenvOptions> = {}) {
    this.options = { ...NativeScriptDotEnvPlugin.defaultOptions, ...options }

    if (options.verbose === undefined && isCI()) {
      this.options.verbose = false
    }

    if (!this.options.isAndroid && !this.options.isIOS) {
      throw new ValidationError("No platform provided, expecting isIOS|isAndroid options.")
    }

    this.loadDotenv()

    // NATIVESCRIPT_BUNDLE_VERSION is optional; only parse/validate it if
    // a value was actually provided (via options.semver or the env var).
    const bundleVersion = options.semver || this.getEnv(NativeScriptDotEnvPlugin.EnvironmentVariableMap.BundleVersion)

    if (bundleVersion !== undefined) {
      if (!isValidSemVer(bundleVersion)) {
        throw new ValidationError('Invalid version string provided.');
      }

      const semver = parseSemVer(bundleVersion)

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
            // env.production is set by the NativeScript CLI for --release / publish builds
            isRelease: env.production,
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
    if (this.getEnv(NativeScriptDotEnvPlugin.EnvironmentVariableMap.AppleTeamID)) {
      this.setAppleDevelopmentTeam(compiler)
    }

    if (this.getEnv(NativeScriptDotEnvPlugin.EnvironmentVariableMap.BundleID)) {
      this.setBundleID(compiler)
    }

    // driven by this.options.semver rather than the env var directly, so an
    // explicit options.semver (passed without the env var) still takes effect
    if (this.options.semver) {
      this.setBundleVersion(compiler)
    }
  }

  setAppleDevelopmentTeam(compiler: any) {
    if (this.options.isAndroid) {
      return;
    }

    const xcconfigString = readFileSync(this.xcconfigPath, 'utf-8')
    const devTeamPattern = /DEVELOPMENT_TEAM\s+=\s+(\w+);?/
    const allDevTeamMatches = xcconfigString.match(new RegExp(devTeamPattern, 'g'))

    // fail loudly rather than silently no-op'ing (zero matches) or only
    // patching the first of several occurrences (multiple matches) if the
    // file has been reformatted in a way the regex doesn't expect
    if (!allDevTeamMatches || allDevTeamMatches.length !== 1) {
      throw new IntegrationError(`Expected exactly one DEVELOPMENT_TEAM entry in ${this.xcconfigPath}, found ${allDevTeamMatches ? allDevTeamMatches.length : 0}.`)
    }

    const [, currentTeamId] = xcconfigString.match(devTeamPattern)!

    if (currentTeamId !== this.getEnv(NativeScriptDotEnvPlugin.EnvironmentVariableMap.AppleTeamID)) {
      writeFileSync(this.xcconfigPath, xcconfigString.replace(currentTeamId, this.getEnv(NativeScriptDotEnvPlugin.EnvironmentVariableMap.AppleTeamID)), 'utf-8');
    }
  }

  setBundleID(compiler: any) {
    const packageJSON = JSON.parse(readFileSync(this.packageJSONPath, 'utf-8'));
    packageJSON.name = this.getEnv(NativeScriptDotEnvPlugin.EnvironmentVariableMap.BundleID);
    writeFileSync(this.packageJSONPath, JSON.stringify(packageJSON, null, 2));
  }

  setBundleVersion(compiler: any) {
    const { isAndroid, isRelease, semver } = this.options

    const packageJSON = JSON.parse(readFileSync(this.packageJSONPath, 'utf-8'))
    packageJSON.version = semver.versionString
    writeFileSync(this.packageJSONPath, JSON.stringify(packageJSON, null, 2))

    // Android's versionCode is bumped, not just set, so only touch it on
    // release builds (env.production, from `ns build/run --release`) to
    // avoid incrementing AndroidManifest.xml on every dev/watch rebuild.
    if (isAndroid && !isRelease) {
      return
    }

    const absPath = isAndroid ? this.androidManifestPath : this.iOSPlistPath
    let fileContent = readFileSync(absPath, 'utf-8');

    if (isAndroid) {
      // fail loudly rather than silently no-op'ing (zero matches) or only
      // patching the first of several occurrences (multiple matches) if the
      // manifest has been reformatted in a way the regex doesn't expect
      const versionCodeMatches = fileContent.match(/versionCode="(.*?)"/g)
      if (!versionCodeMatches || versionCodeMatches.length !== 1) {
        throw new IntegrationError(`Expected exactly one versionCode attribute in ${absPath}, found ${versionCodeMatches ? versionCodeMatches.length : 0}.`)
      }

      const versionNameMatches = fileContent.match(/versionName="(.*?)"/g)
      if (!versionNameMatches || versionNameMatches.length !== 1) {
        throw new IntegrationError(`Expected exactly one versionName attribute in ${absPath}, found ${versionNameMatches ? versionNameMatches.length : 0}.`)
      }

      const [, currentVersionCode] = fileContent.match(/versionCode="(.*?)"/)!
      const newVersionCode = Number(currentVersionCode) + 1;
      fileContent = fileContent
        .replace(/(versionCode=".*?")/, `versionCode="${newVersionCode}"`)
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
