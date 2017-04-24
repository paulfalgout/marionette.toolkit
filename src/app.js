import _ from 'underscore';
import Marionette from 'backbone.marionette';
import StateMixin from './mixins/state';
import ChildAppsMixin from './mixins/child-apps';
import EventListenersMixin from './mixins/event-listeners';
import ViewEventsMixin from './mixins/view-events';

const ClassOptions = [
  'startWithParent',
  'stopWithParent',
  'startAfterInitialized',
  'preventDestroy',
  'StateModel',
  'stateEvents'
];

/**
 * Marionette.Application with an `initialize` / `start` / `stop` / `destroy` lifecycle.
 *
 * @public
 * @class App
 * @memberOf Toolkit
 * @memberOf Marionette
 */
const App = Marionette.Application.extend({

  /**
   * Internal flag indiciate when `App` has started but has not yet stopped.
   *
   * @private
   * @type {Boolean}
   * @default false
   */
  _isRunning: false,

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
   * @constructs App
   * @param {Object} [options] - Settings for the App.
   * @param {Boolean} [options.startWithParent]
   * @param {Boolean} [options.stopWithParent]
   * @param {Boolean} [options.startAfterInitialized]
   * @param {Boolean} [options.preventDestroy]
   * @param {Object} [options.state] - Attributes to set on the state model.
   */
  constructor(options = {}) {
    this.mergeOptions(options, ClassOptions);

    this.options = _.extend({}, _.result(this, 'options'), options);

    // ViewEventMixin
    this._buildEventProxies();

    // ChildAppsMixin
    this._initChildApps(options);

    Marionette.Application.call(this, options);

    // Region may be set in Application constructor
    this._regionEventMonitor();

    if(_.result(this, 'startAfterInitialized')) {
      this.start(options);
    }
  },

  /**
   * Internal helper to verify if `App` has been destroyed
   *
   * @private
   * @method _ensureAppIsIntact
   * @memberOf App
   * @throws AppDestroyedError - Thrown if `App` has already been destroyed
   */
  _ensureAppIsIntact() {
    if(this._isDestroyed) {
      throw new Marionette.Error({
        name: 'AppDestroyedError',
        message: 'App has already been destroyed and cannot be used.'
      });
    }
  },

  /**
   * Gets the value of internal `_isRunning` flag
   *
   * @public
   * @method isRunning
   * @memberOf App
   * @returns {Boolean}
   */
  isRunning() {
    return this._isRunning;
  },

  /**
   * Gets the value of internal `_isRestarting` flag
   *
   * @public
   * @method isRestarting
   * @memberOf App
   * @returns {Boolean}
   */
  isRestarting() {
    return this._isRestarting;
  },

  /**
   * Sets the app lifecycle to running.
   *
   * @public
   * @method start
   * @memberOf App
   * @param {Object} [options] - Settings for the App passed through to events
   * @event App#before:start - passes options
   * @returns {App}
   */
  start(options = {}) {
    this._ensureAppIsIntact();

    if(this._isRunning) {
      return this;
    }

    if(options.region) {
      this.setRegion(options.region);
    }

    if(options.view) {
      this.setView(options.view);
    }

    // StateMixin
    this._initState(options);

    this.triggerMethod('before:start', options);

    this._isRunning = true;

    // StateMixin
    this.delegateStateEvents();

    this.triggerStart(options);

    return this;
  },


  /**
   * Sets the app lifecycle to not running
   * then sets the app lifecycle to running with ending state
   *
   * @public
   * @method restart
   * @memberOf App
   * @returns {App}
   */
  restart() {
    const state = this.getState().attributes;

    this._isRestarting = true;
    this.stop().start({ state });
    this._isRestarting = false;

    return this;
  },

  /**
   * Triggers start event.
   * Override to introduce async start
   *
   * @public
   * @method triggerStart
   * @memberOf App
   * @param {Object} [options] - Settings for the App passed through to events
   * @event App#start - passes options
   * @returns
   */
  triggerStart(options) {
    this.triggerMethod('start', options);
  },

  /**
   * Sets the app lifecycle to not running.
   * Removes any listeners added during the running state
   *
   * @public
   * @method stop
   * @memberOf App
   * @param {Object} [options] - Settings for the App passed through to events
   * @event App#before:stop - passes options
   * @event App#stop - passes options
   * @returns {App}
   */
  stop(options) {
    if(!this._isRunning) {
      return this;
    }

    this.triggerMethod('before:stop', options);

    this._isRunning = false;

    this.triggerMethod('stop', options);

    // Running events are cleaned up after stop so that
    // `stop` event handlers still fire
    this._stopRunningListeners();
    this._stopRunningEvents();

    return this;
  },

  /**
   * Stops the `App` and sets it destroyed.
   *
   * @public
   * @method destroy
   * @memberOf App
   */
  destroy() {
    if(this._isDestroyed) {
      return this;
    }

    this.stop();

    delete this._view;

    Marionette.Object.prototype.destroy.apply(this, arguments);

    return this;
  },

  /**
   * Set the Application's Region
   *
   * @public
   * @method setRegion
   * @memberOf App
   * @param {Region} [region] - Region to use with the app
   * @returns {Region}
   */
  setRegion(region) {
    if(this._region) {
      this.stopListening(this._region);
    }

    this._region = region;

    this._regionEventMonitor();

    return region;
  },

  _regionEventMonitor() {
    this.listenTo(this._region, 'before:show', this._onBeforeShow);
  },

  _onBeforeShow(region, view) {
    this.setView(view);
  },

  /**
   * Get the Application's Region or
   * Get a region from the Application's View
   *
   * @public
   * @method getRegion
   * @memberOf App
   * @param {String} [regionName] - Optional regionName to get from the view
   * @returns {Region}
   */
  getRegion(regionName) {
    if(!regionName) {
      return this._region;
    }

    return this.getView().getRegion(regionName);
  },

  /**
   * Set the Application's View
   *
   * @public
   * @method setView
   * @memberOf App
   * @param {View} [view] - View to use with the app
   * @returns {View}
   */
  setView(view) {
    if(this._view === view) {
      return view;
    }

    if(this._view) {
      this.stopListening(this._view);
    }

    this._view = view;

    // ViewEventsMixin
    this._proxyViewEvents(view);

    return view;
  },

  /**
   * Get the Application's View
   *
   * @public
   * @method getView
   * @memberOf App
   * @returns {View}
   */
  getView() {
    return this._view;
  },

  /**
   * Shows a view in the Application's region
   *
   * @public
   * @method showView
   * @param {View} view - Child view instance defaults to App's view
   * @param {...args} Additional args that get passed along
   * @returns {View}
   */
  showView(view = this._view, ...args) {
    this.getRegion().show(view, ...args);

    return view;
  },

  /**
   * Shows a view in the region of the app's view
   *
   * @public
   * @method showChildView
   * @param {String} regionName - Name of region to show in
   * @param {View} view - Child view instance
   * @param {...args} Additional args that get passed along
   * @returns {View} - Child view instance
   */
  showChildView(regionName, view, ...args) {
    this.getView().showChildView(regionName, view, ...args);

    return view;
  },

  /**
   * Returns view from the App view by region name.
   *
   * @public
   * @method getChildView
   * @param {String} regionName - Name of region to get view from
   * @returns {View}
   */
  getChildView(regionName) {
    return this.getView().getChildView(regionName);
  }
});

_.extend(App.prototype, StateMixin, ChildAppsMixin, EventListenersMixin, ViewEventsMixin);

export default App;
