
import { resolve } from 'path'
import { readFileSync, writeFileSync } from 'fs'
import { isValidSemVer, parseSemVer } from 'semver-parser'
import { build as objectToPlist, parse as plistToObject } from 'plist'
import { config } from 'dotenv'
import Config from 'webpack-chain'
import { IntegrationError, ResourceRequiredError, ValidationError } from './error'

type NativeScriptDotenvOptions = {
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

export class NativeScriptBundlePlugin {
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

  constructor (options: Partial<NativeScriptDotenvOptions> = {}) {
    this.options = { ...NativeScriptBundlePlugin.defaultOptions, ...options }

    if (!this.options.isAndroid && !this.options.isIOS) {
      throw new ValidationError("No platform provided, expecting isIOS|isAndroid options.")
    }

    this.loadDotenv()

    const semver = parseSemVer(this.getEnv(NativeScriptBundlePlugin.EnvironmentVariableMap.BundleVersion))

    if (!isValidSemVer(this.getEnv(NativeScriptBundlePlugin.EnvironmentVariableMap.BundleVersion))) {
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

    if (this.options.isAndroid && NativeScriptBundlePlugin.ANDROID_VERSION_CODE_MAX < parseInt(this.options.semver.build, 10)) {
      throw new ValidationError('Android versionCode exceeds ANDROID_VERSION_CODE_MAX')
    }
  }

  static init (webpack: any) {
    webpack.chainWebpack((config: Config) => {
        const { env } = webpack

        const DotEnvPlugin = config.plugin('DotEnvPlugin')

        if (!DotEnvPlugin.has('plugin')) {
          throw new IntegrationError('DotEnv plugin not found in NativeScript.')
        }
  
        const [dotenvConfig] = DotEnvPlugin.get('args')
  
        webpack.mergeWebpack({
          plugins: [
            new NativeScriptBundlePlugin({
              isIOS: env.ios,
              isAndroid: env.android,
              dotenvPath: dotenvConfig.path
            })
          ]
        })
      }
    )
  }

  /**
   *
   * @param {NativeScriptDotenv.DotenvVariableMap} key
   * @param {*} defaultValue
   * @returns process.env[`key`]
   */
  getEnv (key: string, defaultValue?: any) {
    return process.env[key] || defaultValue
  }

  apply (compiler: any) {
    const hook = this.setPlatformVersion.bind(this)
    compiler.hooks.beforeRun.tap(this.constructor.name, hook)
  }

  setPlatformVersion (compiler: any) {
    const { appResourcesPath, projectRoot, isAndroid, semver } = this.options
    const absPath = resolve(appResourcesPath,
      isAndroid
        ? 'Android/src/main/AndroidManifest.xml'
        : 'iOS/Info.plist')
    let fileContent = readFileSync(absPath, 'utf8')

    const packageJSON = JSON.parse(readFileSync(resolve(projectRoot, 'package.json'), 'utf-8'))

    packageJSON.name = this.getEnv(NativeScriptBundlePlugin.EnvironmentVariableMap.BundleID)
    packageJSON.version = semver.versionString

    writeFileSync(resolve(projectRoot, 'package.json'), JSON.stringify(packageJSON, null, 2))

    if (isAndroid) {
      fileContent = fileContent
        .replace(/(versionCode=".*?")/, `versionCode="${semver.major}${semver.minor}${semver.patch}${semver.build}"`)
        .replace(/(versionName=".*?")/, `versionName="${semver.versionString}"`)
    } else {
      // update build.xcconfig for Xcode
      const xcconfigString = readFileSync(resolve(projectRoot, appResourcesPath, 'iOS/build.xcconfig'), 'utf-8')

      const xcconfigDevTeamMatches = xcconfigString.match(/DEVELOPMENT_TEAM\s+=\s+(\w+);?/)

      if (xcconfigDevTeamMatches &&
        xcconfigDevTeamMatches[1] &&
        xcconfigDevTeamMatches[1] !== this.getEnv(NativeScriptBundlePlugin.EnvironmentVariableMap.AppleTeamID)
      ) {
        writeFileSync(
          resolve(projectRoot, appResourcesPath, 'iOS/build.xcconfig'),
          xcconfigString.replace(xcconfigDevTeamMatches[1], process.env.APPLE_TEAM_ID))
      }

      const { build: CFBundleVersion, versionString: CFBundleShortVersionString } = semver
      fileContent = objectToPlist({
        ...plistToObject(fileContent) as Record<string, unknown>,
        CFBundleShortVersionString,
        CFBundleVersion
      })
    }
    writeFileSync(absPath, fileContent, 'utf8')
  }

  loadDotenv () {
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

    this.validatedEnvironmentVariables()

    if (this.options.verbose) {
      console.table(dotenvResponse.parsed);
    }
  }

  validatedEnvironmentVariables () {
    Object.values(NativeScriptBundlePlugin.EnvironmentVariableMap).forEach(variable => {
      if (!this.getEnv(variable)) {
        process.exitCode = 1
        throw new ValidationError(`Missing environment variable "${variable}"`)
      }
    })
  }
}

export default NativeScriptBundlePlugin
