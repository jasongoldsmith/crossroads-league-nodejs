var expect = require('chai').expect;
var utils = require('../../utils');
var cookie = require('cookie');
var superagent = require('superagent');
var request = require("request");
var assert = require('chai').assert;
var baseURL = 'http://localhost:3000';

function checkStatus(res, status) {
  if (!res) {
    return done("No response!")
  }
  expect(res.status).to.equal(status)
}

function checkIsJSON(res) {
  expect(res.headers['content-type']).to.match(/json/)
}

function checkBodyIsObject(res) {
  expect(res).to.be.an('object');
}

function checkSuccess(status, callback) {
  return function(err, res) {
    if (err && err.status !== status) {
      return callback(err)
    };
    checkStatus(res, status);
    checkBodyIsObject(res);
    checkIsJSON(res);
    callback(null, res);
  }
}

function tReq(rData, eData, req, callback) {
  var req = req.set('Accept', 'application/json');
  if (rData.cookies) {
    var cookieStrings = utils._.map(rData.cookies, function(value, key) {
      return cookie.serialize(key, value);
    });
    var cookieString = cookieStrings.join("; ");
    req = req.set("Cookie", cookieString);
  }

  req = req.end(checkSuccess(eData.status, callback));
}

function tGet(hostURL, rData, eData, callback) {
  var host = baseURL;
  if (utils._.isValid(hostURL)) {
    host = hostURL;
  }
  var req = superagent.get(host + rData.path);
  tReq(rData, eData, req, callback);
}

function tPost(hostURL, rData, eData, callback) {
  var host = baseURL;
  if (utils._.isValid(hostURL)) {
    host = hostURL;
  }

  var req = superagent.post(host + rData.path)
    .send(rData.data);
  tReq(rData, eData, req, callback);

}

function logRes(res) {
  utils.l.i("Res", {status: res.status, body: res.body})
}

function getCookiesFromRes(res) {
  expect(res.header).to.have.property("set-cookie");
  var cookiesList = res.header["set-cookie"];

  expect(cookiesList).to.have.length.above(0);

  var cookies = {};
  utils._.each(
    cookiesList, function (cString) {
      cString = utils.str.strLeft(cString, ";");
      var cookieObj = cookie.parse(cString);
      utils._.assign(cookies, cookieObj);
    });
  return cookies;
}

module.exports = {
  logRes: logRes,
  tGet: tGet,
  tPost: tPost,
  getCookiesFromRes: getCookiesFromRes,
  utils: utils,
  baseURL: baseURL,
  expect: expect,
  assert: assert,
  request: request
};