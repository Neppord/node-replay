// A matcher is a function that, given a request, returns an appropriate response or nothing.
//
// The most common use case is to calling `Matcher.fromMapping(mapping)`.
//
// The request consists of:
// url     - URL object
// method  - Request method (lower case)
// headers - Headers object (names are lower case)
// body    - Request body (for some requests)
//
// The response consists of:
// version   - HTTP version
// status    - Status code
// headers   - Headers object (names are lower case)
// body      - Array of body parts
// trailers  - Trailers object (names are lower case)

'use strict';

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var _getIterator = require('babel-runtime/core-js/get-iterator')['default'];

var assert = require('assert');
var URL = require('url');
var jsStringEscape = require('js-string-escape');

// Simple implementation of a matcher.
//
// To create a matcher from request/response mapping use `fromMapping`.
module.exports = (function () {
  function Matcher(request, response) {
    _classCallCheck(this, Matcher);

    // Map requests to object properties.  We do this for quick matching.
    assert(request.url || request.regexp, 'I need at least a URL to match request to response');
    if (request.regexp) {
      this.hostname = request.hostname;
      this.regexp = request.regexp;
    } else {
      var url = URL.parse(request.url);
      this.hostname = url.hostname;
      this.port = url.port;
      this.path = url.path;
    }

    this.method = request.method && request.method.toUpperCase() || 'GET';
    this.headers = {};
    if (request.headers) for (var _name in request.headers) {
      var value = request.headers[_name];
      this.headers[_name.toLowerCase()] = value;
    }
    this.body = request.body;

    // Create a normalized response object that we return.
    this.response = {
      version: response.version || '1.1',
      statusCode: response.statusCode && parseInt(response.statusCode, 10) || 200,
      statusMessage: response.statusMessage || '',
      headers: {},
      body: response.body ? response.body.slice(0) : [],
      trailers: {}
    };

    // Copy over header to response, downcase header names.
    if (response.headers) {
      var headers = this.response.headers;
      for (var _name2 in response.headers) {
        var value = response.headers[_name2];
        headers[_name2.toLowerCase()] = value;
      }
    }
    // Copy over trailers to response, downcase trailers names.
    if (response.trailers) {
      var trailers = this.response.trailers;
      for (var _name3 in response.trailers) {
        var value = response.trailers[_name3];
        trailers[_name3.toLowerCase()] = value;
      }
    }
  }

  _createClass(Matcher, [{
    key: 'match',

    // Quick and effective matching.
    value: function match(request) {
      var url = request.url;
      var method = request.method;
      var headers = request.headers;
      var body = request.body;

      if (this.hostname && this.hostname !== url.hostname) return false;
      if (this.regexp) {
        if (!this.regexp.test(url.path)) return false;
      } else {
        if (this.port && this.port !== url.port) return false;
        if (this.path && this.path !== url.path) return false;
      }
      if (this.method !== method) return false;

      for (var _name4 in this.headers) {
        if (this.headers[_name4] !== headers[_name4]) return false;
      }
      if (body) {
        var data = '';
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = _getIterator(body), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var chunks = _step.value;

            data += chunks[0];
          }
        } catch (err) {
          _didIteratorError = true;
          _iteratorError = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion && _iterator['return']) {
              _iterator['return']();
            }
          } finally {
            if (_didIteratorError) {
              throw _iteratorError;
            }
          }
        }

        data = jsStringEscape(data);
        if (this.body && this.body !== data) return false;
      }
      return true;
    }
  }], [{
    key: 'fromMapping',

    // Returns new matcher function based on the supplied mapping.
    //
    // Mapping can contain `request` and `response` object.  As shortcut, mapping can specify `path` and `method` (optional)
    // directly, and also any of the response properties.
    value: function fromMapping(host, mapping) {
      assert(!!mapping.path ^ !!mapping.request, 'Mapping must specify path or request object');

      var matchingRequest = undefined;
      if (mapping.path) matchingRequest = {
        url: URL.resolve('http://' + host + '/', mapping.path),
        method: mapping.method
      };else if (mapping.request.url instanceof RegExp) matchingRequest = {
        host: host,
        regexp: mapping.request.url,
        method: mapping.request.method,
        headers: mapping.request.headers,
        body: mapping.request.body
      };else matchingRequest = {
        url: URL.resolve('http://' + host, mapping.request.url),
        method: mapping.request.method,
        headers: mapping.request.headers,
        body: mapping.request.body
      };

      var matcher = new Matcher(matchingRequest, mapping.response || {});
      return function (request) {
        if (matcher.match(request)) return matcher.response;
      };
    }
  }]);

  return Matcher;
})();
//# sourceMappingURL=matcher.js.map