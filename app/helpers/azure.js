var config = require("config");
var utils = require('../utils');
var uuid = require('node-uuid');
var https = require('https');
var request = require("request")

var CLIP_DURATION = 10;

function sendAzureRequest(clipFileName, videoUrl, userName, from, to) {
  var postBodyData = {
    videoUrl: videoUrl,
    userName: userName,
    fileName: clipFileName,
    videoFrom: from,
    videoTo: to
  };
  performRequest('POST', postBodyData);
}


function performRequest(method, data) {
  var azureHeaders= {
    'Content-Type': 'application/json',
    'Accept':  "application/json"
  };
  options = {
    url: utils.config.onCueClipCutterUrl,
    headers: azureHeaders,
    json: data
  };
  request.post(options, function (err, response, body) {
  })
}

function getValidEndTime(endTime) {
  if(endTime < CLIP_DURATION) {
    return CLIP_DURATION;
  }else {
    return endTime;
  }
}

function getValidStartTime(start, endTime) {
  if(utils._.isInvalid(start) || start >= endTime) {
    return endTime - CLIP_DURATION;
  }else {
    return start;
  }
}

function formClipName() {
  return clipFileName = "clip-" + uuid.v1() + ".mp4";
}

function formClipUrl(userId, clipFileName) {
  return [utils.config.onCueClipUrlHostName, userId, clipFileName].join("/");
}

function createAzureClip(userId, startTime, endTime, playUrl) {
  var clipFileName = formClipName();
  sendAzureRequest(clipFileName, playUrl, userId, startTime, endTime);
  return formClipUrl(userId, clipFileName);
}


module.exports = {
  getValidStartTime: getValidStartTime,
  getValidEndTime: getValidEndTime,
  formClipUrl: formClipUrl,
  sendAzureRequest: sendAzureRequest,
  createAzureClip: createAzureClip
};