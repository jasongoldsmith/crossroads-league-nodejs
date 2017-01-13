var express = require('express')
var router = express.Router()
var config = require('config')
var utils = require('../../../utils')
var helpers = require('../../../helpers')
var routeUtils = require('../../routeUtils')
var models = require('../../../models')
var service = require('../../../service/index')

function listMyGroups(req, res) {
  service.userService.listGroups(req.user, function(err, groups) {
    if (err) {
      routeUtils.handleAPIError(req, res, err, err)
    } else {
      groupsResponse = groups || [{}]
      service.userService.subscribeUserNotifications(req.user,false,function(errors,results){
        utils.l.d("Notification subscription completed for user",utils.l.userLog(req.user))
      })
      routeUtils.handleAPISuccess(req, res, groupsResponse)
    }
  })
}

function updateHelmet(req, res) {
  service.accountService.handlUpdateHelmet(req.user, function(err, updateResponse) {
    if (err) {
      routeUtils.handleAPIError(req, res, err, err)
    } else {
      routeUtils.handleAPISuccess(req, res, updateResponse)
    }
  })
}

function resendBungieMessage(req, res) {
/*
  handleResendBungieMessage(req.user, function(err, user) {
    if (err) {
      routeUtils.handleAPIError(req, res, err, err)
    } else {
      routeUtils.handleAPISuccess(req, res, user)
    }
  })
*/
  var errorResponse = {
    error: "Our login system has changed. Please update to the latest version in the App Store to continue using Crossroads."
  }
  routeUtils.handleAPIError(req, res, errorResponse, errorResponse)

}

/*
function handleResendBungieMessage(userData,callback){
  utils.async.waterfall([
    function(callback) {
      //TBD: membershiptype is hardcoded to PSN for now. When we introduce multiple channels change this to take it from userdata
      // or send notification to both xbox and psn depending on the ID availability
      if(utils.config.enableBungieIntegration) {
        var primaryConsole = utils.primaryConsole(userData)
        service.destinyInerface.sendBungieMessage(userData.bungieMemberShipId,
          utils._.get(utils.constants.consoleGenericsId, primaryConsole.consoleType),
          utils.constants.bungieMessageTypes.accountVerification, function (error, messageResponse) {

            utils.l.d('handleResendBungieMessage::messageResponse', messageResponse)
            utils.l.d('handleResendBungieMessage::signupUser::sendBungieMessage::error', error)
            if (messageResponse) {
              utils.l.d("messageResponse::token===" + messageResponse.token)
              primaryConsole.verifyStatus = "INITIATED"
              primaryConsole.verifyToken = messageResponse.token
              var newUserObj = {
                id: userData._id,
                consoles: userData.consoles
              }
              return callback(null, newUserObj)
            } else {
              return callback(error, null)
            }
          })
        } else {
          console.log("Destiny validation disabled")
          return callback(null, null)
        }
      },
    function (newUser, callback) {
      if(newUser) {
        // don't send message
        models.user.updateUser(newUser, false, callback)
      } else {
        callback(null, userData)
      }
    }
  ], callback)
}
*/

/*
function searchGroupReq(req, res) {
  searchGroup(req.user, req.param('groupId'),function(err, groups) {
    if (err) {
      routeUtils.handleAPIError(req, res, err, err)
    } else {
      routeUtils.handleAPISuccess(req, res, groups)
    }
  })
}

function searchGroup(user, groupId, callback){
  var userObj = null
  var groupList = null
  utils.async.waterfall([
    function (callback) {
      models.user.getUserById({id: user._id}, callback)
    },
    function (user, callback) {
      if(user) {
        userObj = user
        //TODO: set current page to 1 for now. Change it when we have paging for groups.
        service.destinyInerface.listBungieGroupsJoined(user.bungieMemberShipId,
          utils.primaryConsole(userObj).consoleType,1, callback)
      } else {
        return callback({error: "User does not exist/logged in."}, null)
      }
    },
    function (groups, callback) {
      if (groups) {
        groupList = groups
        groupList.push(utils.constants.freelanceBungieGroup)

        addMuteFlagToGroupObject(userObj, groupList)
        service.eventService.listEventCountByGroups(utils._.map(groups, 'groupId'),
          utils.primaryConsole(userObj).consoleType, callback)
      } else {
        return callback({error: "You do not belong to this group anymore"}, null)
      }
    },
    function (eventCounts, callback) {
        mergeEventStatsWithGroups(eventCounts, groupList, callback)
      }
    ],
    function (err, bungieGroups) {
      if (err) {
        return callback (err, null)
      } else {
        utils.l.d("Groups::" + JSON.stringify(bungieGroups))
        var group = utils._.head(utils._.filter(bungieGroups, {groupId: groupId}))
        if(utils._.isInvalidOrBlank(group)) {
          return callback({error: "You do not belong to this group anymore"}, null)
        } else {
          return callback(null, group)
        }
      }
    }
  )
}*/

function muteGroupNotifications(req, res) {
  utils.l.d("mute group notification request" + JSON.stringify(req.body))
  service.userService.handleMuteGroupNotifications(req.user, req.body, function(err, group) {
    if (err) {
      routeUtils.handleAPIError(req, res, err, err)
    } else {
      routeUtils.handleAPISuccess(req, res, group)
    }
  })
}


function refreshHelmet(req, res) {
  service.accountService.refreshHelmentAndConsoles(req.user, function(err, updateResponse) {
    if (err) {
      routeUtils.handleAPIError(req, res, err, err)
    } else {
      routeUtils.handleAPISuccess(req, res, updateResponse)
    }
  })
}

/** Routes */
routeUtils.rGet(router, '/group/list', 'listMyGroups', listMyGroups)
//routeUtils.rGet(router, '/group/search/:groupId', 'searchGroupById', searchGroupReq)
routeUtils.rGet(router, '/group/resendBungieMessage', 'resendBungieMessage', resendBungieMessage)
routeUtils.rPost(router, '/group/mute', 'muteGroupNotification', muteGroupNotifications)
routeUtils.rPost(router, '/updateHelmet', 'updateHelmet', updateHelmet)
routeUtils.rPost(router, '/refreshHelmet', 'updateHelmet', refreshHelmet)
module.exports = router

