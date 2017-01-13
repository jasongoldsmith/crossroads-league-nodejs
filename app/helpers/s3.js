var config = require("config");
var utils = require('../utils');

var imageBucket = config.s3.imageBucket;
var contentBucket = config.s3.contentsBucket;
var s3 = require('s3');

var request = require('request');
var s3Options = {
  maxAsyncS3: 20,     // this is the default
  s3RetryCount: 3, // this is the default
  s3RetryDelay: 1000, // this is the default
  multipartUploadThreshold: 20971520, // this is the default (20 MB)
  multipartUploadSize: 15728640, // this is the default (15 MB)
  s3Options: utils.config.awsKey
};
var s3client = s3.createClient(s3Options);
var uuid = require('node-uuid');
var AWS      = require('aws-sdk');
AWS.config.update(utils.config.awsKey);
var s3Stream = require('s3-upload-stream')(new AWS.S3());
var aWSS3 = new AWS.S3();

function getAWSParams(localfilepath, destinationfilename) {
  var params = {
    localFile: localfilepath,
    s3Params: {
      Bucket: imageBucket,
      Key: destinationfilename,
      ContentType: "image/png"
    }
  };
  return params;

}

function getS3FilePath(prefix, randomize, filename) {
  var prefixTokens = randomize ? [prefix, uuid.v1(), filename] : [prefix, filename];
  return prefixTokens.join("/");
}

function uploadImage(prefix, randomize, fileName, fileObject, callback) {
  var s3FilePath = getS3FilePath(prefix, randomize, fileName);
  var s3FileUrl = utils.config.placeholder_awsProfileUrlHostName + s3FilePath;
  s3client.uploadFile(getAWSParams(fileObject, s3FilePath))
    .on('error', function(err) {
      callback(err);
    })
    .on('end', function() {

      callback(null, s3FileUrl);
    });
}

function getVideoUrl(filepath) {
  return utils.config.placeholder_awsContentUrlHostName + filepath;
}

function getVideoFileName() {
  return "content-"+uuid.v1()+".mp4";
}

function uploadContentFile(playUrl, callback) {
  var s3FilePath = getVideoFileName();
  var s3FileUrl = getVideoUrl(s3FilePath);
  var readStream = request(playUrl);
  var upload = s3Stream.upload({
    Bucket: contentBucket,
    Key: s3FilePath,
    ContentType: "video/mp4",
  });
  upload.on('error', function (error) {
    utils.l.i("Error in upload file", error);
    callback(error);
  });
  upload.on('part', function (details) {
    utils.l.i("uploaded part", details);
  });
  upload.on('uploaded', function (details) {
    utils.l.i("upload for the file done", s3FileUrl);
    callback(null, s3FileUrl);
  });
  readStream.pipe(upload);
}


function deleteFileFromS3(bucket, key, callback) {
  var params = {
    Bucket: bucket,
    Key: key
  };
  aWSS3.deleteObject(params, function(err, data) {
    callback(null, null);
  });
}


module.exports = {
  uploadImage: uploadImage,
  uploadContentFile: uploadContentFile,
  deleteFileFromS3: deleteFileFromS3
};