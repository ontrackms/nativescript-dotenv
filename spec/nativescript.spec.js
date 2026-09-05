const path = require('path');
const webpack = require('@nativescript/webpack');
const { webpackConfig, setupBeforeAndAfter } = require('./spec.common');
const { NativeScriptDotEnvPlugin, IntegrationError } = require('@ontrackms/nativescript-dotenv');

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
        // @nativescript/webpack warns to the console when it can't determine
        // the project flavor, which happens here since useConfig('base') is
        // deliberately not called; silence that expected noise.
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
        const badNativeScriptIntegration = () => {
            webpack.init({
                ios: true,
                nativescriptLibPath: true,
                ...webpackConfig,
            });
            NativeScriptDotEnvPlugin.init(webpack);
            webpack.resolveConfig();
        }
        expect(badNativeScriptIntegration).toThrow(IntegrationError);
        warnSpy.mockRestore();
        done();
    });

    it('should add NativeScriptDotEnvPlugin to @nativescript/webpack config', done => {
       webpack.init({
            ios: true,
            nativescriptLibPath: true,
            ...webpackConfig,
        });
        webpack.useConfig('base');
        NativeScriptDotEnvPlugin.init(webpack);
        const resolvedConfig = webpack.resolveConfig();
        expect(resolvedConfig).toHaveProperty('plugins');
        expect(findPlugin(resolvedConfig.plugins, NativeScriptDotEnvPlugin)).not.toBeUndefined();
        done();
        function findPlugin(plugins, type) {
            return plugins.filter(p => p instanceof type).shift();
        }
    });

});
