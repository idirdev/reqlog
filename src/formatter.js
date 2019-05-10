'use strict';
const { getStatusColor, getMethodColor, getTimingColor } = require('./colors');
const FORMATS = {
  default: (d, c) => {
    const m = c ? getMethodColor(d.method)(d.method.padEnd(7)) : d.method.padEnd(7);
    const s = c ? getStatusColor(d.status)(String(d.status)) : String(d.status);
    const t = c ? getTimingColor(d.duration)(d.duration.toFixed(1)+'ms') : d.duration.toFixed(1)+'ms';
    return d.timestamp+' '+m+' '+d.url+' '+s+' '+t;
  },
  short: (d, c) => (c ? getMethodColor(d.method)(d.method) : d.method)+' '+d.url+' '+d.status+' '+d.duration.toFixed(0)+'ms',
  minimal: (d) => d.method+' '+d.url+' '+d.status,
  json: (d) => JSON.stringify({method:d.method,url:d.url,status:d.status,duration:Math.round(d.duration*100)/100,ip:d.ip,timestamp:d.timestamp})
};
function formatRequest(req, res, dur, fmt, color) {
  const d = {method:req.method, url:req.url||'/', status:res?(res.statusCode||0):0, duration:dur||0, ip:req.headers['x-forwarded-for']||(req.socket&&req.socket.remoteAddress)||'-', userAgent:req.headers['user-agent']||'-', timestamp:new Date().toISOString()};
  return (typeof fmt==='function'?fmt:FORMATS[fmt]||FORMATS.default)(d, color);
}
function formatBytes(b) { const n=parseInt(b,10); if(isNaN(n))return'-'; if(n<1024)return n+'B'; if(n<1048576)return(n/1024).toFixed(1)+'KB'; return(n/1048576).toFixed(1)+'MB'; }
module.exports = { formatRequest, FORMATS, formatBytes };
