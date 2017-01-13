var utils = require('../utils');
var https = require('https');
var request = require("request");

var  parseHeaders = {
  'X-Parse-Application-Id': 'lsduSaRXamdq5L7MZ9TLadylsEvfS1R4TtLCODzz',
  'X-Parse-Master-Key': 'R5Zmvi4zpzGsMcTnFUInHf0zIBNkE23h2nzd4XEi',
  'Content-Type': 'application/json'
// 'Content-Length': len
};

var PARSE_INSTALLATION = "https://api.parse.com/1/installations";
var PARSE_PUSHURL = "https://api.parse.com/1/push";
var PARSE_RESTAPI = "https://api.parse.com/1/";
var EPISODES_STRING  = "Episodes";
var INSTALLATION_STRING = "installations";

function getGETDataOption(url, queryString) {
  var options = {
    url: PARSE_RESTAPI + url,
    headers: parseHeaders,
    qs: queryString
  };
  return options;
}

function getAllVideos(callback) {
  // get all
  var qs = {'order': '-BroadcastOrder', where:JSON.stringify({"VideoUrl":{"$exists":true, "$ne":""},"ignoreVideo":{"$exists":false, "$ne":1}}), 'limit':1000};
  var options = getGETDataOption("classes/"+EPISODES_STRING, qs);
  request.get(options, function (err, response, body) {
    var jsonbody = null;
    if(body) {
      jsonbody = JSON.parse(body);
    }
    return callback(err, jsonbody.results);
  })
}

var userDeviceType = {
  android: 'android',
  ios: 'ios'
};

function addInstallationIOS(installationData, callback) {
  installationData.deviceType = userDeviceType.ios,
  updateInstallation(installationData, callback);
}

function addInstallationAndroid(installationData, callback) {
  installationData.pushType = "gcm";
  installationData.deviceType = userDeviceType.android;
  updateInstallation(installationData, callback);
}

function updateInstallation(installationData, callback) {
  getInstallationObjectForDevice(installationData.deviceId, installationData.userId, function (err, data) {
    updateInstallationObjects(data, installationData, callback);
  })
}

function addInstallation(data, callback) {
  performRequest('POST', data, callback);
}

function performRequest(method, data, callback) {
  var options = getPostOptions(PARSE_INSTALLATION, data);
  request.post(options, function (err, response, body) {
    return callback(err, body);
  })
}

function getPostOptions(url, data) {
  var options = {
    url: url,
    headers: parseHeaders,
    json:data
  };
  return options;
}

function getPutOptions(url, data) {
  var options = {
    url: url,
    headers: parseHeaders,
    json:data
  };
  return options;
}

//
// Push notifications text should be generated and follow the spec below:
// Text Message: "User_name: Message_text"
// Clip: "User_name Shared: Clip_Name"
// Video: "User_name Shared: Video_Name"

function sendParsePushNotification(data, mMessage, sound, userMessageData) {
  data.unReadMessageCount = userMessageData.unReadMessageCount;
  var payload = {
    payload: data,
    alert: mMessage,
    badge: userMessageData.totalUnReadMessageCount,
    totalUnReadMessageCount: userMessageData.totalUnReadMessageCount,
    sound: sound,   // needed for iOS
    isChatMuted: userMessageData.isChatMuted
  }
  if(utils._.isValid(userMessageData.isChatMuted) &&  userMessageData.isChatMuted) {
    payload = utils._.omit(payload, "alert", "badge","sound");
  }

  var parseQuery = {"userId":{"$in" : [userMessageData.userId]}};
  var iosDeviceQuery = {"pushType": {"$ne" : "gcm"}}
  if(utils._.isInvalid(mMessage)) {
    parseQuery = utils._.assign(parseQuery, iosDeviceQuery);
  }
  var postdata = {
    data: payload,  // parse expects data
    "where": parseQuery    //{"userId":{"$in" : [userMessageData.userId]}, "pushType": {"$ne" : "gcm"}}
  };
  var testJsonForParseTest = JSON.stringify(payload)
  var options = getPostOptions(PARSE_PUSHURL, postdata);
  request.post(options, function (err, response, body) {
  })
}


function sendPushNotification(userIds, myUserId, data, usersMessageData) {
  var mMessage = null;
  var sound = null;
  if(!utils._.isEmpty(data)) {
    if (data.type == 'text') {
      mMessage = data.sender.name + ': ' + data.text;
    } else if (data.type == 'moment') {
      mMessage = data.sender.name + ' Shared: ' + data.moment.title;
    } else if(data.type == 'content') {
      mMessage = data.sender.name + ' Shared: ' + data.content.title;
    }
    sound = 'default';
  }
  utils.async.map(usersMessageData, utils._.partial(sendParsePushNotification, data, mMessage, sound ));
}


function getInstallationObjectForDevice(deviceId, userId, callback) {
  var data = [];
  if(utils._.isInvalidOrBlank(deviceId) && utils._.isInvalidOrBlank(userId)) {
    return callback(null, data);
  }
  var qs = null;
  if(utils._.isValidNonBlank(deviceId)) {
    qs = {where: {'deviceId': deviceId}};
  }else {
    qs = {where: {'userId': userId}};
  }
  var url = INSTALLATION_STRING;
  var options = getGETDataOption(url, qs);
  request.get(options, function(err, response, body) {
    if(utils._.isValid(body)) {
      data = JSON.parse(body).results;
    }
    callback(null, data);
  });
}


function updateInstallationObjects(results, data, callback) {
  utils.async.map(results, deleteInstallation, function(err, ps) {
    addInstallation(data, callback);
  }) ;
}


function updateContentObject(contentParseId, data, callback) {
  var params = getPutOptions(PARSE_RESTAPI + "classes/"+EPISODES_STRING+"/"+contentParseId, data);
  request.put(params, function (err, response, body) {
    callback(null, body);
  })
}

function getAllInstallations(callback) {
  var options = {
    url: PARSE_RESTAPI +INSTALLATION_STRING,
    headers: parseHeaders,
  };
  request.get(options, function (err, response, body) {
    var jsonbody = null;
    if(body) {
      jsonbody = JSON.parse(body);
    }
    if(jsonbody) return callback(err, jsonbody.results);
    else callback(err, null);
  })
}

function deleteInstallation(parseObject, callback) {
  var params = getPutOptions(PARSE_RESTAPI +INSTALLATION_STRING+"/"+parseObject.objectId, {});
  request.del(params, function (err, response, body) {
    callback(null, body);
  })
}



module.exports = {
  getAllVideos: getAllVideos,
  addInstallationIOS: addInstallationIOS,
  addInstallationAndroid: addInstallationAndroid,
  sendPushNotification: sendPushNotification,
  updateContentObject: updateContentObject,
  getAllInstallations: getAllInstallations,
  deleteInstallation: deleteInstallation
};