var util = require('util'),
    EventEmitter = require('events').EventEmitter,
    debug = require('debug')('marionette-js-logger');

// remember this is invoked on the device not
// the current runtime so variable cannot be shared
function installHandler_onHost(logLimit) {
  Components.utils.import('resource://gre/modules/Services.jsm');

  // Copyright Joyent, Inc. and other Node contributors.
  //
  // Permission is hereby granted, free of charge, to any person obtaining a
  // copy of this software and associated documentation files (the
  // "Software"), to deal in the Software without restriction, including
  // without limitation the rights to use, copy, modify, merge, publish,
  // distribute, sublicense, and/or sell copies of the Software, and to permit
  // persons to whom the Software is furnished to do so, subject to the
  // following conditions:
  //
  // The above copyright notice and this permission notice shall be included
  // in all copies or substantial portions of the Software.
  //
  // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
  // OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
  // MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
  // NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
  // DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
  // OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
  // USE OR OTHER DEALINGS IN THE SOFTWARE.
  var util = (function() {
    var exports = {};

    var formatRegExp = /%[sdj%]/g;
    exports.format = function(f) {
      if (typeof f !== 'string') {
        var objects = [];
        for (var i = 0; i < arguments.length; i++) {
          objects.push(inspect(arguments[i]));
        }
        return objects.join(' ');
      }

      var i = 1;
      var args = arguments;
      var len = args.length;
      var str = String(f).replace(formatRegExp, function(x) {
        if (x === '%%') return '%';
        if (i >= len) return x;
        switch (x) {
          case '%s': return String(args[i++]);
          case '%d': return Number(args[i++]);
          case '%j': return JSON.stringify(args[i++]);
          default:
            return x;
        }
      });
      for (var x = args[i]; i < len; x = args[++i]) {
        if (x === null || typeof x !== 'object') {
          str += ' ' + x;
        } else {
          str += ' ' + inspect(x);
        }
      }
      return str;
    };

    /**
     * Echos the value of a value. Trys to print the value out
     * in the best way possible given the different types.
     *
     * @param {Object} obj The object to print out.
     * @param {Boolean} showHidden Flag that shows hidden (not enumerable)
     *    properties of objects.
     * @param {Number} depth Depth in which to descend in object. Default is 2.
     * @param {Boolean} colors Flag to turn on ANSI escape codes to color the
     *    output. Default is false (no coloring).
     */
    function inspect(obj, showHidden, depth, colors) {
      var ctx = {
        showHidden: showHidden,
        seen: [],
        stylize: colors ? stylizeWithColor : stylizeNoColor
      };
      return formatValue(ctx, obj, (typeof depth === 'undefined' ? 2 : depth));
    }
    exports.inspect = inspect;

    // http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
    var colors = {
      'bold' : [1, 22],
      'italic' : [3, 23],
      'underline' : [4, 24],
      'inverse' : [7, 27],
      'white' : [37, 39],
      'grey' : [90, 39],
      'black' : [30, 39],
      'blue' : [34, 39],
      'cyan' : [36, 39],
      'green' : [32, 39],
      'magenta' : [35, 39],
      'red' : [31, 39],
      'yellow' : [33, 39]
    };

    // Don't use 'blue' not visible on cmd.exe
    var styles = {
      'special': 'cyan',
      'number': 'yellow',
      'boolean': 'yellow',
      'undefined': 'grey',
      'null': 'bold',
      'string': 'green',
      'date': 'magenta',
      // "name": intentionally not styling
      'regexp': 'red'
    };


    function stylizeWithColor(str, styleType) {
      var style = styles[styleType];

      return str;
    }


    function stylizeNoColor(str, styleType) {
      return str;
    }


    function formatValue(ctx, value, recurseTimes) {
      // Provide a hook for user-specified inspect functions.
      // Check that value is an object with an inspect function on it
      if (value && typeof value.inspect === 'function' &&
          // Filter out the util module, it's inspect function is special
          value.inspect !== exports.inspect &&
          // Also filter out any prototype objects using the circular check.
          !(value.constructor && value.constructor.prototype === value)) {
        return value.inspect(recurseTimes);
      }

      // Primitive types cannot have properties
      var primitive = formatPrimitive(ctx, value);
      if (primitive) {
        return primitive;
      }

      // Look up the keys of the object.
      var visibleKeys = Object.keys(value);
      var keys = ctx.showHidden ? Object.getOwnPropertyNames(value) : visibleKeys;

      // Some type of object without properties can be shortcutted.
      if (keys.length === 0) {
        if (typeof value === 'function') {
          var name = value.name ? ': ' + value.name : '';
          return ctx.stylize('[Function' + name + ']', 'special');
        }
        if (isRegExp(value)) {
          return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
        }
        if (isDate(value)) {
          return ctx.stylize(Date.prototype.toString.call(value), 'date');
        }
        if (isError(value)) {
          return formatError(value);
        }
      }

      var base = '', array = false, braces = ['{', '}'];

      // Make Array say that they are Array
      if (isArray(value)) {
        array = true;
        braces = ['[', ']'];
      }

      // Make functions say that they are functions
      if (typeof value === 'function') {
        var n = value.name ? ': ' + value.name : '';
        base = ' [Function' + n + ']';
      }

      // Make RegExps say that they are RegExps
      if (isRegExp(value)) {
        base = ' ' + RegExp.prototype.toString.call(value);
      }

      // Make dates with properties first say the date
      if (isDate(value)) {
        base = ' ' + Date.prototype.toUTCString.call(value);
      }

      // Make error with message first say the error
      if (isError(value)) {
        base = ' ' + formatError(value);
      }

      if (keys.length === 0 && (!array || value.length == 0)) {
        return braces[0] + base + braces[1];
      }

      if (recurseTimes < 0) {
        if (isRegExp(value)) {
          return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
        } else {
          return ctx.stylize('[Object]', 'special');
        }
      }

      ctx.seen.push(value);

      var output;
      if (array) {
        output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
      } else {
        output = keys.map(function(key) {
          return formatProperty(
            ctx, value, recurseTimes, visibleKeys, key, array
          );
        });
      }

      ctx.seen.pop();

      return reduceToSingleString(output, base, braces);
    }


    function formatPrimitive(ctx, value) {
      switch (typeof value) {
        case 'undefined':
          return ctx.stylize('undefined', 'undefined');

        case 'string':
          var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                                   .replace(/'/g, "\\'")
                                                   .replace(/\\"/g, '"') + '\'';
          return ctx.stylize(simple, 'string');

        case 'number':
          return ctx.stylize('' + value, 'number');

        case 'boolean':
          return ctx.stylize('' + value, 'boolean');
      }
      // For some reason typeof null is "object", so special case here.
      if (value === null) {
        return ctx.stylize('null', 'null');
      }

      return null;
    }


    function formatError(value) {
      return '[' + Error.prototype.toString.call(value) + ']';
    }


    function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
      var output = [];
      for (var i = 0, l = value.length; i < l; ++i) {
        if (Object.prototype.hasOwnProperty.call(value, String(i))) {
          output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
              String(i), true));
        } else {
          output.push('');
        }
      }
      keys.forEach(function(key) {
        if (!key.match(/^\d+$/)) {
          output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
              key, true));
        }
      });
      return output;
    }


    function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
      var name, str, desc;
      desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
      if (desc.get) {
        if (desc.set) {
          str = ctx.stylize('[Getter/Setter]', 'special');
        } else {
          str = ctx.stylize('[Getter]', 'special');
        }
      } else {
        if (desc.set) {
          str = ctx.stylize('[Setter]', 'special');
        }
      }
      if (visibleKeys.indexOf(key) < 0) {
        name = '[' + key + ']';
      }
      if (!str) {
        if (ctx.seen.indexOf(desc.value) < 0) {
          if (recurseTimes === null) {
            str = formatValue(ctx, desc.value, null);
          } else {
            str = formatValue(ctx, desc.value, recurseTimes - 1);
          }
          if (str.indexOf('\n') > -1) {
            if (array) {
              str = str.split('\n').map(function(line) {
                return '  ' + line;
              }).join('\n').substr(2);
            } else {
              str = '\n' + str.split('\n').map(function(line) {
                return '   ' + line;
              }).join('\n');
            }
          }
        } else {
          str = ctx.stylize('[Circular]', 'special');
        }
      }
      if (typeof name === 'undefined') {
        if (array && key.match(/^\d+$/)) {
          return str;
        }
        name = JSON.stringify('' + key);
        if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
          name = name.substr(1, name.length - 2);
          name = ctx.stylize(name, 'name');
        } else {
          name = name.replace(/'/g, "\\'")
                     .replace(/\\"/g, '"')
                     .replace(/(^"|"$)/g, "'");
          name = ctx.stylize(name, 'string');
        }
      }

      return name + ': ' + str;
    }


    function reduceToSingleString(output, base, braces) {
      var numLinesEst = 0;
      var length = output.reduce(function(prev, cur) {
        numLinesEst++;
        if (cur.indexOf('\n') >= 0) numLinesEst++;
        return prev + cur.length + 1;
      }, 0);

      if (length > 60) {
        return braces[0] +
               (base === '' ? '' : base + '\n ') +
               ' ' +
               output.join(',\n  ') +
               ' ' +
               braces[1];
      }

      return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
    }


    // NOTE: These type checking functions intentionally don't use `instanceof`
    // because it is fragile and can be easily faked with `Object.create()`.
    function isArray(ar) {
      return Array.isArray(ar) ||
             (typeof ar === 'object' && objectToString(ar) === '[object Array]');
    }

    function isRegExp(re) {
      return typeof re === 'object' && objectToString(re) === '[object RegExp]';
    }

    function isDate(d) {
      return typeof d === 'object' && objectToString(d) === '[object Date]';
    }


    function isError(e) {
      return typeof e === 'object' && objectToString(e) === '[object Error]';
    }


    function objectToString(o) {
      return Object.prototype.toString.call(o);
    }

    return exports;
  }());


  var logs = [];

  var grabberGlobal = window.MARIONETTE_LOG_GRABBER = {
    _waitingCallback: null,

    grabAndClearLogs: function() {
      var retLogs = logs;
      logs = [];
      return retLogs;
    },

    _queueCallback: function() {
      var callback = this._waitingCallback;
      this._waitingCallback = null;
      window.setTimeout(function() {
        callback(this.grabAndClearLogs());
      }.bind(this), 0);
    },

    grabAtLeastOneLog: function(callback) {
      this._waitingCallback = callback;
      if (logs.length) {
        this._queueCallback();
      }
    },

    shutdown: function() {
      Services.obs.removeObserver(observer, 'console-api-log-event', false);
    }
  };

  var idCache = {};

  function observer(subject, topic, state) {
    var msg = subject.wrappedJSObject;

    // we key off the inner ID since that can theoretically change, but use
    // the outer ID to perform the lookup to get to the document.
    var origin = idCache[msg.innerID]; // there's also innerID
    if (!origin) {
      var idNum = parseInt(msg.ID, 10);
      if (!isNaN(idNum)) {
        var domWin = Services.wm.getOuterWindowWithId(idNum);
        if (domWin) {
          if (domWin.document && domWin.document.documentURI) {
            origin = domWin.document.documentURI;
          }
        }
      }
      idCache[msg.innerID] = origin;
    }

    // Immediately stringify so we don't keep any complicated object graphs
    // alive
    logs.push(JSON.stringify({
      window: origin,
      level: msg.level,
      message: util.format.apply(util, msg.arguments),
      filename: msg.filename,
      lineNumber: msg.lineNumber,
      functionName: msg.functionName,
      timeStamp: msg.timeStamp
    }));

    if (grabberGlobal._waitingCallback) {
      grabberGlobal._queueCallback();
    }

    if (logs.length > logLimit) {
      logs.shift();
    }
  }



  Services.obs.addObserver(observer, 'console-api-log-event', false);
}

