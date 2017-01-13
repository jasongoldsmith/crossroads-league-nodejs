var utils = require('../utils')
var models = require('../models')
var helpers = require('../helpers')

function trackData(req, callback) {
  var data = req.body
  var user = req.user

  if(!data.trackingData) {
    data.trackingData = {}
  }

  utils.async.waterfall([
      function(callback) {

        switch(data.trackingKey) {
          case "pushNotification":
            trackPushNotification(data, callback)
            break
          case "appInstall":
            utils.l.i("track appInstall request: " + "$os: " + req.headers['$os'] + " zuid: " + req.zuid + " tracking data: "+ JSON.stringify(data.trackingData))
            trackAppInstall(req, data, callback)
            break
          case "appInit":
            helpers.m.incrementAppInit(req)
            return callback(null, "appInit")
            break
          case "appResume":
            helpers.m.incrementAppResume(req)
            return callback(null, "appResume")
            break
          case "eventSharing":
            trackEventSharing(req.user, data, callback)
            break
          default:
            return callback(null, data.trackingKey)
            break
        }
      }
    ],
    function (err, key) {
      if(err) {
        utils.l.s("There was error in the tracking this request in mixpanel", err)
        return callback(err, null)
      } else {
        try {
          data.trackingData.userId = req.zuid
          // appInstall is a special case where we just want to track it once and we do it in it's own method
          if(data.trackingKey != "appInstall") {
            helpers.m.trackRequest(key, data.trackingData, req, user)
          }
        } catch (ex) {
          return callback(null, {success: true, trackingKey: data.trackingKey})
        }
        return callback(null, {success: true, trackingKey: data.trackingKey})
      }
    })
}

function trackPushNotification(data, callback) {
  if(utils._.isInvalidOrBlank(data.trackingData.notificationName)) {
    return callback(null, 'genericNotification')
  } else {
    return callback(null, data.trackingData.notificationName)
  }
}

function trackAppInstall(req, data, callback) {
  utils.l.d('trackAppInstall::got app installData',data)
  var userId = data.trackingData.userId
  if(utils._.isValidNonBlank(userId)) {
    req.zuid = userId
    req.session.zuid = userId
  }
  data.trackingData.userId = req.zuid

  // expecting trackingData.ads to be in the format "/<source>/<campaign>/<ad>/<creative>?sasda"
  // We have to maintain this order as it is sent by fb and branch as a deep link
  parseAdsData(data)
  utils.l.d('trackingService::trackAppInstall::req.adata',req.adata)
  var mpDistinctId = helpers.req.getHeader(req,'x-mixpanelid')
  models.temporaryUser.find(mpDistinctId, function (err, temporaryUser) {
    utils.l.d('trackingService::trackAppInstall::findTemporaryUser',data)
    if(err) {
      return callback(err, null)
    } else if (!temporaryUser) {
      utils.l.d('trackingService::trackAppInstall::findTemporaryUser::No Temporary user')
      utils.async.series([
        function(callback){
          var temporaryUser = {
            mpDistinctId: mpDistinctId,
            source: data.trackingData.source
          }
          models.temporaryUser.create(temporaryUser, callback)
        },function(callback){
          utils.l.d('trackingService::trackAppInstall::creating mixpanel user')
          helpers.m.setUser(req, data.trackingData, callback)
        }
      ],
        function(err, result){
        helpers.m.trackRequest("appInstall", data.trackingData, req, req.user)
        return callback(null, "appInstall")
      })
    } else if (temporaryUser) {
      utils.l.d('trackingService::trackAppInstall::findTemporaryUser::Found Temporary user',temporaryUser)
      if(temporaryUser.source == "organic" && data.trackingData.source != "organic") {
        temporaryUser.source = data.trackingData.source
        utils.l.d('trackingService::trackAppInstall::updating mixpanel user')
        helpers.m.updateUserSource(req, data.trackingData)
        models.temporaryUser.update(temporaryUser, callback)
      } else {
        return callback(null, temporaryUser)
      }
    }
  })
}

