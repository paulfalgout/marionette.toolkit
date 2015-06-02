Marionette.Toolkit
==================

[![Travis Status](http://img.shields.io/travis/RoundingWellOS/marionette.toolkit/master.svg?style=flat&amp;label=travis)](https://travis-ci.org/RoundingWellOS/marionette.toolkit) [![Code Climate Score](http://img.shields.io/codeclimate/github/RoundingWellOS/marionette.toolkit.svg?style=flat)](https://codeclimate.com/github/RoundingWellOS/marionette.toolkit) [![Coverage](http://img.shields.io/codeclimate/coverage/github/RoundingWellOS/marionette.toolkit.svg?style=flat)](https://codeclimate.com/github/RoundingWellOS/marionette.toolkit) [![Dependency Status](http://img.shields.io/david/RoundingWellOS/marionette.toolkit.svg?style=flat)](https://david-dm.org/RoundingWellOS/marionette.toolkit)


## About Marionette.Toolkit

Marionette.Toolkit is a collection of opinionated extensions for
[Marionette](http://marionettejs.com) Each element helps to reduce boilerplate
for complex large scale application problems.  This toolkit was
built from scripts open sourced from [RoundingWell.com](http://roundingwell.com).

In addition to the full library, each element in Toolkit is available as it's own [npm module](marionette.toolkit-modularized).

## Documentation
  [StateClass](./docs/state-class.md) - `Marionette.Object` with a `Backbone.Model` for keeping state.

  [Component](./docs/component.md) - Reusable `StateClass` with `View` management boilerplate

  [AbstractApp](./docs/abstract-app.md) - Object including a start/stop lifecycle and running event registry.

  [App](./docs/app.md) - `AbstractApp` with mixed in "App Manager" for adding and removing child `App`s

  [Asnyc App start](./docs/async-app-start.md) - How to easily start apps asynchronously


## Getting Help

If you have questions or concerns please feel free to [open an issue](#github-issues).
Additionally join us on the [Marionette Gitter](https://gitter.im/marionettejs/backbone.marionette) to have a chat.
Everyone there is happy to discuss design patterns.


## Project Details

#### Library Downloads

You can download the latest builds directly from the [dist](https://github.com/RoundingWellOS/marionette.toolkit/tree/master/dist) folder above.

#### Available Packages

**Via [npm](https://www.npmjs.com/package/marionette.toolkit)**
```
$ npm install marionette.toolkit
```

**Via [bower](http://bower.io/search/?q=marionette.toolkit)**
```
$ bower install marionette.toolkit
```


Currently Marionette.Toolkit is available via npm and bower. If you would like add it to another channel, please
[open an issue](#github-issues).

#### Changelog

For change logs and release notes, see the [changelog](CHANGELOG.md) file.

#### Compatibility and Requirements

Marionette.Toolkit currently requires [Marionette](http://marionettejs.com) 2.2.0+ as it utilizes [`Marionette.Error`](https://github.com/marionettejs/backbone.marionette/blob/v2.2.0/src/marionette.error.js) and extends
[`Marionette.Object`](https://github.com/marionettejs/backbone.marionette/blob/master/docs/marionette.object.md)

It's possible this library would work with earlier versions by manually adding `Marionette.Error` and shimming
`Marionette.Object = Marionette.Controller;`


This library is tested with v2.2+ and a mix of underscore and lodash versions.

Marionette.Toolkit supports IE8+ and modern browsers.


## How to Contribute

If you would like to contribute to Marionette.Toolkit's source code, please read
the [guidelines for pull requests and contributions](CONTRIBUTING.md).
Following these guidelines will help make your contributions easier to
bring into the next release.

You can also join us in the [Marionette Toolkit Gitter](https://gitter.im/RoundingWellOS/marionette.toolkit) to think up new features, report bugs, ask questions, and talk design patterns within Toolkit.

### Github Issues

[Report issues](https://github.com/RoundingWellOS/marionette.toolkit/issues) with Marionette.Toolkit, and [submit pull requests](https://github.com/RoundingWellOS/marionette.toolkit/pulls) to fix problems or to
create summarized and documented feature requests (preferably with the feature implemented in the pull request).


===

This library is © 2015 RoundingWell. Distributed under MIT license.
