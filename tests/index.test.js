'use strict';

/**
 * @file tests/index.test.js
 * @description Tests for @idirdev/reqlog middleware.
 * @author idirdev
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const reqlog = require('../src/index.js');

/**
 * Creates a minimal mock request object.
 * @param {object} [overrides] - Property overrides.
 * @returns {object} Mock request.
 */
function mockReq(overrides) {
  return Object.assign({
    method:  'GET',
    url:     '/test',
    headers: { 'user-agent': 'test-agent', 'x-forwarded-for': '1.2.3.4' },
    socket:  { remoteAddress: '127.0.0.1' },
  }, overrides);
}

/**
 * Creates a minimal mock response with event-emitter for 'finish'.
 * @param {number} [statusCode=200]
 * @returns {object} Mock response.
 */
function mockRes(statusCode) {
  const listeners = {};
  return {
    statusCode: statusCode || 200,
    getHeader: (name) => name === 'content-length' ? '1024' : null,
    once: (event, fn) => { listeners[event] = fn; },
    emit: (event) => { if (listeners[event]) listeners[event](); },
  };
}

describe('reqlog exports', () => {
  test('module exports a function', () => {
    assert.equal(typeof reqlog, 'function');
  });

  test('FORMATS contains expected keys', () => {
    assert.ok(reqlog.FORMATS.combined);
    assert.ok(reqlog.FORMATS.short);
    assert.ok(reqlog.FORMATS.dev);
    assert.ok(reqlog.FORMATS.tiny);
  });

  test('formatBytes handles various inputs', () => {
    assert.equal(reqlog.formatBytes(0), '-');
    assert.equal(reqlog.formatBytes(500), '500 B');
    assert.match(reqlog.formatBytes(2048), /KB/);
    assert.match(reqlog.formatBytes(2097152), /MB/);
  });

  test('getStatusColor returns string for each range', () => {
    assert.equal(typeof reqlog.getStatusColor(200), 'string');
    assert.equal(typeof reqlog.getStatusColor(301), 'string');
    assert.equal(typeof reqlog.getStatusColor(404), 'string');
    assert.equal(typeof reqlog.getStatusColor(500), 'string');
  });

  test('getMethodColor returns string for known methods', () => {
    assert.equal(typeof reqlog.getMethodColor('GET'), 'string');
    assert.equal(typeof reqlog.getMethodColor('POST'), 'string');
    assert.equal(typeof reqlog.getMethodColor('DELETE'), 'string');
  });
});

describe('reqlog middleware', () => {
  test('returns a middleware function', () => {
    const mw = reqlog({ format: 'dev' });
    assert.equal(typeof mw, 'function');
  });

  test('calls next()', () => {
    const mw = reqlog({ format: 'tiny' });
    let called = false;
    mw(mockReq(), mockRes(), () => { called = true; });
    assert.equal(called, true);
  });

  test('logs to custom stream on finish', () => {
    let output = '';
    const stream = { write: (s) => { output += s; } };
    const mw  = reqlog({ format: 'tiny', stream, colorize: false });
    const req = mockReq();
    const res = mockRes(200);
    mw(req, res, () => {});
    res.emit('finish');
    assert.ok(output.length > 0);
    assert.match(output, /GET/);
    assert.match(output, /\/test/);
  });

  test('skip function suppresses output', () => {
    let output = '';
    const stream = { write: (s) => { output += s; } };
    const mw  = reqlog({ format: 'tiny', stream, colorize: false, skip: () => true });
    const req = mockReq();
    const res = mockRes(200);
    mw(req, res, () => {});
    res.emit('finish');
    assert.equal(output, '');
  });

  test('custom format string is used', () => {
    let output = '';
    const stream = { write: (s) => { output += s; } };
    const mw  = reqlog({ format: 'CUSTOM :method :url', stream, colorize: false });
    const req = mockReq({ method: 'POST', url: '/foo' });
    const res = mockRes(201);
    mw(req, res, () => {});
    res.emit('finish');
    assert.match(output, /CUSTOM POST \/foo/);
  });

  test('immediate mode logs before finish', () => {
    let output = '';
    const stream = { write: (s) => { output += s; } };
    const mw  = reqlog({ format: 'tiny', stream, colorize: false, immediate: true });
    const req = mockReq();
    const res = mockRes(200);
    mw(req, res, () => {});
    assert.ok(output.length > 0);
  });

  test('colorize mode produces ANSI escape codes', () => {
    let output = '';
    const stream = { write: (s) => { output += s; } };
    const mw  = reqlog({ format: 'dev', stream, colorize: true });
    const req = mockReq();
    const res = mockRes(200);
    mw(req, res, () => {});
    res.emit('finish');
    assert.ok(output.includes('['), 'expected ANSI escape in output');
  });

  test('combined format contains remote-addr', () => {
    let output = '';
    const stream = { write: (s) => { output += s; } };
    const mw  = reqlog({ format: 'combined', stream, colorize: false });
    const req = mockReq();
    const res = mockRes(200);
    mw(req, res, () => {});
    res.emit('finish');
    assert.match(output, /1\.2\.3\.4/);
  });

  test('string shorthand for format option', () => {
    const mw = reqlog('tiny');
    assert.equal(typeof mw, 'function');
  });
});
