var express = require('express')
var mongoose = require('mongoose')
var router = express.Router()
var models = require('../../../models/index')
var utils = require('../../../utils/index')
var routeUtils = require('./../../routeUtils')
var helpers = require('../../../helpers')
var service = require('../../../service')

function getInstallation(req, res) {
  utils.async.waterfall(
    [
      function(callback) {
        models.installation.getInstallationByUser(req.user, callback)
      }
    ],
    function(err, installation) {
      if (err) {
        req.routeErr = err
        return routeUtils.handleAPIError(req, res, err)
      }
      return routeUtils.handleAPISuccess(req, res, installation)
    }
  )
}


function updateInstallation(req, res) {
  req.assert('deviceToken',"not a valid token").notEmpty()
  var reqDeviceType = req.param("platformType")
  var pushDeviceType = null
  if(reqDeviceType == "ios") {
    pushDeviceType = "apn"
  }else if(reqDeviceType == "android") {
    pushDeviceType = "gcm"
  }

  service.installationService.updateInstallation(pushDeviceType,req.body.deviceToken,req.user,function(err,installation){
    if (err) {
      req.routeErr = err
      return routeUtils.handleAPIError(req, res, err)
    }
    return routeUtils.handleAPISuccess(req, res, installation)
  })

/*  utils.async.waterfall([
    function(callback) {
      if(utils._.isInvalid(pushDeviceType) || utils._.isInvalid(req.body.deviceToken)) {
        return callback("invalid url or token empty in the request")
      }
      models.installation.updateInstallation(req.user, pushDeviceType, req.body.deviceToken, callback)
    },
    function(installation, callback) {
      helpers.sns.registerDeviceToken(req.user, installation, function (err, result) {
        if(err) {
          utils.l.s("Error is resgistering the device token in SNS", err)
        } else {
          utils.l.d("Device token updated in SNS", installation)
        }
        //Till we sync up with front-end about how they handle error of this API, we call SNS in the background
        return callback(null, installation)
      })
    }],
    function(err, installation) {
      if (err) {
        req.routeErr = err
        return routeUtils.handleAPIError(req, res, err)
      }
      return routeUtils.handleAPISuccess(req, res, installation)
    }
  )*/
}

routeUtils.rGetPost(router, '/:platformType', 'installation update', getInstallation, updateInstallation)

module.exports = router