function LogGrabber(client, logLimit) {
  this._logLimit = logLimit;

  // set scope to chrome so we can use privileged apis
  this._client = client.scope({
    context: 'chrome',
    searchTimeout: this.DEFAULT_TIMEOUT_MS
  });
}
util.inherits(LogGrabber, EventEmitter);

LogGrabber.prototype.DEFAULT_TIMEOUT_MS = 10 * 1000;

LogGrabber.prototype.setTimeout = function(timeoutMS) {
  this._client.setScriptTimeout(timeoutMS);
};

LogGrabber.prototype._connect = function(callback) {
  this._client.executeScript(installHandler_onHost, [this._logLimit], callback);
};

LogGrabber.prototype._processMessages = function(messages, specificHandler) {
  if (!specificHandler && this.listeners('message').length === 0) {
    return false;
  }

  var message, checkSpecific = !!specificHandler, foundIt = false;
  for (var i = 0; i < messages.length; i++) {
    try {
      message = JSON.parse(messages[i]);
    } catch (e) {
      debug('malformed JSON message payload');
    }
    // emit does not catch errors in handlers, so we should catch and report
    try {
      this.emit('message', message);
    }
    catch (e) {
      debug('emit(message) error:', e);
    }
    if (checkSpecific) {
      try {
        if (specificHandler(message)) {
          checkSpecific = false;
          foundIt = true;
        }
      }
      catch (e) {
        debug('specificHandler threw on a message:', e);
      }
    }
  }

  return foundIt;
};

