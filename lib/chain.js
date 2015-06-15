// Processing chain: pass each request through a list of handlers
//
// Each handler called with ClientRequest object and must pass control to
// callback with either error, ServerResponse object, or no arguments to pass
// control to the next handler.

"use strict";

var _createClass = require("babel-runtime/helpers/create-class")["default"];

var _classCallCheck = require("babel-runtime/helpers/class-call-check")["default"];

module.exports = (function () {
  function Chain() {
    _classCallCheck(this, Chain);

    // Linked list of handlers; each handler has a reference to the next one
    this.first = null;
    this.last = null;
  }

  _createClass(Chain, [{
    key: "append",

    // Appends a handler to the chain (invoked before all other handlers)
    value: function append(handler) {
      var layer = this._wrap(handler);
      this.first = this.first || layer;
      if (this.last) this.last.next = layer;
      this.last = layer;
      return this;
    }
  }, {
    key: "prepend",

    // Prepends a handler to the chain (invoked after all other handlers)
    value: function prepend(handler) {
      var layer = this._wrap(handler);
      layer.next = this.first;
      this.first = layer;
      this.last = this.last || layer;
      return this;
    }
  }, {
    key: "clear",

    // Clears the chain of all its handlers
    value: function clear() {
      this.first = this.last = null;
    }
  }, {
    key: "_wrap",

    // Wraps a handler and returns a function that will invoke this handler, and
    // if the handler does not return a response, pass control to the next handler
    // in the chain
    value: function _wrap(handler) {
      function layer(request, callback) {
        handler(request, function (error, response) {
          if (error || response) callback(error, response);else if (layer.next) layer.next(request, callback);else callback();
        });
      }
      return layer;
    }
  }, {
    key: "start",

    // Returns the first handler in the chain
    get: function () {
      return this.first;
    }
  }]);

  return Chain;
})();
//# sourceMappingURL=chain.js.map