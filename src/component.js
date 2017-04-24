import _ from 'underscore';
import Backbone from 'backbone';
import Marionette from 'backbone.marionette';
import StateMixin from './mixins/state';
import ViewEventsMixin from './mixins/view-events';

const ClassOptions = [
  'ViewClass',
  'viewEventPrefix',
  'viewOptions',
  'region'
];

/**
 * Reusable Marionette.Object with View management boilerplate
 *
 * @public
 * @class Component
 * @memberOf Toolkit
 * @memberOf Marionette
 */
const Component = Marionette.Object.extend({

  /**
   * The view class to be managed.
   * @type {Mn.View|Mn.CollectionView}
   * @default Marionette.View
   */
  ViewClass: Marionette.View,

  /**
   * @public
   * @constructs Component
   * @param {Object} [options] - Settings for the component.
   * @param {Object} [options.state] - Attributes to set on the state model.
   * @param {Mn.View|Mn.CollectionView} [options.ViewClass]
   * - The view class to be managed.
   * @param {String} [options.viewEventPrefix]
   * - Used as the prefix for events forwarded from the component's view to the component
   * @param {Object} [options.viewOptions] - Options hash passed to an instantiated ViewClass.
   * @param {Marionette.Region} [options.region] - The region to show the component in.
   */
  constructor(options = {}) {
    // Make defaults available to this
    this.mergeOptions(options, ClassOptions);

    this.options = _.extend({}, _.result(this, 'options'), options);

    // ViewEventMixin
    this._buildEventProxies();

    // StateMixin
    this._initState(options);

    Marionette.Object.call(this, options);

    // StateMixin
    this.delegateStateEvents();
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
   * Set the Component's region and then show it.
   *
   * @public
   * @method showIn
   * @memberOf Component
   * @param {Marionette.Region} region - The region for the component
   * @param {Object} [viewOptions] - Options hash mixed into the instantiated ViewClass.
   * @returns {Component}
   */
  showIn(region, viewOptions) {
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
  show(viewOptions) {
    const region = this.getRegion();

    if(this._isShown) {
      throw new Marionette.Error({
        name: 'ComponentShowError',
        message: 'Component has already been shown in a region.'
      });
    }

    if(!region) {
      throw new Marionette.Error({
        name: 'ComponentRegionError',
        message: 'Component has no defined region.'
      });
    }

    this.triggerMethod('before:show');

    this.renderView(viewOptions);
    this._isShown = true;

    this.triggerMethod('show');

    // Destroy the component if the region is emptied because
    // it destroys the view
    this.listenTo(region, 'empty', this._destroy);

    return this;
  },

  /**
   * Returns component region.
   *
   * @public
   * @method getRegion
   * @memberOf Component
   * @returns Component region
   */
  getRegion() {
    return this.region;
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
  _getViewClass(options = {}) {
    const ViewClass = this.ViewClass;

    if(ViewClass.prototype instanceof Backbone.View || ViewClass === Backbone.View) {
      return ViewClass;
    } else if(_.isFunction(ViewClass)) {
      return ViewClass.call(this, options);
    }

    throw new Marionette.Error({
      name: 'InvalidViewClassError',
      message: '"ViewClass" must be a view class or a function that returns a view class'
    });
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
  renderView(options) {
    const ViewClass = this._getViewClass(options);

    const viewOptions = this.mixinOptions(options);

    const view = this.buildView(ViewClass, viewOptions);

    // Attach current built view to component
    this.currentView = view;

    // ViewEventMixin
    this._proxyViewEvents(view);

    this.triggerMethod('before:render:view', view);

    // _shouldDestroy is flag that prevents the Component from being
    // destroyed if the region is emptied by Component itself.
    this._shouldDestroy = false;

    // Show the view in the region
    this.getRegion().show(view);

    this._shouldDestroy = true;

    this.triggerMethod('render:view', view);

    return this;
  },

  /**
   * Mixin initial State with any other viewOptions
   *
   * @public
   * @abstract
   * @method mixinOptions
   * @memberOf Component
   * @param {Object} [options] - Additional options to mixin
   * @returns {Object}
   */
  mixinOptions(options) {
    const viewOptions = _.result(this, 'viewOptions');

    return _.extend({ state: this.getState().attributes }, viewOptions, options);
  },

  /**
   * Builds the view class with options
   * If you need a dynamic ViewClass override this function
   *
   * @public
   * @abstract
   * @method buildView
   * @memberOf Component
   * @param {Mn.View|Mn.CollectionView} ViewClass -
   * The view class to instantiate.
   * @param {Object} [viewOptions] - Options to pass to the View
   * @returns {Mn.View|Mn.CollectionView}
   */
  buildView(ViewClass, viewOptions) {
    return new ViewClass(viewOptions);
  },

  /**
   * Destroys Component.
   *
   * @private
   * @method _destroy
   * @memberOf Component
   */
  _destroy() {
    if(this._shouldDestroy) {
      Marionette.Object.prototype.destroy.apply(this, arguments);
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
  _emptyRegion(options) {
    const region = this.getRegion();

    if(region) {
      this.stopListening(region, 'empty');
      region.empty(options);
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
  destroy(options) {
    this._emptyRegion(options);

    this._shouldDestroy = true;

    this._destroy(options);

    return this;
  }
});

_.extend(Component.prototype, StateMixin, ViewEventsMixin);

export default Component;