/**
 * Explicitly fetch all available logs from the server, emitting 'message'
 * events.  This is a synchronous operation that does not wait around for
 * anything.
 *
 * It is critically important to note that Firefox's console.log batches things
 * with a 15ms initial delay so just because you know code must have already run
 * does not mean it has actually been logged yet.  If you are waiting for
 * something, please do *not* assume it will be in the logs.  Use
 * `waitForLogMessage()` in that case!
 */
LogGrabber.prototype.grabLogMessages = function(processFunc) {
  var messages = this._client.executeScript(function() {
    return window.MARIONETTE_LOG_GRABBER.grabAndClearLogs();
  }, []);
  return this._processMessages(messages, processFunc);
};

/**
 * Fetch all available logs from the server, but if there aren't any there yet,
 * wait for at least one new message to be logged.  This will wait for at least
 * one turn of the event loop before returning for efficiency reasons and to
 * avoid mistaken understandings of the state of the device.  Do not depend on
 * this to leave certain messages on the device.
 */
LogGrabber.prototype.grabAtLeastOneNewMessage = function(procFunc) {
  var messages = this._client.executeAsyncScript(function() {
    window.MARIONETTE_LOG_GRABBER.grabAtLeastOneLog(marionetteScriptFinished);
  }, []);
  return this._processMessages(messages, procFunc);
};

/**
 * Keep fetching logs from the server and calling the provided method until it
 * returns true indicating it found the log message it wanted.  'message' events
 * will still be emitted for all logs retrieved as a result of these calls.
 * While the function will only be called on messages until it returns true and
 * will not be called for any messages retrieved after the first call that
 * returns true, 'message' events will be emitted for ALL retrieved logs.  Also,
 * subsequent calls to waitForLogMessage will only call the function for newly
 * retrieved logs.
 *
 * If your check function throws an error, it's treated as if it returned false.
 * The rationale is that your function may see a lot of logs that it is not
 * prepared to deal with, but that it will be able to properly process the log
 * it is looking for.
 *
 * Your check function is called after the emit('message') is sent, so if you
 * have a listener subscribed to the event that does thorough processing that
 * is always triggered, it's okay for it to set a flag that this function just
 * returns.
 */
LogGrabber.prototype.waitForLogMessage = function(checkFunc) {
  while (!this.grabAtLeastOneNewMessage(checkFunc)) {
  }
};

module.exports.LogGrabber = LogGrabber;