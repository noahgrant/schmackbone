module.exports = (config) => {
  config.set({
    basePath: '',
    frameworks: ['jasmine'],

    // list of files / patterns to load in the browser
    files: [
      'test/setup/*.js',
      'test/ajax.js'
    ],

    // test results reporter to use
    reporters: ['progress'],

    // web server port
    port: 9877,

    // enable / disable colors in the output (reporters and logs)
    colors: true,

    // level of logging
    logLevel: config.LOG_INFO,

    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: false,

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    // singleRun: true,

    browsers: ['Chrome'],
    plugins: [
      'karma-chrome-launcher',
      'karma-jasmine',
      'karma-jasmine-html-reporter',
      'karma-webpack'
    ],
    customLaunchers: {
      ChromeCustom: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox']
      }
    },
    preprocessors: {
      'schmackbone.js': ['webpack'],
      'lib/*.js': ['webpack'],
      'test/setup/*.js': ['webpack'],
      'test/ajax.js': ['webpack']
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
