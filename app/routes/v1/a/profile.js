var express = require('express');
var router = express.Router();
var routeUtils = require('./../../routeUtils');
var helpers = require('../../../helpers');
var utils = require('../../../utils');
var models = require('../../../models');
var multer  = require('multer');
var upload = multer({ dest: 'uploads/' })
var myfileUploadMiddleware = upload.single('profileImage');
var AWS_FILEPREFIX = "userimages/";

function updateProfileData(req, res) {
  utils.l.i('API: /data : request: ' + req);
  req.assert('name', "Name required").notEmpty();
  utils.async.waterfall([
      helpers.req.handleVErrorWrapper(req),
      function (callback) {
        var data = req.body;
        models.user.setFields(req.user.id, data, callback);

      }
    ],
    function (err, user) {
      if (err) {
        req.routeErr = err;
        return routeUtils.handleAPIError(req, res, err);
      }
      return routeUtils.handleAPISuccess(req, res, {value: user});
    }
  );
}

function updateProfileImage(req, res) {
 // req.assert('name', "Members required").notEmpty();
  utils.l.i('API: /image : request: ' + req);

  utils.async.waterfall([
      helpers.req.handleVErrorWrapper(req),
      function (callback) {
       // utils.l.i("updateProfileImage", req);
        if(req.file) {
          var fileprefix = AWS_FILEPREFIX+req.user.id;
          helpers.s3.uploadImage(fileprefix, false, req.user.phoneNo+".jpg", req.file.path, callback);
        }
      },
      function(s3Url, callback) {
        models.user.setFields(req.user.id, {profileUrl : s3Url }, callback);
      }
    ],
    function (err, user) {
      if (err) {
        req.routeErr = err;
        return routeUtils.handleAPIError(req, res, err);
      }
      return routeUtils.handleAPISuccess(req, res, {value: user});
    }
  );

}



routeUtils.rPost(router, '/data', 'UpdateUserProfile', updateProfileData);
routeUtils.rPost(router, '/image', "UpdateUserImage", myfileUploadMiddleware, updateProfileImage);

module.exports = router;