function parseAdsData(data){
  utils.l.d('trackingService::parseAdsData::Before',data)
  data.trackingData.ads = utils._.trim(data.trackingData.ads, '/')
  var adsValues = data.trackingData.ads.split('/')
  adsValues[3] = utils._.isValidNonBlank(adsValues[3]) ? adsValues[3].split('?')[0] : null
  data.trackingData.source = utils._.isValidNonBlank(adsValues[0]) ? adsValues[0] : null
  data.trackingData.campaign = utils._.isValidNonBlank(adsValues[1]) ? adsValues[1] : null
  data.trackingData.ad = utils._.isValidNonBlank(adsValues[2]) ? adsValues[2] : null
  data.trackingData.creative = adsValues[3]
  delete data.trackingData.ads
  utils.l.d('trackingService::parseAdsData::After::',data)
}

function trackExistingUser(req, data, callback) {
  parseAdsData(data)
  helpers.m.setUserAliasAndSource(req, data.trackingData, callback)
  helpers.m.updateUserSource(req, data.trackingData)
  helpers.m.setOrUpdateUserVerifiedStatus(req.user)
}

function needMPIdfresh(req,user){
  var mpDistincId = helpers.req.getHeader(req,'x-mixpanelid')
  var mpRefreshed = utils._.isValidNonBlank(user.mpDistinctIdRefreshed)? user.mpDistinctIdRefreshed: false
  utils.l.d('needMPIdfresh::1111:::::mpRefreshNeeded::::::::'+mpRefreshed)
  mpRefreshed = utils._.isValidNonBlank(user.mpDistinctId) && mpRefreshed
  utils.l.d('needMPIdfresh::2222:::::mpRefreshNeeded::::::::'+mpRefreshed)

  var updateMpDistinctId = (utils._.isInvalidOrBlank(user.mpDistinctId) || !mpRefreshed ) && utils._.isValidNonBlank(mpDistincId) ? true:false
  utils.l.d('needMPIdfresh::333:::::updateMpDistinctId::::::::'+updateMpDistinctId)
  return updateMpDistinctId
}

function trackUserLogin(req, user,updateMpDistinctId,existingMPUserId,isInvitedUserInstall, callback) {
  if(updateMpDistinctId) {
    if(user._id.toString() != existingMPUserId.toString()) {
      helpers.m.removeUser(existingMPUserId, callback)
      utils.l.d('removing existingMPUserId', existingMPUserId)
    }
    var mpDistincId = helpers.req.getHeader(req,'x-mixpanelid')
    utils.l.d('3333....creating tracking data for new user::mpDistincId::'+mpDistincId+"::zuid",req.zuid)
    var data = {trackingData: {}}
    data.trackingData.userId = user._id
    data.trackingData.distinct_id = user._id
    // expecting trackingData.ads to be in the format "/<source>/<campaign>/<ad>/<creative>?sasda"
    // We have to maintain this order as it is sent by fb and branch as a deep link
    if(isInvitedUserInstall)
      utils._.extend(data.trackingData, utils.constants.invitedUserInstallData)
    else
      utils._.extend(data.trackingData, utils.constants.existingUserInstallData)

    parseAdsData(data)
    helpers.m.setUserAliasAndSource(req, data.trackingData, callback)
    helpers.m.incrementAppInit(req)
    helpers.m.updateUserSource(req, data.trackingData)
    helpers.m.setOrUpdateUserVerifiedStatus(user)
  }else{
    return callback(null,null)
  }
}

function trackUserSignup(req, user, callback) {
    // expecting trackingData.ads to be in the format "/<source>/<campaign>/<ad>/<creative>?sasda"
    // We have to maintain this order as it is sent by fb and branch as a deep link
  helpers.m.setUserAlias(req, callback)
  helpers.m.updateUserJoinDate(user)
  helpers.m.setOrUpdateUserVerifiedStatus(user)
}

function trackEventSharing(user, data, callback) {
  utils.async.waterfall([
    function (callback) {
      if(!data.trackingData.eventId) {
        return callback({error: "eventId cannot be null for event sharing"}, null)
      }
      models.event.getById(data.trackingData.eventId, callback)
    },
    function(event, callback) {
      if(!event) {
        return callback({error: "No event with this id exists"}, null)
      }
      data.trackingData = {
        eventId: event._id.toString(),
        userId: user._id.toString(),
        isCurrentEventOwner: user._id.toString() == event.creator._id.toString(),
        playerCount: event.players.length
      }
      return callback(null, "eventSharing")
    }
  ], callback)
}

module.exports = {
  trackData: trackData,
  trackAppInstall:trackAppInstall,
  trackExistingUser:trackExistingUser,
  needMPIdfresh:needMPIdfresh,
  trackUserLogin:trackUserLogin,
  trackUserSignup:trackUserSignup
}