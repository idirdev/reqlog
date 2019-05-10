'use strict';

/**
 * @module reqlog
 * @description HTTP request logging middleware for Node.js servers.
 * @author idirdev
 */

/**
 * ANSI color codes used for terminal output.
 * @type {Object.<string,string>}
 */
const COLORS = {
  reset:   '[0m',
  bold:    '[1m',
  black:   '[30m',
  red:     '[31m',
  green:   '[32m',
  yellow:  '[33m',
  blue:    '[34m',
  magenta: '[35m',
  cyan:    '[36m',
  white:   '[37m',
  gray:    '[90m',
};

/**
 * Predefined log format strings.
 * Tokens: :method :url :status :response-time :content-length :remote-addr :user-agent :date
 * @type {Object.<string,string>}
 */
const FORMATS = {
  combined: ':remote-addr - [:date] ":method :url" :status :content-length ":user-agent" :response-time ms',
  short:    ':remote-addr :method :url :status :content-length - :response-time ms',
  dev:      ':method :url :status :response-time ms - :content-length',
  tiny:     ':method :url :status :content-length - :response-time ms',
};

/**
 * Returns an ANSI color code for a given HTTP status code.
 * @param {number} code - HTTP status code.
 * @returns {string} ANSI escape sequence.
 */
function getStatusColor(code) {
  if (code >= 500) return COLORS.red;
  if (code >= 400) return COLORS.yellow;
  if (code >= 300) return COLORS.cyan;
  if (code >= 200) return COLORS.green;
  return COLORS.white;
}

/**
 * Returns an ANSI color code for a given HTTP method.
 * @param {string} method - HTTP method (GET, POST, etc.).
 * @returns {string} ANSI escape sequence.
 */
function getMethodColor(method) {
  const map = {
    GET:     COLORS.green,
    POST:    COLORS.blue,
    PUT:     COLORS.yellow,
    PATCH:   COLORS.magenta,
    DELETE:  COLORS.red,
    HEAD:    COLORS.cyan,
    OPTIONS: COLORS.gray,
  };
  return map[method] || COLORS.white;
}

/**
 * Formats a byte count into a human-readable string.
 * @param {number|string} n - Number of bytes.
 * @returns {string} Formatted string, e.g. "1.23 KB".
 */
function formatBytes(n) {
  const num = parseInt(n, 10);
  if (isNaN(num) || num === 0) return '-';
  if (num < 1024) return num + ' B';
  if (num < 1048576) return (num / 1024).toFixed(2) + ' KB';
  return (num / 1048576).toFixed(2) + ' MB';
}

/**
 * Resolves the remote address from a request object.
 * @param {object} req - Node.js IncomingMessage.
 * @returns {string} IP address string.
 */
function getRemoteAddr(req) {
  const forwarded = req.headers && req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return (req.socket && req.socket.remoteAddress) ||
         (req.connection && req.connection.remoteAddress) || '-';
}

/**
 * Replaces all tokens in a format string with actual request/response values.
 * @param {string}  fmt       - Format string containing tokens.
 * @param {object}  req       - Node.js IncomingMessage.
 * @param {object}  res       - Node.js ServerResponse.
 * @param {number}  startTime - Request start timestamp (ms).
 * @param {boolean} colorize  - Whether to apply ANSI colors.
 * @returns {string} Formatted log line.
 */
function applyTokens(fmt, req, res, startTime, colorize) {
  const elapsed   = (Date.now() - startTime).toFixed(3);
  const status    = res.statusCode || 0;
  const len       = res.getHeader ? res.getHeader('content-length') : '-';
  const method    = req.method || '-';
  const reqUrl    = req.url || '-';
  const statusStr = String(status);
  const lenStr    = formatBytes(len);
  const addr      = getRemoteAddr(req);
  const ua        = (req.headers && req.headers['user-agent']) || '-';
  const dateStr   = new Date().toUTCString();

  const line = fmt
    .replace(':method',         colorize ? getMethodColor(method) + method + COLORS.reset : method)
    .replace(':url',            reqUrl)
    .replace(':status',         colorize ? getStatusColor(status) + statusStr + COLORS.reset : statusStr)
    .replace(':response-time',  colorize ? COLORS.gray + elapsed + COLORS.reset : elapsed)
    .replace(':content-length', lenStr)
    .replace(':remote-addr',    addr)
    .replace(':user-agent',     ua)
    .replace(':date',           dateStr);

  return line;
}

/**
 * Attaches a 'finish' listener to the response that emits the log line.
 * @param {object} req       - Node.js IncomingMessage.
 * @param {object} res       - Node.js ServerResponse.
 * @param {number} startTime - Request start timestamp (ms).
 * @param {string} fmt       - Resolved format string.
 * @param {object} opts      - Middleware options.
 */
function onFinish(req, res, startTime, fmt, opts) {
  res.once('finish', function logFinish() {
    try {
      if (opts.skip && opts.skip(req, res)) return;
      const line   = applyTokens(fmt, req, res, startTime, opts.colorize !== false);
      const stream = opts.stream || process.stdout;
      stream.write(line + String.fromCharCode(10));
    } catch (_) {
      // never throw from a log listener
    }
  });
}

/**
 * Creates HTTP request logging middleware.
 *
 * @param {object|string}           [opts={}]             - Options or format name shorthand.
 * @param {string|string}           [opts.format='dev']   - Format name or custom format string.
 * @param {NodeJS.WritableStream}   [opts.stream]         - Output stream (default: process.stdout).
 * @param {Function}                [opts.skip]           - fn(req,res) => bool; skip when true.
 * @param {boolean}                 [opts.immediate=false]- Log on arrival instead of finish.
 * @param {boolean}                 [opts.colorize=true]  - Apply ANSI colors.
 * @returns {Function} Express/Connect middleware: function(req, res, next).
 *
 * @example
 * const reqlog = require('@idirdev/reqlog');
 * app.use(reqlog({ format: 'dev', colorize: true }));
 */
function reqlog(opts) {
  if (typeof opts === 'string') opts = { format: opts };
  opts = opts || {};

  const formatInput = opts.format || 'dev';
  const fmt = (typeof formatInput === 'string' && FORMATS[formatInput])
    ? FORMATS[formatInput]
    : String(formatInput);

  /**
   * Middleware function.
   * @param {object}   req  - Node.js IncomingMessage.
   * @param {object}   res  - Node.js ServerResponse.
   * @param {Function} next - Next middleware callback.
   */
  return function middleware(req, res, next) {
    const startTime = Date.now();

    if (opts.immediate) {
      try {
        if (!opts.skip || !opts.skip(req, res)) {
          const line   = applyTokens(fmt, req, res, startTime, opts.colorize !== false);
          const stream = opts.stream || process.stdout;
          stream.write(line + String.fromCharCode(10));
        }
      } catch (_) {
        // never throw from logger
      }
    } else {
      onFinish(req, res, startTime, fmt, opts);
    }

    if (typeof next === 'function') next();
  };
}

reqlog.FORMATS        = FORMATS;
reqlog.getStatusColor = getStatusColor;
reqlog.getMethodColor = getMethodColor;
reqlog.formatBytes    = formatBytes;

module.exports = reqlog;
