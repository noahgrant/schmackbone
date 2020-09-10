module.exports = (config) => {
  config.set({
    basePath: '',
    frameworks: ['qunit', 'sinon'],

    // list of files / patterns to load in the browser
    files: [
      'node_modules/qs/dist/qs.js',
      'test/vendor/json2.js',
      'test/vendor/underscore.js',
      'schmackbone.js',
      'test/setup/*.js',
      'test/*.js'
    ],

    // test results reporter to use
    reporters: ['progress', 'kjhtml'],

    // web server port
    port: 9877,

    // enable / disable colors in the output (reporters and logs)
    colors: true,

    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,

    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: false,

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: true,

    browsers: ['ChromeCustom'],
    customLaunchers: {
      ChromeCustom: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox']
      }
    },
    plugins: ['karma-webpack'],
    preprocessors: {
      'lib/*.js*': ['webpack'],
      'test/*.js*': ['webpack']
    },
    webpack: {
      mode: 'development',
      module: {
        rules: [{
          test: /\.jsx?$/,
          exclude: /node_modules/,
          use: {loader: 'babel-loader?cacheDirectory=true'}
        }]
      }
    }
  });
};
