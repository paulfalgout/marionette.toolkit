/**
 * marionette.toolkit - A collection of opinionated Backbone.Marionette extensions for large scale application architecture.
 * @version v0.4.1
 * @link https://github.com/RoundingWellOS/marionette.toolkit
 * @license MIT
 */
(function (global, factory) {
  typeof exports === "object" && typeof module !== "undefined" ? module.exports = factory(require("backbone.marionette"), require("underscore"), require("backbone")) : typeof define === "function" && define.amd ? define(["backbone.marionette", "underscore", "backbone"], factory) : global.Marionette.Toolkit = factory(global.Marionette, global._, global.Backbone);
})(this, function (Marionette, _, Backbone) {
  "use strict";

  var StateClass = Marionette.Object.extend({

    /**
     * The model class for _stateModel.
     * @type {Backbone.Model}
     * @default Backbone.Model
     */
    StateModel: Backbone.Model,

    /**
     * @public
     * @constructs StateClass
     * @param {Object} [options] - Settings for the stateClass.
     * @param {Object} [options.stateEvents] - Event hash bound from _stateModel to stateClass.
     * @param {Backbone.Model} [options.StateModel] - Model class for _stateModel.
     */
    constructor: function constructor(options) {
      options = _.extend({}, options);

      // Make defaults available to this
      _.extend(this, _.pick(options, ["StateModel", "stateEvents", "stateDefaults"]));

      var StateModel = this._getStateModel(options);

      this._stateModel = new StateModel(_.result(this, "stateDefaults"));

      // Bind events from the _stateModel defined in stateEvents hash
      this.bindEntityEvents(this._stateModel, _.result(this, "stateEvents"));

      Marionette.Object.call(this, options);
    },

    /**
     * Get the StateClass StateModel class.
     * Checks if the `StateModel` is a model class (the common case)
     * Then check if it's a function (which we assume that returns a model class)
     *
     * @private
     * @method _getStateModel
     * @param {Object} [options] - Options that can be used to determine the StateModel.
     * @memberOf StateClass
     * @returns {Backbone.Model}
     */
    _getStateModel: function _getStateModel(options) {
      var StateModel = this.getOption("StateModel");

      if (StateModel.prototype instanceof Backbone.Model || StateModel === Backbone.Model) {
        return StateModel;
      } else if (_.isFunction(StateModel)) {
        return StateModel.call(this, options);
      } else {
        throw new Marionette.Error({
          name: "InvalidStateModelError",
          message: "\"StateModel\" must be a model class or a function that returns a model class"
        });
      }
    },

    /**
     * Set a property on the _stateModel.
     *
     * @public
     * @method setState
     * @memberOf StateClass
     * @param {String|Object} key - Attribute name or Hash of any number of key value pairs.
     * @param {*} [value] - Attribute value if key is String, replaces options param otherwise.
     * @param {Object} [options] - Backbone.Model options.
     * @returns {Backbone.Model} - The _stateModel
     */
    setState: function setState() {
      return this._stateModel.set.apply(this._stateModel, arguments);
    },

    /**
     * Get a property from the _stateModel, or return the _stateModel
     *
     * @public
     * @method getState
     * @memberOf StateClass
     * @param {String} [attr] - Attribute name of stateModel.
     * @returns {Backbone.Model|*} - The _stateModel or the attribute value of the _stateModel
     */
    getState: function getState(attr) {
      if (!attr) {
        return this._stateModel;
      }

      return this._stateModel.get.apply(this._stateModel, arguments);
    },

    /**
     * Destroy the stateClass and clean up any listeners on the _stateModel.
     *
     * @public
     * @method destroy
     * @memberOf StateClass
     */
    destroy: function destroy() {
      this._stateModel.stopListening();

      Marionette.Object.prototype.destroy.apply(this, arguments);
    }
  });

  var state_class = StateClass;

  var AbstractApp = state_class.extend({

    /**
     * Internal flag indiciate when `App` has started but has not yet stopped.
     *
     * @private
     * @type {Boolean}
     * @default false
     */
    _isRunning: false,

    /**
     * Internal flag indiciate when `App` has been destroyed
     *
     * @private
     * @type {Boolean}
     * @default false
     */
    _isDestroyed: false,

    /**
     * Set to true if a parent `App` should not be able to destroy this `App`.
     *
     * @type {Boolean|Function}
     * @default false
     */
    preventDestroy: false,

    /**
     * Set to true if `App` should be started after it is initialized.
     *
     * @type {Boolean|Function}
     * @default false
     */
    startAfterInitialized: false,

    /**
     * Set to true if `App` should be started after its parent starts.
     *
     * @type {Boolean|Function}
     * @default false
     */
    startWithParent: false,

    /**
     * Set to false if `App` should not stop after its parent stops.
     *
     * @type {Boolean|Function}
     * @default true
     */
    stopWithParent: true,

    /**
     * @public
     * @constructs AbstractApp
     * @param {Object} [options] - Settings for the App.
     * @param {Boolean} [options.startWithParent]
     * @param {Boolean} [options.stopWithParent]
     * @param {Boolean} [options.startAfterInitialized]
     * @param {Boolean} [options.preventDestroy]
     */
    constructor: function constructor(options) {
      options = _.extend({}, options);

      _.bindAll(this, "start", "stop");

      var pickOptions = ["startWithParent", "stopWithParent", "startAfterInitialized", "preventDestroy"];

      _.extend(this, _.pick(options, pickOptions));

      // Will call initialize
      state_class.call(this, options);

      if (_.result(this, "startAfterInitialized")) {
        this.start(options);
      }
    },

    /**
     * Internal helper to verify if `App` has been destroyed
     *
     * @private
     * @method _ensureAppIsIntact
     * @memberOf AbstractApp
     * @throws AppDestroyedError - Thrown if `App` has already been destroyed
     */
    _ensureAppIsIntact: function _ensureAppIsIntact() {
      if (this._isDestroyed) {
        throw new Marionette.Error({
          name: "AppDestroyedError",
          message: "App has already been destroyed and cannot be used."
        });
      }
    },

    /**
     * Gets the value of internal `_isRunning` flag
     *
     * @public
     * @method isRunning
     * @memberOf AbstractApp
     * @returns {Boolean}
     */
    isRunning: function isRunning() {
      return this._isRunning;
    },

    /**
     * Sets the app lifecycle to running.
     *
     * @public
     * @method start
     * @memberOf AbstractApp
     * @param {Object} [options] - Settings for the App passed through to events
     * @event AbstractApp#before:start - passes options
     * @returns {AbstractApp}
     */
    start: function start(options) {
      this._ensureAppIsIntact();

      if (this._isRunning) {
        return this;
      }

      this.triggerMethod("before:start", options);

      this._isRunning = true;

      this.triggerStart(options);

      return this;
    },

    /**
     * Triggers start event.
     * Override to introduce async start
     *
     * @public
     * @method triggerStart
     * @memberOf AbstractApp
     * @param {Object} [options] - Settings for the App passed through to events
     * @event AbstractApp#start - passes options
     * @returns
     */
    triggerStart: function triggerStart(options) {
      this.triggerMethod("start", options);
    },

    /**
     * Sets the app lifecycle to not running.
     * Removes any listeners added during the running state
     *
     * @public
     * @method stop
     * @memberOf AbstractApp
     * @param {Object} [options] - Settings for the App passed through to events
     * @event AbstractApp#before:stop - passes options
     * @event AbstractApp#stop - passes options
     * @returns {AbstractApp}
     */
    stop: function stop(options) {
      if (!this._isRunning) {
        return this;
      }

      this.triggerMethod("before:stop", options);

      this._isRunning = false;

      this.triggerMethod("stop", options);

      this._stopRunningListeners();
      this._stopRunningEvents();

      return this;
    },

    /**
     * Gets the value of internal `_isDestroyed` flag
     *
     * @public
     * @method isDestroyed
     * @memberOf AbstractApp
     * @returns {Boolean}
     */
    isDestroyed: function isDestroyed() {
      return this._isDestroyed;
    },

    /**
     * Stops the `App` and sets it destroyed.
     *
     * @public
     * @method destroy
     * @memberOf AbstractApp
     */
    destroy: function destroy() {
      if (this._isDestroyed) {
        return;
      }

      this._isDestroyed = true;

      this.stop();

      state_class.prototype.destroy.apply(this, arguments);
    },

    /**
     * Internal method to stop any registered events.
     *
     * @private
     * @method _stopRunningEvents
     * @memberOf AbstractApp
     */
    _stopRunningEvents: function _stopRunningEvents() {
      _.each(this._runningEvents, function (args) {
        this.off.apply(this, args);
      }, this);
    },

    /**
     * Internal method to stop any registered listeners.
     *
     * @private
     * @method _stopRunningListeners
     * @memberOf AbstractApp
     */
    _stopRunningListeners: function _stopRunningListeners() {
      _.each(this._runningListeningTo, function (args) {
        this.stopListening.apply(this, args);
      }, this);
    },

    /**
     * Overrides `Backbone.Event.on()`
     * If this `App` is running it will register the event for removal `onStop`
     *
     * @public
     * @method on
     * @memberOf AbstractApp
     * @returns {AbstractApp}
     */
    on: function on() {
      if (this._isRunning) {
        this._runningEvents = this._runningEvents || [];
        this._runningEvents.push(arguments);
      }
      return state_class.prototype.on.apply(this, arguments);
    },

    /**
     * Overrides `Backbone.Event.listenTo()`
     * If this `App` is running it will register the listener for removal `onStop`
     *
     * @public
     * @method listenTo
     * @memberOf AbstractApp
     * @returns {AbstractApp}
     */
    listenTo: function listenTo() {
      if (this._isRunning) {
        this._runningListeningTo = this._runningListeningTo || [];
        this._runningListeningTo.push(arguments);
      }
      return state_class.prototype.listenTo.apply(this, arguments);
    },

    /**
     * Overrides `Backbone.Event.listenToOnce()`
     * If this `App` is running it will register the listener for removal `onStop`
     *
     * @public
     * @method listenToOnce
     * @memberOf AbstractApp
     * @returns {AbstractApp}
     */
    listenToOnce: function listenToOnce() {
      if (this._isRunning) {
        this._runningListeningTo = this._runningListeningTo || [];
        this._runningListeningTo.push(arguments);
      }

      return state_class.prototype.listenToOnce.apply(this, arguments);
    }
  });

  var abstract_app = AbstractApp;

  var App = abstract_app.extend({

    /**
     * @public
     * @constructs App
     * @param {Object} [options] - Settings for the App.
     * @param {Object} [options.childApps] - Hash for setting up child apps.
     *
     * ```js
     * childApps: {
     *   appName: {
     *     AppClass: MyChildAppClass,
     *     fooOption: true,
     *     startWithParent: true
     *   },
     *   barApp: MyOtherChildAppClass
     * }
     * ```
     */
    constructor: function constructor(options) {
      options = _.extend({}, options);

      this._childApps = {};

      _.extend(this, _.pick(options, ["childApps"]));

      this._initChildApps(options);

      // The child apps should be handled while the app is running;
      // After start, before stop, and before destroy.
      this.on({
        start: this._startChildApps,
        "before:stop": this._stopChildApps,
        "before:destroy": this._destroyChildApps
      });

      abstract_app.call(this, options);
    },

    /**
     * Initializes `childApps` option
     *
     * @private
     * @method _initChildApps
     * @memberOf App
     */
    _initChildApps: function _initChildApps(options) {
      var childApps = this.childApps;

      if (childApps) {

        if (_.isFunction(childApps)) {
          childApps = childApps.call(this, options);
        }

        this.addChildApps(childApps);
      }
    },

    /**
     * Starts `childApps` if allowed by child
     *
     * @private
     * @method _startChildApps
     * @memberOf App
     */
    _startChildApps: function _startChildApps() {
      _.each(this._childApps, function (childApp) {
        if (_.result(childApp, "startWithParent")) {
          childApp.start();
        }
      });
    },

    /**
     * Stops `childApps` if allowed by child
     *
     * @private
     * @method _stopChildApps
     * @memberOf App
     */
    _stopChildApps: function _stopChildApps() {
      _.each(this._childApps, function (childApp) {
        if (_.result(childApp, "stopWithParent")) {
          childApp.stop();
        }
      });
    },

    /**
     * Destroys `childApps` if allowed by child
     *
     * @private
     * @method _destroyChildApps
     * @memberOf App
     */
    _destroyChildApps: function _destroyChildApps() {
      _.each(this._childApps, function (childApp) {
        if (!_.result(childApp, "preventDestroy")) {
          childApp.destroy();
        }
      });
    },

    /**
     * Internal helper to instantiate and `App` from on `Object`
     *
     * @private
     * @method _buildAppFromObject
     * @memberOf App
     * @param {Object} appConfig - `AppClass` and any other option for the `App`
     * @returns {App}
     */
    _buildAppFromObject: function _buildAppFromObject(appConfig) {
      var AppClass = appConfig.AppClass;
      var options = _.omit(appConfig, "AppClass");

      return this.buildApp(AppClass, options);
    },

    /**
     * Helper for building an App and return it
     *
     * @private
     * @method _buildApp
     * @memberOf App
     * @param {App} AppClass - An App Class
     * @param {Object} AppClass - Optionally passed as an appConfig Object
     * @param {Object} [options] - options for the AppClass
     * @returns {App}
     */
    _buildApp: function _buildApp(AppClass, options) {
      if (_.isFunction(AppClass)) {
        return this.buildApp(AppClass, options);
      }
      if (_.isObject(AppClass)) {
        return this._buildAppFromObject(AppClass);
      }
    },

    /**
     * Build an App and return it
     * Override for dynamic App building
     *
     * @public
     * @method buildApp
     * @memberOf App
     * @param {App} [AppClass] - An App Class
     * @param {Object} [options] - options for the AppClass
     * @returns {App}
     */
    buildApp: function buildApp(AppClass, options) {
      return new AppClass(options);
    },

    /**
     * Internal helper to verify `appName` is unique and not in use
     *
     * @private
     * @method _ensureAppIsUnique
     * @memberOf App
     * @param {String} appName - Name of app to test
     * @throws DuplicateChildAppError - Thrown if `App` already has an `appName` registered
     */
    _ensureAppIsUnique: function _ensureAppIsUnique(appName) {
      if (this._childApps[appName]) {
        throw new Marionette.Error({
          name: "DuplicateChildAppError",
          message: "A child App with name \"" + appName + "\" has already been added."
        });
      }
    },

    /**
     * Add child `App`s to this `App`
     *
     * @public
     * @method addChildApps
     * @memberOf App
     * @param {Object} childApps - Hash of names and `AppClass` or `appConfig`
     */
    addChildApps: function addChildApps(childApps) {
      _.each(childApps, function (childApp, appName) {
        this.addChildApp(appName, childApp);
      }, this);
    },

    /**
     * Build's childApp and registers it with this App
     * Starts the childApp, if this app is running and child is `startWithParent`
     *
     * @public
     * @method addChildApp
     * @memberOf App
     * @param {String} appName - Name of App to register
     * @param {App} AppClass - An App Class
     * @param {Object} AppClass - Optionally passed as an appConfig Object
     * @param {Object} [options] - options for the AppClass
     * @throws AddChildAppError - Thrown if no childApp could be built from params
     * @returns {App}
     */
    addChildApp: function addChildApp(appName, AppClass, options) {
      this._ensureAppIsUnique(appName);

      var childApp = this._buildApp(AppClass, options);

      if (!childApp) {
        throw new Marionette.Error({
          name: "AddChildAppError",
          message: "App build failed.  Incorrect configuration."
        });
      }

      childApp._name = appName;

      this._childApps[appName] = childApp;

      // When the app is destroyed remove the cached app.
      childApp.on("destroy", _.partial(this._removeChildApp, appName), this);

      if (this.isRunning() && _.result(childApp, "startWithParent")) {
        childApp.start();
      }

      return childApp;
    },

    /**
     * Returns registered child `App`s name
     *
     * @public
     * @method getName
     * @memberOf App
     * @returns {String}
     */
    getName: function getName() {
      return this._name;
    },

    /**
     * Returns registered child `App`s array
     *
     * @public
     * @method getChildApps
     * @memberOf App
     * @returns {Array}
     */
    getChildApps: function getChildApps() {
      return _.clone(this._childApps);
    },

    /**
     * Returns registered child `App`
     *
     * @public
     * @method getChildApp
     * @memberOf App
     * @param {String} appName - Name of App to retrieve
     * @returns {App}
     */
    getChildApp: function getChildApp(appName) {
      return this._childApps[appName];
    },

    /**
     * Internal helper.  Unregisters child `App`
     *
     * @private
     * @method _removeChildApp
     * @memberOf App
     * @param {String} appName - Name of App to unregister
     * @returns {App}
     */
    _removeChildApp: function _removeChildApp(appName) {
      delete this._childApps[appName]._name;
      delete this._childApps[appName];
    },

    /**
     * Removes all childApps and returns them.
     * The return is useful if any app is using `preventDestroy`
     *
     * @public
     * @method removeChildApps
     * @memberOf App
     * @returns {Array}
     */
    removeChildApps: function removeChildApps() {
      var childApps = this.getChildApps();

      _.each(this._childApps, function (childApp, appName) {
        this.removeChildApp(appName);
      }, this);

      return childApps;
    },

    /**
     * Destroys or removes registered child `App` by name
     * depending on `preventDestroy`
     *
     * @public
     * @method removeChildApp
     * @memberOf App
     * @param {String} appName - Name of App to destroy
     * @param {Object} [options.preventDestroy] - Flag to remove but prevent App destroy
     * @returns {App}
     */
    removeChildApp: function removeChildApp(appName, options) {
      options = _.extend({}, options);

      var childApp = this.getChildApp(appName);

      if (!childApp) {
        return;
      }

      // if preventDestroy simply unregister the child app
      if (options.preventDestroy || _.result(childApp, "preventDestroy")) {
        this._removeChildApp(appName);
      } else {
        childApp.destroy();
      }

      return childApp;
    }

  });

  var app = App;

  var Component = state_class.extend({

    /**
     * The view class to be managed.
     * @type {Mn.ItemView|Mn.CollectionView|Mn.CompositeView|Mn.LayoutView}
     * @default Marionette.ItemView
     */
    ViewClass: Marionette.ItemView,

    /**
     * Used as the prefix for events forwarded from
     * the component's view to the component
     * @type {String}
     * @default 'view'
     */
    viewEventPrefix: "view",

    /**
     * Options hash passed to the view when built.
     * @type {Object|Function}
     * @default '{}'
     */
    viewOptions: {},

    /**
     * @public
     * @constructs Component
     * @param {Object} [stateAttrs] - Attributes to set on the state model.
     * @param {Object} [options] - Settings for the component.
     * @param {Mn.ItemView|Mn.CollectionView|Mn.CompositeView|Mn.LayoutView=} [options.ViewClass]
     * - The view class to be managed.
     * @param {String} [options.viewEventPrefix]
     * - Used as the prefix for events forwarded from the component's view to the component
     * @param {Object} [options.viewOptions] - Options hash passed to an instantiated ViewClass.
     * @param {Marionette.Region} [options.region] - The region to show the component in.
     */
    constructor: function constructor(stateAttrs, options) {
      options = _.extend({}, options);

      // Make defaults available to this
      _.extend(this, _.pick(options, ["viewEventPrefix", "ViewClass", "viewOptions", "region"]));

      state_class.call(this, options);

      this._setStateDefaults(stateAttrs);
    },

    /**
     * Internal flag to determine if the component should destroy.
     * Set to false while showing the component's view in the component's region.
     *
     * @private
     * @type {Boolean}
     * @default true
     */
    _shouldDestroy: true,

    /**
     * Set the state model attributes to the initial
     * passed in attributes or any defaults set
     *
     * @private
     * @method _setStateDefaults
     * @memberOf Component
     * @param {Object} [stateAttrs] - Attributes to set on the state model
     */
    _setStateDefaults: function _setStateDefaults(stateAttrs) {
      this.setState(stateAttrs, { silent: true });
    },

    /**
     * Set the Component's region and then show it.
     *
     * @public
     * @method showIn
     * @memberOf Component
     * @param {Marionette.Region} region - The region for the component
     * @param {Object} [viewOptions] - Options hash mixed into the instantiated ViewClass.
     * @returns {Component}
     */
    showIn: function showIn(region, viewOptions) {
      this.region = region;

      this.show(viewOptions);

      return this;
    },

    /**
     * Show the Component in its region.
     *
     * @public
     * @event Component#before:show
     * @event Component#show
     * @throws ComponentShowError - Thrown if component has already been show.
     * @throws ComponentRegionError - Thrown if component has no defined region.
     * @method show
     * @param {Object} [viewOptions] - Options hash mixed into the instantiated ViewClass.
     * @memberOf Component
     * @returns {Component}
     */
    show: function show(viewOptions) {
      if (this._isShown) {
        throw new Marionette.Error({
          name: "ComponentShowError",
          message: "Component has already been shown in a region."
        });
      }

      if (!this.region) {
        throw new Marionette.Error({
          name: "ComponentRegionError",
          message: "Component has no defined region."
        });
      }

      this.triggerMethod("before:show");

      this.renderView(viewOptions);
      this._isShown = true;

      this.triggerMethod("show");

      // Destroy the component if the region is emptied because
      // it destroys the view
      this.listenTo(this.region, "empty", this._destroy);

      return this;
    },

    /**
     * Get the Component ViewClass class.
     * Checks if the `ViewClass` is a view class (the common case)
     * Then check if it's a function (which we assume that returns a view class)
     *
     * @private
     * @method _getViewClass
     * @memberOf Component
     * @param {Object} [options] - Options that can be used to determine the ViewClass.
     * @returns {View}
     */
    _getViewClass: function _getViewClass(options) {
      options = _.extend({}, options);

      var ViewClass = this.getOption("ViewClass");

      if (ViewClass.prototype instanceof Backbone.View || ViewClass === Backbone.View) {
        return ViewClass;
      } else if (_.isFunction(ViewClass)) {
        return ViewClass.call(this, options);
      } else {
        throw new Marionette.Error({
          name: "InvalidViewClassError",
          message: "\"ViewClass\" must be a view class or a function that returns a view class"
        });
      }
    },

    /**
     * Shows or re-shows a newly built view in the component's region
     *
     * @public
     * @event Component#before:render:view
     * @event Component#render:view
     * @method renderView
     * @memberOf Component
     * @param {Object} [options] - Options hash mixed into the instantiated ViewClass.
     * @returns {Component}
     */
    renderView: function renderView(options) {
      var ViewClass = this._getViewClass(options);

      var viewOptions = this.mixinOptions(options);

      var view = this.buildView(ViewClass, viewOptions);

      // Attach current built view to component
      this.currentView = view;

      this._proxyViewEvents(view);

      this.triggerMethod("before:render:view", view);

      // _shouldDestroy is flag that prevents the Component from being
      // destroyed if the region is emptied by Component itself.
      this._shouldDestroy = false;

      // Show the view in the region
      this.region.show(view);

      this._shouldDestroy = true;

      this.triggerMethod("render:view", view);

      return this;
    },

    /**
     * Proxies the ViewClass's viewEvents to the Component itself
     * Similar to CollectionView childEvents
     * (http://marionettejs.com/docs/v2.3.2/marionette.collectionview.html#collectionviews-childevents)
     *
     * @private
     * @method _proxyViewEvents
     * @memberOf Component
     * @param {Mn.ItemView|Mn.CollectionView|Mn.CompositeView|Mn.LayoutView} view -
     * The instantiated ViewClass.
     */
    _proxyViewEvents: function _proxyViewEvents(view) {
      var prefix = this.getOption("viewEventPrefix");

      view.on("all", function () {
        var args = _.toArray(arguments);
        var rootEvent = args[0];

        args[0] = prefix + ":" + rootEvent;
        args.splice(1, 0, view);

        this.triggerMethod.apply(this, args);
      }, this);
    },

    /**
     * Mixin stateModel from StateClass with any other viewOptions
     *
     * @public
     * @abstract
     * @method mixinOptions
     * @memberOf Component
     * @param {Object} [options] - Additional options to mixin
     * @returns {Object}
     */
    mixinOptions: function mixinOptions(options) {
      var viewOptions = _.result(this, "viewOptions");

      return _.extend({ stateModel: this.getState() }, viewOptions, options);
    },

    /**
     * Builds the view class with options
     * If you need a dynamic ViewClass override this function
     *
     * @public
     * @abstract
     * @method buildView
     * @memberOf Component
     * @param {Mn.ItemView|Mn.CollectionView|Mn.CompositeView|Mn.LayoutView} ViewClass -
     * The view class to instantiate.
     * @param {Object} [viewOptions] - Options to pass to the View
     * @returns {Mn.ItemView|Mn.CollectionView|Mn.CompositeView|Mn.LayoutView}
     */
    buildView: function buildView(ViewClass, viewOptions) {
      return new ViewClass(viewOptions);
    },

    /**
     * Destroys Component.
     *
     * @private
     * @method _destroy
     * @memberOf Component
     */
    _destroy: function _destroy() {
      if (this._shouldDestroy) {
        state_class.prototype.destroy.apply(this, arguments);
      }
    },

    /**
     * Empties component's region.
     *
     * @private
     * @method _emptyRegion
     * @param {Object} [options] - Options passed to `region.empty`
     * @memberOf Component
     */
    _emptyRegion: function _emptyRegion(options) {
      if (this.region) {
        this.stopListening(this.region, "empty");
        this.region.empty(options);
      }
    },

    /**
     * Empty the region and destroy the component.
     *
     * @public
     * @method destroy
     * @param {Object} [options] - Options passed to `_emptyRegion` and `destroy`
     * @memberOf Component
     */
    destroy: function destroy(options) {
      this._emptyRegion(options);

      this._shouldDestroy = true;

      this._destroy(options);
    }
  });

  var component = Component;

  var previousToolkit = Marionette.Toolkit;

  var Toolkit = Marionette.Toolkit = {};

  Toolkit.noConflict = function () {
    Marionette.Toolkit = previousToolkit;
    return this;
  };

  Toolkit.VERSION = "0.4.1";

  Toolkit.StateClass = state_class;

  Toolkit.App = app;

  Toolkit.Component = component;

  var marionette_toolkit = Toolkit;

  return marionette_toolkit;
});
//# sourceMappingURL=./marionette.toolkit.js.map