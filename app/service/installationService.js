var utils = require('../utils')
var models = require('../models')
var helpers = require('../helpers')
var userService = require('./userService')

function updateInstallation(pushDeviceType, deviceToken, user, callback){
  var installationObj = null
  utils.async.waterfall([
    function(callback) {
      if(utils._.isInvalid(pushDeviceType) || utils._.isInvalid(deviceToken)) {
        return callback("invalid url or token empty in the request")
      }
      models.installation.updateInstallation(user, pushDeviceType, deviceToken, callback)
    },function(installation, callback) {
      installationObj = installation
      helpers.sns.registerDeviceToken(user, installation, callback)
    },function(installation, callback){
        userService.subscribeUserNotifications(user,false,callback)
    }]
    ,function(err,result){
      if(utils._.isValidNonBlank(installationObj))
        return callback(null,installationObj)
      else
        return callback(err,null)
    }
  )
}

function subscribeInstallation(callback){
  utils.async.waterfall([
    function(callback){
      models.installation.getInsallationCount({},callback)
    },function(installCount, callback){
      utils.l.d("installCount",installCount)
      var page=0
      var limit=100
      var batchStop = 0
      utils.async.whilst(
        function(){
          utils.l.d("batchStop in condition",batchStop)
          return batchStop<installCount
        },function(asyncCallback){
          utils.l.d("about to call subscribeInstallationAsync",page)
          subscribeInstallationAsync(page,limit,asyncCallback)
          page=page+1
          batchStop = page*limit
        },function(err,n){
          utils.l.d("completed processing:",n)
          callback(null,null)
        }
      )
    }
  ],callback)
}

function subscribeInstallationAsync(page, limit, callback){
  utils.l.i("processing subscribeInstallationAsync page::"+page)
  utils.async.waterfall([
    function(callback){
      models.installation.findInstallationsPaginated({},page,limit,callback)
    },function(installList,callback){
      utils.async.map(installList,function(installation,asynCallback){
        utils.l.d("subscribing for "+installation._id+"::deviceSubscription::"+installation.deviceSubscription)
        if(utils._.isInvalidOrBlank(installation.deviceSubscription) || utils._.isInvalidOrBlank(installation.deviceSubscription.deviceEndpointArn))
          helpers.sns.registerDeviceToken(installation.user,installation,asynCallback)
        else
          return asynCallback(null,null)
      },function(err,result){
        callback(null,page)
      })
    }
  ],callback)
}

module.exports = {
  updateInstallation: updateInstallation,
  subscribeInstallation:subscribeInstallation
}