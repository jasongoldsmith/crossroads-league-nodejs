var utils = require('../utils')
var helpers = require('../helpers')
var UAParser = require('ua-parser-js')
var parser = new UAParser()
var models = require('../models')

function handleReqCleanup() {
  return function(req, res, next) {
    req.requested_url = req.protocol + '://' + req.get('host') + req.originalUrl
    next()
  }
}

function appendFromHeader(req, data, headerKey, dataKey, defaultValue) {
  var value
  if (utils._.isValid(req.headers[headerKey])) {
    value = req.headers[headerKey] || defaultValue

  } else {
    value = defaultValue
  }
  if (utils._.isValid(value)) {
    data[dataKey] = value
  }
}

function getUAData(useragent) {
  var uaData = parser.setUA(useragent).getResult()
  var os_generic = ""
  var os = ""
  if (utils._.isValid(uaData.os)) {
    var data = uaData.os
    if (utils._.isValid(data.name)) {
      os_generic = data.name
    }
    if (utils._.isValid(data.version)) {
      os = os_generic + ' ' + data.version
    }
  }
  var browser_generic = ""
  var browser = ""
  if (utils._.isValid(uaData.browser)) {
    var data = uaData.browser
    if (utils._.isValid(data.name)) {
      browser_generic = data.name
    }
    if (utils._.isValid(data.version)) {
      browser = browser_generic + ' ' + data.version
    }
  }

  var device_model = ""
  var device_vendor = ""
  var device_type = ""
  if (utils._.isValid(uaData.device)) {
    var data = uaData.device
    if (utils._.isValid(data.model)) {
      device_model = data.model
    }
    if (utils._.isValid(data.vendor)) {
      device_vendor = data.vendor
    }
    if (utils._.isValid(data.type)) {
      device_type = data.type
    }
  }

  return {
    'os_generic': os_generic,
    '$browser': browser,
    'browser_generic': browser_generic,
    'device_model': device_model,
    'device_vendor': device_vendor,
    'device_type': device_type,
    'user_agent': useragent
  }
}

function getUserIp(req) {
  return req.headers['x-forwarded-for'] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    req.connection.socket.remoteAddress
}

function handleHeaders(req, res) {
  var data = {}
  utils.l.d("headers being sent", req.headers)
  appendFromHeader(req, data, 'x-forwarded-for', 'ip', getUserIp(req))
  appendFromHeader(req, data, 'x-forwarded-for', 'userip', getUserIp(req))
  appendFromHeader(req, data, 'x-request-id', 'herokuRequestId', null)
  appendFromHeader(req, data, 'x-request-start', 'herokuTime', utils.m.moment().unix().toString())
  //appendFromHeader(req, data, 'x-mixpanelid', 'distinct_id', null)
  appendFromHeader(req, data, '$app_build_number','$app_build_number',null)
  appendFromHeader(req, data, '$app_version_string','$app_version_string',null)
  appendFromHeader(req, data, '$app_version_string','$app_version',null)
  appendFromHeader(req, data, '$app_version','$app_version',null)
  appendFromHeader(req, data, '$carrier','$carrier',null)
  appendFromHeader(req, data, 'mp_lib','mp_lib',null)
  appendFromHeader(req, data, '$lib_version','$lib_version',null)
  appendFromHeader(req, data, '$manufacturer','$manufacturer',null)
  appendFromHeader(req, data, '$os','$os',null)
  appendFromHeader(req, data, '$os_version','$os_version',null)
  appendFromHeader(req, data, '$model','$model',null)
  appendFromHeader(req, data, '$screen_height','$screen_height',null)
  appendFromHeader(req, data, '$screen_width','$screen_width',null)
  appendFromHeader(req, data, '$screen_dpi','$screen_dpi',null)
  appendFromHeader(req, data, '$wifi','$wifi',null)
  appendFromHeader(req, data, '$has_nfc','$has_nfc',null)
  appendFromHeader(req, data, '$brand','$brand',null)
  appendFromHeader(req, data, '$google_play_services','$google_play_services',null)

  data.distinct_id = req.zuid

  helpers.req.appendToAdata(req, data)
  var useragent = req.headers['user-agent']
  var uaData = getUAData(useragent)
  helpers.req.appendToAdata(req, uaData)
}


function visitTracker() {
  return function (req, res, next) {
    handleHeaders(req, res)
    next()
  }
}


function forceSSL() {
  return function(req, res, next) {
    if (utils.config.enforceSSL && req.header('x-forwarded-proto') != 'https') {
      return res.redirect('https://' + req.get('host') + req.url)
    }
    next()
  }
}

function handleIdentifyUser(req, next) {
  utils.l.d('*************************************  trace zuid.4 ' + req.uid + ' ' + req.zuid)
  utils.async.waterfall(
    [
      function(callback) {
        models.user.getOrCreateUIDFromRequest(req, false, callback)
      }
    ],
    function(err, uid) {
      utils.l.d('*************************************  trace zuid.5 ' + req.uid + ' ' + req.zuid)
      req.zuid = uid
      utils.l.d('*************************************  trace zuid.6 ' + req.uid + ' ' + req.zuid)
      utils.l.d('req.cookie',req.cookies)
      next()
    }
  )
}

function identifyUser() {
  console.log('*************************************  trace zuid.3 ')
  return function (req, res, next) {
    handleIdentifyUser(req, next)
  }
}

module.exports = {
  visitTracker: visitTracker,
  forceSSL: forceSSL,
  handleReqCleanup: handleReqCleanup,
  identifyUser: identifyUser
}