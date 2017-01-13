var config = require('config');
var winston = require('winston');
var lodash = require('./lodash');
var chance = require('./formatUtils').chance;

var logger = winston;
logger.level = config.logLevel;
logger.prettyPrint = true;
console.log("System Log level: " + logger.level);

var sentryClient;
  var raven = require('raven');
if (!lodash.isEmpty(process.env.GETSENTRY_URL)) {
  console.log("Initializing Get Sentry");
  sentryClient = new raven.Client(
    process.env.GETSENTRY_URL
    );
  sentryClient.patchGlobal();
}

function log(level, message, object) {
  var logString = message;
  if (lodash.isValid(object)) {
    if (logString) {
      logString = logString + ' : ' + JSON.stringify(object, null, 2)
    } else {
      logString = JSON.stringify(object);
    }
  }
  if (object instanceof Error) {
    logString = logString + " : " + object.message;
  }
  logger.log(level, logString);
}

function info(message, object) {
  log('info', message, object);
}

function error(message, object) {
  log('error', message, object);
}

function severe(message, object) {
  var data = lodash.assign({}, object, {error_uid: chance.guid()})
  log('error', message, data);
  if (!lodash.isEmpty(process.env.GETSENTRY_URL)) { 
    sentryClient.captureMessage(message, {extra: data});
  }
}

function silly(message, object) {
  log('silly', message, object);
}

function debug(message, object) {
  log('debug', message, object);
}

function sentryMessage(message, object, callback) {
  info(message, object);
  if (!lodash.isEmpty(process.env.GETSENTRY_URL)) {  
    sentryClient.captureMessage(message, {extra: object}, callback);
  } else if(callback) {
    callback();
  }
}

function sentryError(err, callback) {
  var stack = new Error().stack;
  if (!lodash.isEmpty(process.env.GETSENTRY_URL)) {  
    sentryClient.captureError(err, { extra: stack }, callback);
  } else if(callback) {
    callback();
  }
}

function eventLog(eventList){
  if(!(eventList instanceof Array)){
    eventList=[eventList]
  }
  var eventLogList = lodash.map(eventList,function(event){
    var eventLogObj = {}
    if(event) {
      eventLogObj._id = event._id
      eventLogObj.clanId=event.clanId
      eventLogObj.deleted=event.deleted
    }
    if(event && event.players) eventLogObj.players = event.players.length
    return eventLogObj
  })

  return JSON.stringify(eventLogList)
}

function notificationResponse(notifResp){
  var notifRespObj = {}
  if(notifResp) {
    notifRespObj.name = notifResp.name
    notifRespObj.message = notifResp.message
    if(notifResp.recipients)
      notifRespObj.recipients = lodash.map(notifResp.recipients,'_id')
  }

  return JSON.stringify(notifRespObj)
}

function userLog(userList){
  if(!(userList instanceof Array)){
    userList=[userList]
  }
  var userLogList = lodash.map(userList,function(user){
    var userLogObj = {}
    if(user) {
      userLogObj._id = user._id
      userLogObj.clanId=user.clanId
    }
    return userLogObj
  })

  return JSON.stringify(userLogList)
}
module.exports = {
  i: info,
  e: error,
  d: debug,
  s: severe,
  silly: silly,
  sentryMessage: sentryMessage,
  sentryError: sentryError,
  eventLog:eventLog,
  notificationResponse:notificationResponse,
  userLog:userLog
};