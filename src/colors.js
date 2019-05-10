'use strict';

// ANSI color helpers (no external deps)
const ANSI = {
  red:     s => '\x1b[31m' + s + '\x1b[0m',
  yellow:  s => '\x1b[33m' + s + '\x1b[0m',
  cyan:    s => '\x1b[36m' + s + '\x1b[0m',
  green:   s => '\x1b[32m' + s + '\x1b[0m',
  gray:    s => '\x1b[90m' + s + '\x1b[0m',
  blue:    s => '\x1b[34m' + s + '\x1b[0m',
  magenta: s => '\x1b[35m' + s + '\x1b[0m',
  white:   s => '\x1b[37m' + s + '\x1b[0m',
};

function getStatusColor(s) {
  if (s >= 500) return ANSI.red;
  if (s >= 400) return ANSI.yellow;
  if (s >= 300) return ANSI.cyan;
  if (s >= 200) return ANSI.green;
  return ANSI.gray;
}

function getMethodColor(m) {
  const c = {
    GET:    ANSI.green,
    POST:   ANSI.yellow,
    PUT:    ANSI.blue,
    PATCH:  ANSI.cyan,
    DELETE: ANSI.red,
    HEAD:   ANSI.magenta,
  };
  return c[m] || ANSI.white;
}

function getTimingColor(ms) {
  if (ms < 100) return ANSI.green;
  if (ms < 500) return ANSI.yellow;
  return ANSI.red;
}

module.exports = { getStatusColor, getMethodColor, getTimingColor };
