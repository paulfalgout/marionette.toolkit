var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
const fs = require('fs');
const del = require('del');
const glob = require('glob');
const path = require('path');
const mkdirp = require('mkdirp');
const babelify = require('babelify');
const isparta = require('isparta');
const esperanto = require('esperanto');
const browserify = require('browserify');
const runSequence = require('run-sequence');
const source = require('vinyl-source-stream');
const Promise = require('bluebird');
const _ = require('lodash');
const _ = require('underscore');

const manifest = require('./package.json');
const config = manifest.babelBoilerplateOptions;
const mainFile = manifest.main;
const destinationFolder = path.dirname(mainFile);
const exportFileName = path.basename(mainFile, path.extname(mainFile));

// Remove the built files
gulp.task('clean', function(cb) {
  del([destinationFolder], cb);
});

// Remove our temporary files
gulp.task('clean-tmp', function(cb) {
  del(['tmp'], cb);
});

// Send a notification when JSHint fails,
// so that you know your changes didn't build
function jshintNotify(file) {
  if (!file.jshint) { return; }
  return file.jshint.success ? false : 'JSHint failed';
}

function jscsNotify(file) {
  if (!file.jscs) { return; }
  return file.jscs.success ? false : 'JSRC failed';
}

// Lint our source code
gulp.task('lint-src', function() {
  return gulp.src(['src/**/*.js'])
    .pipe($.jshint())
    .pipe($.jshint.reporter('jshint-stylish'))
    .pipe($.notify(jshintNotify))
    .pipe($.jscs())
    .pipe($.notify(jscsNotify))
    .pipe($.jshint.reporter('fail'));
});

// Lint our test code
gulp.task('lint-test', function() {
  return gulp.src(['test/**/*.js'])
    .pipe($.jshint())
    .pipe($.jshint.reporter('jshint-stylish'))
    .pipe($.notify(jshintNotify))
    .pipe($.jscs())
    .pipe($.notify(jscsNotify))
    .pipe($.jshint.reporter('fail'));
});

function getBanner() {
  var banner = ['/**',
    ' * <%= name %> - <%= description %>',
    ' * @version v<%= version %>',
    ' * @link <%= homepage %>',
    ' * @license <%= license %>',
    ' */',
    ''].join('\n');

  return _.template(banner)(manifest);
}

function _build(entryFileName, destFolder, expFileName, expVarName, umd){
  return esperanto.bundle({
    base: 'src',
    entry: entryFileName,
    transform: function(source) {
      var js_source = _.template(source)(manifest);

      // Poor way of modifying dependency for modular build
      if(!umd){
        return js_source.replace('./state-class', 'marionette.toolkit.state-class');
      }

      return js_source;
    }
  }).then(function(bundle) {
    var banner = getBanner();

    var bundleMethod = umd? 'toUmd' : 'toCjs';

    var res = bundle[bundleMethod]({
      banner: banner,
      sourceMap: true,
      sourceMapSource: entryFileName + '.js',
      sourceMapFile: expFileName + '.js',
      name: expVarName
    });

    // Write the generated sourcemap
    mkdirp.sync(destFolder);
    fs.writeFileSync(path.join(destFolder, expFileName + '.js'), res.map.toString());

    $.file(expFileName + '.js', res.code, { src: true })
      .pipe($.plumber())
      .pipe($.sourcemaps.init({ loadMaps: true }))
      .pipe($.babel({ blacklist: ['useStrict'] }))
      .pipe($.sourcemaps.write('./', {addComment: false}))
      .pipe(gulp.dest(destFolder))
      .pipe($.filter(['*', '!**/*.js.map']))
      .pipe($.rename(expFileName + '.min.js'))
      .pipe($.uglifyjs({
        outSourceMap: true,
        inSourceMap: destFolder + '/' + expFileName + '.js.map',
      }))
      .pipe($.header(banner))
      .pipe(gulp.dest(destFolder));
  });
}

// Build two versions of the library
gulp.task('build-lib', ['lint-src', 'clean'], function() {
  return _build(config.entryFileName, destinationFolder, exportFileName, config.exportVarName, 'umd');
});

function _buildPackage(destFolder, entryName, exportName){
  var data = {
    version: manifest.version,
    exportVarName: exportName,
    entryName: entryName,
    dependencies: JSON.stringify(manifest.dependencies, null, 4)
  };

  gulp.src('./packages/LICENSE')
    .pipe(gulp.dest(destFolder));

  gulp.src('./packages/README.md')
    .pipe($.template(data))
    .pipe(gulp.dest(destFolder));

  gulp.src('./packages/package.json')
    .pipe($.template(data))
    .pipe(gulp.dest(destFolder));
}

gulp.task('build-packages', ['lint-src', 'clean'], function() {
  var tasks = _.map(config.exportPackageNames, function(entryName, exportName){
    var destFolder = './packages/' + exportName + '/';
    var exportVarName = 'Marionette.Toolkit.' + exportName;
    return _build(entryName, destFolder, exportName, exportVarName)
      .then(_.partial(_buildPackage, destFolder, entryName, exportName));
  });

  return Promise.all(tasks);
});

// Bundle our app for our unit tests
gulp.task('browserify', function() {
  var testFiles = glob.sync('./test/unit/**/*');
  var allFiles = ['./test/setup/browserify.js'].concat(testFiles);
  var bundler = browserify(allFiles);
  bundler.transform(babelify.configure({
    sourceMapRelative: __dirname + '/src',
    blacklist: ['useStrict']
  }));
  var bundleStream = bundler.bundle();
  return bundleStream
    .on('error', function(err){
      console.log(err.message);
      this.emit('end');
    })
    .pipe($.plumber())
    .pipe(source('./tmp/__spec-build.js'))
    .pipe(gulp.dest(''))
    .pipe($.livereload());
});

gulp.task('coverage', ['lint-src', 'lint-test'], function(done) {
  require('babel/register')({ modules: 'common' });
  gulp.src(['src/*.js'])
    .pipe($.istanbul({ instrumenter: isparta.Instrumenter }))
    .pipe($.istanbul.hookRequire())
    .on('finish', function() {
      return test()
      .pipe($.istanbul.writeReports())
      .on('end', done);
    });
});

function test() {
  return gulp.src(['test/setup/node.js', 'test/unit/**/*.js'], {read: false})
    .pipe($.mocha({reporter: 'dot', globals: config.mochaGlobals}));
};

// Lint and run our tests
gulp.task('test', ['lint-src', 'lint-test'], function() {
  require('babel/register')({ modules: 'common' });
  return test();
});

// Ensure that linting occurs before browserify runs. This prevents
// the build from breaking due to poorly formatted code.
gulp.task('build-in-sequence', function(callback) {
  runSequence(['lint-src', 'lint-test'], 'browserify', callback);
});

// Run the headless unit tests as you make changes.
gulp.task('watch', function() {
  gulp.watch(['src/**/*', 'test/**/*', '.jshintrc', 'test/.jshintrc'], ['test']);
});

// Set up a livereload environment for our spec runner
gulp.task('test-browser', ['build-in-sequence'], function() {
  $.livereload.listen({port: 35729, host: 'localhost', start: true});
  return gulp.watch(['src/**/*.js', 'test/**/*', '.jshintrc', 'test/.jshintrc'], ['build-in-sequence']);
});

gulp.task('build', ['build-lib', 'build-packages']);

// An alias of test
gulp.task('default', ['test']);
