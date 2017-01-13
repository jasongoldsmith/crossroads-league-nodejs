var config = require("config");
var utils = require('../utils');
var uuid = require('node-uuid');
var AWS = require('aws-sdk');

AWS.config.update(config.awsKey);
var elastictranscoder = new AWS.ElasticTranscoder();
var CLIP_DURATION = 10;

var bucketName = config.s3.imageBucket;

function getTranscodingParams(inputFileName, fileName, duration, start, folder, thumbFileName) {
  var params = {
    Input: { /* required */
      Key: inputFileName,
      FrameRate: "auto", // auto",
      Resolution:"auto",
      AspectRatio: "auto",  // "auto|1:1|4:3|3  :2|16:9",
      Interlaced: "auto",
      Container: "auto"  // 3gp, aac, asf, avi, divx, flv, m4a, mkv, mov, mp3, mp4, mpeg, mpeg-ps, mpeg-ts, mxf, ogg, vob, wav, webm
    },
    PipelineId: '1439245236565-v3kmrc', /* required */
    Output: {
      Key: fileName,
      PresetId: '1444693138203-vezhfe', // (1080p Framerate=30, ThumbnailInterval=10) '1444692269306-l3e35i', //(1080p Framerate=30, ThumbnailInterval=1)  '1444672554035-kdlndi',  (1080p with hires thumbnail)
      Composition: [
        {
          TimeSpan: {
            Duration: duration,
            StartTime: start
          }
        }
      ],
      ThumbnailPattern: thumbFileName,
      Rotate: 'auto'
    },
    OutputKeyPrefix: folder
  };
  return params;
}

function getDestinationURL(userId) {
  var clipFileName = "moment-" + uuid.v1() + ".mp4";
  return [utils.config.onCueClipUrlHostName, userId, clipFileName].join("/");
}

function createClip(params, waitforCompletion, callback) {
  elastictranscoder.createJob(params, function(err, data) {
    if (err)
      callback(err);
    else {
      utils.l.i("awsTranscoding.CreateClip submitted ");
      if (waitforCompletion) {
        elastictranscoder.waitFor('jobComplete',{Id:data.Job.Id}, function(err, data) {
          utils.l.i("ADMIN SYNC: Extract Duration job completed " );
          callback(err, data);
        });
      } else {
        callback(err, data);
      }
    };
  });
}


function formClipName(uniqueid) {
  return clipFileName = "moment-" + uniqueid + ".mp4";
}

function formClipThumbNamePattern(uniqueid) {
  return clipFileName = "moment-" + uniqueid + "-\{count\}";
}

function formClipThumbName(uniqueid) {
  return clipFileName = "moment-" + uniqueid + "-00001.jpg";
}


function formClipUrl(folder, clipFileName, thumbFileName) {
  var clipInfo = {
    clipurl  : [utils.config.placeholder_awsClipUrlHostName,"/", folder, clipFileName].join(""),
    thumbNail: [utils.config.placeholder_awsClipUrlHostName,"/", folder, thumbFileName].join("")
  }
  return clipInfo;

}

function replaceAll(find, replace, str) {
  // exception.  str undefined here.  This happens if upload is not done completely
  var result = null;
  if (utils._.isValid(str)) {
    result = str.replace(new RegExp(find, 'g'), replace);
  } else {
    utils.l.i('WARNING: invalid str object in awsTranscoding.replaceAll.  Check if Amazon has updated files.')
  }
  return result;
}

function formClipThumbnailUrl(folder, thumbFileName) {
  return [utils.config.placeholder_awsClipUrlHostName,"/", folder, thumbFileName].join("");

}


function createAWSClip(content, startTime, endTime, waitforCompletion, callback) {
  var uniqueid = uuid.v1();
  var clipFileName = formClipName(uniqueid);
  var thumbFileNamePattern = formClipThumbNamePattern(uniqueid);
  var thumbFileName = formClipThumbName(uniqueid);
  var d = new Date();
  var m = d.getMonth() + 1;
  var y = d.getFullYear();
  var day = d.getDate();
  var now = y + '-' + m + '-' + day;
  var folder = now + '/' + content._id + '/';
  var contentFileName =    replaceAll(utils.config.placeholder_awsContentUrlHostName, '', content.s3PlayUrl) ;
  if (utils._.isInvalid(contentFileName)) {
    callback({err: 'invalid content.s3PlayUrl'},null);
  } else {
    var params = getTranscodingParams(contentFileName, clipFileName, (endTime-startTime).toString(), startTime.toString(), folder, thumbFileNamePattern);
    var clipUrl = null;
    createClip(params, waitforCompletion, function (err, result) {
      if (err) {
        utils.l.i(err);
        callback(err, null);
      }
      else {
        utils.l.i("createAWSClip: S3 job for clip: " + JSON.stringify(result));
        clipUrl = formClipUrl(folder, clipFileName, thumbFileName);
        callback(err, {clipInfo: clipUrl, jobId:result.Job.Id});
      }
    });
  }
}

function getContentTranscodingParams(inputFileName, fileName, folder) {
  var params = {
    Input: {
      Key: inputFileName,
      FrameRate: "auto",
      Resolution:"auto",
      AspectRatio: "auto",
      Interlaced: "auto",
      Container: "auto"
    },
    PipelineId: '1444962398833-u1k03v',
    Output: {
      Key: fileName,
      PresetId: '1444693138203-vezhfe',
      Composition: [
        {
          TimeSpan: {
            StartTime: "0"
          }
        }
      ],
      ThumbnailPattern: "",
      Rotate: 'auto'
    },
    OutputKeyPrefix: folder
  };
  return params;
}


function transcodeContentFile(playUrl, folder, callback) {
  var uniqueid = uuid.v1();
  var outFileName = "tempcontent-" + uniqueid + ".mp4";;
  var contentFileName =    replaceAll(utils.config.placeholder_awsContentUrlHostName, '', playUrl) ;
  var params = getContentTranscodingParams(contentFileName, outFileName, folder);
  elastictranscoder.createJob(params, function(err, data) {
    if (err)
      callback(err);
    else {
      utils.l.i("ADMIN SYNC: Extract Duration job submitted ");
      elastictranscoder.waitFor('jobComplete',{Id:data.Job.Id}, function(err, data) {
        utils.l.i("ADMIN SYNC: Extract Duration job completed ");
        callback(null, data);
      });
    };
  });
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

function waitForJob(jobId, callback) {
  if (utils._.isInvalid(jobId)) return callback("not valid jobId");
  elastictranscoder.waitFor('jobComplete',{Id:jobId}, function(err, data) {
    if (err) return callback("job creation failed");
    callback(err, data);
  });
}

module.exports = {
  createClip: createClip,
  createAWSClip: createAWSClip,
  formClipUrl: formClipUrl,
  formClipName: formClipName,
  formClipThumbName: formClipThumbName,
  transcodeContentFile: transcodeContentFile,
  getValidEndTime: getValidEndTime,
  getValidStartTime: getValidStartTime,
  waitForJob: waitForJob
};

