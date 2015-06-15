// A proxy is a function that receives two arguments, a request object and a callback.
//
// If it can generate a respone, it calls callback with null and the response object.  Otherwise, either calls callback
// with no arguments, or with an error to stop the processing chain.
//
// The request consists of:
// url     - URL object
// method  - Request method (lower case)
// headers - Headers object (names are lower case)
// body    - Request body, an array of body part/encoding pairs
//
// The response consists of:
// version   - HTTP version
// status    - Status code
// headers   - Headers object (names are lower case)
// body      - Array of body parts
// trailers  - Trailers object (names are lower case)
//
// This file defines ProxyRequest, which acts as an HTTP ClientRequest that captures the request and passes it to the
// proxy chain, and ProxyResponse, which acts as an HTTP ClientResponse, playing back a response it received from the
// proxy.
//
// No actual proxies defined here.

'use strict';

var _inherits = require('babel-runtime/helpers/inherits')['default'];

var _get = require('babel-runtime/helpers/get')['default'];

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var _slicedToArray = require('babel-runtime/helpers/sliced-to-array')['default'];

var _Object$assign = require('babel-runtime/core-js/object/assign')['default'];

var assert = require('assert');

var _require = require('events');

var EventEmitter = _require.EventEmitter;

var HTTP = require('http');
var HTTPS = require('https');
var Stream = require('stream');
var URL = require('url');

// HTTP client request that captures the request and sends it down the processing chain.
module.exports = (function (_HTTP$IncomingMessage) {
  function ProxyRequest(options, proxy) {
    if (options === undefined) options = {};

    _classCallCheck(this, ProxyRequest);

    _get(Object.getPrototypeOf(ProxyRequest.prototype), 'constructor', this).call(this);
    this.proxy = proxy;
    this.method = (options.method || 'GET').toUpperCase();
    var protocol = options.protocol || options._defaultAgent && options._defaultAgent.protocol || 'http:';

    var _split = (options.host || options.hostname).split(':');

    var _split2 = _slicedToArray(_split, 2);

    var host = _split2[0];
    var port = _split2[1];

    var realPort = options.port || port || (protocol === 'https:' ? 443 : 80);
    this.url = URL.parse('' + protocol + '//' + (host || 'localhost') + ':' + realPort + '' + (options.path || '/'), true);
    this.auth = options.auth;
    this.agent = options.agent || (protocol === 'https:' ? HTTPS.globalAgent : HTTP.globalAgent);
    this.headers = {};
    if (options.headers) for (var _name in options.headers) {
      var value = options.headers[_name];
      if (value != null) this.headers[_name.toLowerCase()] = value.toString();
    }
  }

  _inherits(ProxyRequest, _HTTP$IncomingMessage);

  _createClass(ProxyRequest, [{
    key: 'flushHeaders',
    value: function flushHeaders() {}
  }, {
    key: 'setHeader',
    value: function setHeader(name, value) {
      assert(!this.ended, 'Already called end');
      assert(!this.body, 'Already wrote body parts');
      this.headers[name.toLowerCase()] = value;
    }
  }, {
    key: 'getHeader',
    value: function getHeader(name) {
      return this.headers[name.toLowerCase()];
    }
  }, {
    key: 'removeHeader',
    value: function removeHeader(name) {
      assert(!this.ended, 'Already called end');
      assert(!this.body, 'Already wrote body parts');
      delete this.headers[name.toLowerCase()];
    }
  }, {
    key: 'addTrailers',
    value: function addTrailers(trailers) {
      this.trailers = trailers;
    }
  }, {
    key: 'setTimeout',
    value: function setTimeout(timeout, callback) {
      if (callback) setImmediate(callback);
    }
  }, {
    key: 'setNoDelay',
    value: function setNoDelay() {}
  }, {
    key: 'setSocketKeepAlive',
    value: function setSocketKeepAlive() {}
  }, {
    key: 'write',
    value: function write(chunk, encoding, callback) {
      assert(!this.ended, 'Already called end');
      this.body = this.body || [];
      this.body.push([chunk, encoding]);
      if (callback) setImmediate(callback);
    }
  }, {
    key: 'end',
    value: function end(data, encoding, callback) {
      var _this = this;

      if (this.ended) return;
      assert(!this.ended, 'Already called end');

      if (typeof data === 'function') {
        ;
        var _ref = [data, null];
        callback = _ref[0];
        data = _ref[1];
      } else if (typeof encoding === 'function') {
        ;

        var _ref2 = [encoding, null];
        callback = _ref2[0];
        encoding = _ref2[1];
      }if (data) {
        this.body = this.body || [];
        this.body.push([data, encoding]);
      }
      this.ended = true;

      if (callback) setImmediate(callback);

      this.proxy(this, function (error, captured) {
        // We're not asynchronous, but clients expect us to callback later on
        setImmediate(function () {
          if (error) _this.emit('error', error);else if (captured) {
            var response = new ProxyResponse(captured);
            _this.emit('response', response);
            response.resume();
          } else {
            var _error = new Error('' + _this.method + ' ' + URL.format(_this.url) + ' refused: not recording and no network access');
            _error.code = 'ECONNREFUSED';
            _error.errno = 'ECONNREFUSED';
            _this.emit('error', _error);
          }
        });
      });
    }
  }, {
    key: 'flush',
    value: function flush() {}
  }, {
    key: 'abort',
    value: function abort() {}
  }]);

  return ProxyRequest;
})(HTTP.IncomingMessage);

// HTTP client response that plays back a captured response.

var ProxyResponse = (function (_Stream$Readable) {
  function ProxyResponse(captured) {
    var _this2 = this;

    _classCallCheck(this, ProxyResponse);

    _get(Object.getPrototypeOf(ProxyResponse.prototype), 'constructor', this).call(this);
    this.once('end', function () {
      _this2.emit('close');
    });

    this.httpVersion = captured.version || '1.1';
    this.httpVersionMajor = this.httpVersion.split('.')[0];
    this.httpVersionMinor = this.httpVersion.split('.')[1];
    this.statusCode = parseInt(captured.statusCode || 200, 10);
    this.statusMessage = captured.statusMessage || HTTP.STATUS_CODES[this.statusCode] || '';
    this.headers = _Object$assign({}, captured.headers);
    this.rawHeaders = captured.rawHeaders || [].slice(0);
    this.trailers = _Object$assign({}, captured.trailers);
    this.rawTrailers = (captured.rawTrailers || []).slice(0);
    // Not a documented property, but request seems to use this to look for HTTP parsing errors
    this.connection = new EventEmitter();
    this._body = captured.body.slice(0);
  }

  _inherits(ProxyResponse, _Stream$Readable);

  _createClass(ProxyResponse, [{
    key: '_read',
    value: function _read() {
      var part = this._body.shift();
      if (part) this.push(part[0], part[1]);else this.push(null);
    }
  }, {
    key: 'setTimeout',
    value: function setTimeout(msec, callback) {
      if (callback) setImmediate(callback);
    }
  }], [{
    key: 'notFound',
    value: function notFound(url) {
      return new ProxyResponse({
        status: 404,
        body: ['No recorded request/response that matches ' + URL.format(url)]
      });
    }
  }]);

  return ProxyResponse;
})(Stream.Readable);

/*nodelay = true*/ /*enable = false, initial*/
//# sourceMappingURL=proxy.js.map