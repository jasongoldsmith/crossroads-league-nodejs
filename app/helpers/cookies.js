var utils = require('../utils');
var querystring = require('querystring');

function setCookieForTenMinutes(name, data, res) {
  res.cookie(name, data, { maxAge: 600000});
}

function setCookieForDays(name, data, numDays, res) {
  res.cookie(name, data, { maxAge: numDays*86400000});
}


function setCookieForSession(name, data, res) {
  res.cookie(name, data, { maxAge: 3600000});
}

function setCookie(name, data, res) {
  res.cookie(name, data, { maxAge: 126144000000});
}

module.exports = {
  setCookieForSession: setCookieForSession,
  setCookie: setCookie,
  setCookieForTenMinutes: setCookieForTenMinutes,
  setCookieForDays: setCookieForDays
};