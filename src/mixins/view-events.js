export default {
  /**
   * Used as the prefix for events forwarded from
   * the component's view to the component
   * @type {String}
   * @default false
   */
  viewEventPrefix: false,

  /**
   * Constructs hashes and options for view event proxy
   *
   * @private
   * @method _buildEventProxies
   * @memberOf Component
   */
  _buildEventProxies() {
    const viewEvents = _.result(this, 'viewEvents') || {};
    this._viewEvents = this.normalizeMethods(viewEvents);
    this._viewTriggers = _.result(this, 'viewTriggers') || {};
    this._viewEventPrefix = _.result(this, 'viewEventPrefix');
  },

  /**
   * Proxies the ViewClass's viewEvents to the Component itself
   * Similar to CollectionView childEvents
   * (http://marionettejs.com/docs/v2.3.2/marionette.collectionview.html#collectionviews-childevents)
   *
   * @private
   * @method _proxyViewEvents
   * @memberOf Component
   * @param {Mn.View|Mn.CollectionView} view -
   * The instantiated ViewClass.
   */
  _proxyViewEvents(view) {
    this.listenTo(view, 'all', this._childViewEventHandler);
  },

  /**
   * Event handler for view proxy
   * Similar to CollectionView childEvents
   * (http://marionettejs.com/docs/v2.3.2/marionette.collectionview.html#collectionviews-childevents)
   *
   * @private
   * @method _childViewEventHandler
   * @memberOf Component
   * @param {String} - event name
   */
  _childViewEventHandler(eventName, ...args) {
    const viewEvents = this._viewEvents;

    if(_.isFunction(viewEvents[eventName])) {
      viewEvents[eventName].apply(this, args);
    }

    // use the parent view's proxyEvent handlers
    const viewTriggers = this._viewTriggers;

    // Call the event with the proxy name on the parent layout
    if(_.isString(viewTriggers[eventName])) {
      this.triggerMethod(viewTriggers[eventName], ...args);
    }

    const prefix = this._viewEventPrefix;

    if(prefix !== false) {
      const viewEventName = `${ prefix }:${ eventName }`;

      this.triggerMethod(viewEventName, ...args);
    }
  }
};
