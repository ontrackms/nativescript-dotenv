const path = require('path');
const webpack = require('@nativescript/webpack');
const { NativeScriptBundlePlugin } = require('../src/index');
const { IntegrationError } = require('../src/error');
const { webpackConfig, setupBeforeAndAfter } = require('./spec.common');

const originalCwd = process.cwd();

describe('NativeScript integration', () => {
    
    setupBeforeAndAfter(webpackConfig);

    beforeEach(done => {
        // NativeScript assumes the projectRoot is process.cwd
        // so we chdir to <fixtures> to find .env 
        process.chdir(path.resolve(__dirname, 'fixtures'));
        done();
    });

    afterEach(done => {
        process.chdir(originalCwd);
        done();
    })

    it('should stop webpack if DotEnvPlugin not found in NativeScript', done => {
        const badNativeScriptIntegration = () => {
            webpack.init({
                ios: true,
                nativescriptLibPath: true,
                ...webpackConfig,
            });
            NativeScriptBundlePlugin.init(webpack);
            webpack.resolveConfig();
        }
        expect(badNativeScriptIntegration).toThrow(IntegrationError);
        done();
    });

    it('should add NativeScriptBundlePlugin to @nativescript/webpack config', done => {
       webpack.init({
            ios: true,
            nativescriptLibPath: true,
            ...webpackConfig,
        });
        webpack.useConfig('base');
        NativeScriptBundlePlugin.init(webpack);
        const resolvedConfig = webpack.resolveConfig();
        expect(resolvedConfig).toHaveProperty('plugins');
        expect(findPlugin(resolvedConfig.plugins, NativeScriptBundlePlugin)).not.toBeUndefined();
        done();
        function findPlugin(plugins, type) {
            return plugins.filter(p => p instanceof type).shift();
        }
    });

});
