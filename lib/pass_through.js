'use strict';

var _getIterator = require('babel-runtime/core-js/get-iterator')['default'];

var HTTP = require('http');

var ClientRequest = HTTP.ClientRequest;

module.exports = function passThrough(passThroughFunction) {
  if (arguments.length === 0) passThroughFunction = function () {
    return true;
  };else if (typeof passThrough === 'string') {
    (function () {
      var hostname = passThroughFunction;
      passThroughFunction = function (request) {
        return request.hostname === hostname;
      };
    })();
  } else if (typeof passThroughFunction !== 'function') {
    (function () {
      var truthy = !!passThroughFunction;
      passThroughFunction = function () {
        return truthy;
      };
    })();
  }

  return function (request, callback) {
    if (passThroughFunction(request)) {
      var options = {
        protocol: request.url.protocol,
        hostname: request.url.hostname,
        port: request.url.port,
        path: request.url.path,
        method: request.method,
        headers: request.headers,
        agent: request.agent,
        auth: request.auth
      };

      var http = new ClientRequest(options);
      if (request.trailers) http.addTrailers(request.trailers);
      http.on('error', callback);
      http.on('response', function (response) {
        var captured = {
          version: response.httpVersion,
          statusCode: response.statusCode,
          statusMessage: response.statusMessage,
          headers: response.headers,
          rawHeaders: response.rawHeaders,
          body: []
        };
        response.on('data', function (chunk, encoding) {
          captured.body.push([chunk, encoding]);
        });
        response.on('end', function () {
          captured.trailers = response.trailers;
          captured.rawTrailers = response.rawTrailers;
          callback(null, captured);
        });
      });

      if (request.body) {
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = _getIterator(request.body), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var _part = _step.value;

            http.write(_part[0], _part[1]);
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
      }http.end();
    } else callback();
  };
};
//# sourceMappingURL=pass_through.js.map