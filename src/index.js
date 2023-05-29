const { resolve } = require('path')
const { readFileSync, writeFileSync } = require('fs')
const { isValidSemVer, parseSemVer } = require('semver-parser')
const { build: objectToPlist, parse: plistToObject } = require('plist')
const { validate: validateOptions } = require('schema-utils')
const DotenvModule = require('dotenv')
const schema = require('../schema.json')

class NativeScriptDotenv {
  static defaultOptions = {
    appResourcesPath: 'App_Resources',
    isAndroid: false,
    isIOS: false,
    dotenvPath: '',
    projectRoot: process.cwd()
  }

  static DotenvVariableMap = {
    BUNDLE_VERSION: 'NATIVESCRIPT_BUNDLE_VERSION',
    BUNDLE_ID: 'NATIVESCRIPT_BUNDLE_ID',
    APPLE_TEAM_ID: 'NATIVESCRIPT_APPLE_TEAM_ID'
  }

  static ANDROID_VERSION_CODE_MAX = 2100000000

  /**
   * @param {NativeScriptDotenv.defaultOptions} instanceOptions
   */
  constructor (instanceOptions = {}) {
    this.options = { ...NativeScriptDotenv.defaultOptions, ...instanceOptions }

    validateOptions(
      schema,
      this.options,
      {
        baseDataPath: 'options',
        name: this.constructor.name
      }
    )

    if (!this.options.isAndroid && !this.options.isIOS) {
      throw Error('No Platform Specified')
    }

    DotenvModule.config({
      path: this.options.dotenvPath,
      override: true
    })

    const semver = parseSemVer(this.getEnv(NativeScriptDotenv.DotenvVariableMap.BUNDLE_VERSION))

    if (!isValidSemVer(this.getEnv(NativeScriptDotenv.DotenvVariableMap.BUNDLE_VERSION))) {
      throw Error('Invalid Version Code')
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

    if (this.options.isAndroid && NativeScriptDotenv.ANDROID_VERSION_CODE_MAX < parseInt(this.options.semver.build, 10)) {
      throw Error('Android versionCode exceeds ANDROID_VERSION_CODE_MAX')
    }
  }

  /**
   *
   * @param {NativeScriptDotenv.DotenvVariableMap} key
   * @param {*} defaultValue
   * @returns process.env[`key`]
   */
  getEnv (key, defaultValue) {
    return process.env[key] || defaultValue
  }

  apply (compiler) {
    const hook = this.setPlatformVersion.bind(this)
    compiler.hooks.beforeRun.tap(this.constructor.name, hook)
  }

  setPlatformVersion (compiler) {
    const { appResourcesPath, projectRoot, isAndroid, semver } = this.options
    const absPath = resolve(appResourcesPath,
      isAndroid
        ? 'Android/src/main/AndroidManifest.xml'
        : 'iOS/Info.plist')
    let fileContent = readFileSync(absPath, 'utf8')

    const packageJSON = JSON.parse(readFileSync(resolve(projectRoot, 'package.json'), 'utf-8'))

    packageJSON.name = this.getEnv(NativeScriptDotenv.DotenvVariableMap.BUNDLE_ID)
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
        xcconfigDevTeamMatches[1] !== this.getEnv(NativeScriptDotenv.DotenvVariableMap.APPLE_TEAM_ID)
      ) {
        writeFileSync(
          resolve(projectRoot, appResourcesPath, 'iOS/build.xcconfig'),
          xcconfigString.replace(xcconfigDevTeamMatches[1], process.env.APPLE_TEAM_ID))
      }

      const { build: CFBundleVersion, versionString: CFBundleShortVersionString } = semver
      fileContent = objectToPlist({ ...plistToObject(fileContent), CFBundleShortVersionString, CFBundleVersion })
    }
    writeFileSync(absPath, fileContent, 'utf8')
  }
}

NativeScriptDotenv.init = function (webpack) {
  webpack.chainWebpack(
    config => {
      const { env } = webpack
      const dotenvConfigMap = config.plugins.store.get('DotEnvPlugin')

      if (!dotenvConfigMap || !(dotenvConfigMap.store instanceof Map)) {
        throw Error('DotEnvPlugin not found within NativeScript')
      }

      const [dotenvConfig] = dotenvConfigMap.store.get('args')

      webpack.mergeWebpack({
        plugins: [
          new NativeScriptDotenv({
            isIOS: env.ios,
            isAndroid: env.android,
            dotenvPath: dotenvConfig.path
          })
        ]
      })
    }
  )
}

module.exports = NativeScriptDotenv
