const gulp = require('gulp');
const $ = require('gulp-load-plugins')();
const del = require('del');
const path = require('path');
const rollup = require('rollup').rollup;
const multiEntry = require('rollup-plugin-multi-entry');
const nodeResolve = require('rollup-plugin-node-resolve');
const commonjs = require('rollup-plugin-commonjs');
const babel = require('rollup-plugin-babel');
const json = require('rollup-plugin-json');
const preset = require('babel-preset-es2015-rollup');

const manifest = require('./package.json');
const config = manifest.babelBoilerplateOptions;
const mochaGlobals = require('./test/.globals.json').globals;
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

const onError = $.notify.onError('Error: <%= error.message %>');

function lint(files) {
  return gulp.src(files)
    .pipe($.plumber(onError))
    .pipe($.eslint())
    .pipe($.eslint.format())
    .pipe($.eslint.failOnError());
}

// Lint our source code
gulp.task('lint-src', function() {
  return lint(['src/**/*.js']);
});

// Lint our test code
gulp.task('lint-test', function() {
  return lint(['test/**/*.js']);
});

function getBanner() {
  const banner = ['/**',
    ` * ${ manifest.name } - ${ manifest.description }`,
    ` * @version v${ manifest.version }`,
    ` * @link ${ manifest.homepage }`,
    ` * @license ${ manifest.license }`,
    ' */',
    ''].join('\n');

  return banner;
}

function _generate(bundle, expVarName) {
  const intro = getBanner();

  return bundle.generate({
    format: 'umd',
    moduleName: expVarName,
    sourceMap: true,
    banner: intro,
    globals: {
      'backbone': 'Backbone',
      'underscore': '_',
      'backbone.marionette': 'Marionette'
    }
  });
}

function bundleCode(entryFileName, expVarName) {
  return rollup({
    entry: `src/${ entryFileName }.js`,
    external: ['underscore', 'backbone', 'backbone.marionette'],
    plugins: [
      babel({
        sourceMaps: true,
        presets: [preset],
        babelrc: false
      })
    ]
  }).then(function(bundle) {
    return _generate(bundle, expVarName);
  }).then(gen => {
    gen.code += `\n//# sourceMappingURL=${ gen.map.toUrl() }`;
    return gen;
  });
}

function _buildLib(entryFileName, destFolder, expFileName, expVarName) {
  return bundleCode(entryFileName, expVarName).then(function(gen) {
    gen.code = gen.code.replace('<%VERSION%>', manifest.version);

    return $.file(`${ expFileName }.js`, gen.code, { src: true })
      .pipe($.plumber())
      .pipe($.sourcemaps.init({ loadMaps: true }))
      .pipe($.sourcemaps.write('./'))
      .pipe(gulp.dest(destFolder))
      .pipe($.filter(['*', '!**/*.js.map']))
      .pipe($.rename(`${ expFileName }.min.js`))
      .pipe($.sourcemaps.init({ loadMaps: true }))
      .pipe($.uglify({
        preserveComments: 'license'
      }))
      .pipe($.sourcemaps.write('./'))
      .pipe(gulp.dest(destFolder));
  });
}

gulp.task('build-lib', ['lint-src', 'clean'], function() {
  return _buildLib(config.entryFileName, destinationFolder, exportFileName, config.exportVarName);
});

function bundleTest() {
  return rollup({
    entry: ['./test/setup/browser.js', './test/unit/**/*.js'],
    plugins: [
      multiEntry.default(),
      nodeResolve({ main: true }),
      commonjs(),
      json(),
      babel({
        sourceMaps: true,
        presets: [preset],
        babelrc: false,
        exclude: 'node_modules/**'
      })
    ]
  }).then(function(bundle) {
    return bundle.write({
      format: 'iife',
      sourceMap: true,
      moduleName: 'ToolkitTests',
      dest: './tmp/__spec-build.js'
    });
  }).then($.livereload.changed('./tmp/__spec-build.js'));
}

function browserWatch() {
  $.livereload.listen({ port: 35729, host: 'localhost', start: true });
  gulp.watch(['src/**/*.js', 'test/**/*.js'], ['browser-bundle']);
}

function _registerBabel() {
  require('babel-register');
}

gulp.task('coverage', ['lint-src', 'lint-test'], function(done) {
  _registerBabel();
  gulp.src(['src/*.js'])
    .pipe($.babelIstanbul())
    .pipe($.babelIstanbul.hookRequire())
    .on('finish', function() {
      return test()
        .pipe($.babelIstanbul.writeReports())
        .on('end', done);
    });
});

function test() {
  return gulp.src(['test/setup/node.js', 'test/unit/**/*.js'], { read: false })
    .pipe($.mocha({ reporter: 'dot', globals: mochaGlobals }));
}

// Lint and run our tests
gulp.task('test', ['lint-src', 'lint-test'], function() {
  _registerBabel();
  return test();
});

// Run the headless unit tests as you make changes.
gulp.task('watch', function() {
  gulp.watch(['src/**/*', 'test/**/*', '.jshintrc', 'test/.jshintrc'], ['test']);
});

gulp.task('browser-bundle', ['lint-src', 'lint-test'], bundleTest);

gulp.task('test-browser', ['browser-bundle'], browserWatch);

gulp.task('build', ['build-lib']);

// An alias of test
gulp.task('default', ['test']);
