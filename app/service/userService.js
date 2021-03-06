// Internal modules
var models = require('../models')
var utils = require('../utils')
var eventService = require('./eventService')
var authService = require('./authService')
var eventNotificationTriggerService = require('./eventNotificationTriggerService')
var pendingEventInvitationService = require('./pendingEventInvitationService')
var trackingService = require('./trackingService')
var destinyInterface = require('./destinyInterface')
var helpers = require('../helpers')
var userGroupService = require('./userGroupService')

// External Modules
var request = require('request')
var passwordHash = require('password-hash')
var temporal = require('temporal')
var fs = require('fs')
var urlencode = require('urlencode')

function preUserTimeout(notifTrigger,sysConfig){
  utils.l.d("Starting preUserTimeout")
  utils.async.waterfall([
      function (callback){
        models.event.getAllCurrentEventPlayers(callback)
      },
      function (playerIds,callback) {
        var preuserTimeoutInterval = getPreUserTimeoutInterval(sysConfig) || utils.config.preUserTimeoutInterval
        utils.l.d("time to notify the users timeout",preuserTimeoutInterval)

        var date = utils.moment().utc().add(preuserTimeoutInterval, "minutes")
        models.user.getByQuery({
            "_id":{"$in":playerIds},
            "consoles.verifyStatus": "VERIFIED",
            lastActiveTime: {$lte: date},
            notifStatus:{$ne:'preUserTimeout'}
          },
          callback)
      },
      function(userList, callback) {
        utils.l.d("got users for preUserTimeout",utils.l.userLog(userList))
        var totalUsres = userList ? userList.length: 0
        if(totalUsres > 0 && (notifTrigger.isActive && notifTrigger.notifications.length > 0)) {
          //Used to handle concurrent deletes on the same object.
          utils.async.mapSeries(userList, function(user,asyncCallback) {
            notifyPreUserTimeout(user,notifTrigger,asyncCallback)
          },function(err, updatedUsers) {
            return callback(err, updatedUsers)
          })
        }else {
          return callback(null, null)
        }
      }
    ],
    function (err, usersNotified) {
      if (err)
        utils.l.s("Error sending preUserTimeout notification::" + JSON.stringify(err))
      else utils.l.d("preUserTimeout::users notified",utils.l.userLog(usersNotified))
      utils.l.i("Completed trigger preUserTimeout::" +utils.moment().utc().format())
    })
}

function notifyPreUserTimeout(user,notifTrigger,callback){
  utils.async.waterfall([
    function(callback){
      //remove user from all events
      //TODO: Change clearEventsForPlayer to send one push notificaiton or remove the notification part
      //TODO: Clarify if we should not notify the creator
      models.event.getEventsByQuery({
        launchStatus: utils.constants.eventLaunchStatusTypes.now,
        "players": user._id},callback)
    },function(eventsToLeave,callback){
      utils.l.d('notifyPreUserTimeout::'+utils.l.userLog(user)+"\n\eventsToLeave::\n\t",utils.l.eventLog(eventsToLeave))
      if(eventsToLeave && eventsToLeave.length > 0) {
        utils.async.map(notifTrigger.notifications, utils._.partial(eventNotificationTriggerService.sendMultipleEventNotifications, eventsToLeave, [user]))
        callback(null, user)
      }else return callback(null, null)
    },function (user,callback){
      if(user && !hasNotifStatus(user.notifStatus,"preUserTimeout")) {
        user.notifStatus.push("preUserTimeout")
        utils.l.d('notifyPreUserTimeout::updating notifStatus::preUserTimeout on user',utils.l.userLog(user))
        models.user.save(user,callback)
      }else return callback(null,null)
    }
  ],function(err,user){
    if(!err) {
      utils.l.d('notifyPreUserTimeout::======Completing=========::',utils.l.userLog(user))
      return callback(null, user)
    }
    else return callback({error:"Error notifyPreUserTimeout of user::"+utils.l.userLog(user)},null)
  })
}

function userTimeout(notifTrigger,sysConfig) {
  utils.l.d("Starting userTimeout")
  utils.async.waterfall([
      function (callback){
        models.event.getAllCurrentEventPlayers(callback)
      },
      function (playerIds,callback) {
        var userTimeoutInterval = sysConfig.value || utils.config.userTimeoutInterval
        var date = utils.moment().utc().add(userTimeoutInterval, "minutes")
        models.user.getByQuery({
            "_id":{"$in":playerIds},
            "consoles.verifyStatus": "VERIFIED",
            lastActiveTime: {$lte: date}
          },
          callback)
      },
      function(userList, callback) {
        utils.l.d("got users for timeout",utils.l.userLog(userList))
        var totalUsres = userList ? userList.length: 0
        if(totalUsres > 0 && (notifTrigger.isActive && notifTrigger.notifications.length > 0)) {
          //Used to handle concurrent deletes on the same object.
          utils.async.mapSeries(userList, function(user,asyncCallback) {
            timeoutUser(user,notifTrigger,asyncCallback)
          },function(err, updatedUsers) {
            return callback(err, updatedUsers)
          })
        }else {
          return callback(null, null)
        }
      }
    ],
    function (err, usersTimedOut) {
      if (err) {
        utils.l.s("Error sending userTimeout notification::" + JSON.stringify(err))
      }
      utils.l.i("Completed trigger userTimeout::" +utils.moment().utc().format())
    }
  )
}

function timeoutUser(user,notifTrigger,callback){
  utils.async.waterfall([
    function(callback){
      //remove user from all events
      //TODO: Change clearEventsForPlayer to send one push notificaiton or remove the notification part
      //TODO: Clarify if we should not notify the creator
      eventService.clearEventsForPlayer(user, utils.constants.eventLaunchStatusTypes.now, null, callback)
    }
  ],function(err,eventsLeft){
    utils.l.d('timeoutUser::'+utils.l.userLog(user)+"\n\teventsLeft::\n\t",utils.l.eventLog(eventsLeft))
    if(!err){
      if(eventsLeft && eventsLeft.length > 0) utils.async.map(notifTrigger.notifications, utils._.partial(eventNotificationTriggerService.sendMultipleEventNotifications,eventsLeft,[user]))
      return callback(null,user)
    }else return callback({error:"Error timeout of user::"+user._id},null)
  })
}

function getPreUserTimeoutInterval(sysconfigs){
  var userTimeoutConfig = utils._.find(sysconfigs,{key:utils.constants.sysConfigKeys.userTimeoutInMins})
  var preUserTimeoutConfig = utils._.find(sysconfigs,{key:utils.constants.sysConfigKeys.preUserTimeoutInMins})
  utils.l.d('getPreUserTimeoutInterval:userTimeoutConfig::'+userTimeoutConfig+"::preUserTimeoutConfig::"+preUserTimeoutConfig)
  return (userTimeoutConfig.value - preUserTimeoutConfig.value)
}

function hasNotifStatus(notifStatusList, notifStatus){
  //console.log("notifStatusList["+JSON.stringify(notifStatusList)+"],notifStatus:"+JSON.stringify(notifStatus)+"="+utils._.indexOf(JSON.parse(JSON.stringify(notifStatusList)),notifStatus))
  if(utils._.indexOf(notifStatusList,notifStatus) >= 0) return true
  else return false
}

function upgradeConsole(user, oldConsoleType, newConsoleType, callback) {
  var consoleObject = utils.getUserConsoleObject(user, oldConsoleType)
  utils.async.waterfall([
    function (callback) {
      if (utils._.isInvalidOrBlank(consoleObject)) {
        var errMsg = "#CONSOLE_TYPE# not found for user"
        return callback ({error: errMsg.replace("#CONSOLE_TYPE#", oldConsoleType)}, null)
      } else {
        eventService.clearEventsForPlayer(user, null, oldConsoleType, callback)
      }
    },
    function (events, callback) {
      consoleObject.consoleType = newConsoleType
      updateUser(user, callback)
    }
  ], callback)
}

function updateReviewPromptCardStatus(user, data, callback) {
  user.reviewPromptCard.status = data.reviewPromptCardStatus.toUpperCase()
  updateUser(user, callback)
}

function refreshConsoles(user, bungieResponse, consoleReq, callback){
  utils.async.waterfall([
    function(callback){
      if (utils._.isValidNonBlank(bungieResponse) && utils._.isValidNonBlank(bungieResponse.destinyProfile)) {
        utils.async.mapSeries(bungieResponse.destinyProfile, function (destinyAccount, asyncCallback) {
            mergeConsoles(user, destinyAccount, asyncCallback)
          },
          function (err, consoles) {
            return callback(null, consoles)
          }
        )
      }
    },function(consoles, callback){
      //user.consoles = consoles
      setPrimaryConsoleAndHelmet(user,consoleReq)
      utils.l.d('refreshConsoles::user',user)
      models.user.save(user, callback)
    }
  ],callback)

}

function setPrimaryConsoleAndHelmet(user,consoleReq){
  utils._.map(user.consoles,function(consoleObj){
    if(consoleReq.consoleType == consoleObj.consoleType){
      user.imageUrl = consoleObj.imageUrl
      consoleObj.isPrimary = true
    }else
      consoleObj.isPrimary = false
  })
}

function mergeConsoles(user, destinyAccount, callback){
  var consoles = user.consoles
  var primaryConsole = utils.primaryConsole(user)
  utils.l.d('mergeConsoles::',destinyAccount)
  var consoleObj = {}
  consoleObj.consoleType = utils._.get(utils.constants.newGenConsoleType, destinyAccount.destinyMembershipType)
  consoleObj.destinyMembershipId = destinyAccount.destinyMembershipId
  consoleObj.consoleId = destinyAccount.destinyDisplayName
  consoleObj.clanTag = destinyAccount.clanTag
  consoleObj.imageUrl = utils.config.bungieBaseURL + "/" + destinyAccount.helmetUrl
  consoleObj.verifyStatus = primaryConsole ? primaryConsole.verifyStatus : "INITIATED"

  if (consoleObj.consoleType == 'PS4')
    mergeConsoleByType(consoleObj,'PS3',user,callback)
  else if (consoleObj.consoleType == 'XBOXONE')
    mergeConsoleByType(consoleObj,'XBOX360',user,callback)
}

function mergeConsoleByType(newConsole,legacyConsoleType,user,callback){
  var oldConsoleObject = utils.getUserConsoleObject(user, legacyConsoleType)
  if (utils._.isValidNonBlank(oldConsoleObject)) {
    utils.l.d("mergeConsoles::user on legacy consoles"+legacyConsoleType)
    //upgrade user console, destiny account from bungie is updated to new gen. Our system has old gen console
    updateConsole(user,oldConsoleObject,newConsole.consoleType,newConsole.consoleId,callback)
  } else if (utils._.isInvalidOrBlank(utils.getUserConsoleObject(user, newConsole.consoleType))) {
    //add console, destiny account from bungie is not our system.
    utils.l.d("mergeConsoles::Adding new console"+newConsole.consoleType)
    consoles.push(newConsole)
    return callback(null, newConsole)
  }else {
    //Override consoleId with what bungie has
    var newGenExistingConsole = utils.getUserConsoleObject(user, newConsole.consoleType)
    newGenExistingConsole.consoleId = newConsole.consoleId
    return callback(null, newGenExistingConsole)
  }
}

function updateConsole(user, oldConsole, newConsoleType,newConsoleId,callback){
  utils.async.waterfall([
    function(callback) {
      eventService.clearEventsForPlayer(user, null, oldConsole.consoleType, callback)
    }
  ],function(err,data){
    if(!err) {
      oldConsole.consoleType = newConsoleType
      oldConsole.consoleId = newConsoleId
    }
    return callback(null,oldConsole)
  })
}
function changePrimaryConsole(user, consoleType, callback) {
  var consoleObject = utils.getUserConsoleObject(user, consoleType)
  if(utils._.isInvalidOrBlank(consoleObject)) {
    var errMsg = "#CONSOLE_TYPE# not found for user"
    return callback ({error: errMsg.replace("#CONSOLE_TYPE#", consoleType)}, null)
  }

  var oldPrimaryConsoles = utils._.filter(user.consoles, 'isPrimary')
  utils._.forEach(oldPrimaryConsoles, function (console) {
    console.isPrimary = false
  })
  consoleObject.isPrimary = true
  updateUser(user, callback)
}

function updateUser(user, callback) {
  models.user.save(user, function(err, updatedUser) {
    var error = utils.errors.formErrorObject(utils.errors.errorTypes.all,
      utils.errors.errorCodes.internalServerError, null)
    if(err) {
      utils.l.s("There was a problem in updating the user", err)
      return callback(error, callback)
    } else {
      helpers.firebase.updateUser(updatedUser)
      return callback(null, updatedUser)
    }
  })
}

function checkBungieAccount(console,needHelmet, callback) {
  destinyInterface.getBungieMemberShip(console.consoleId, console.consoleType, console.destinyMembershipId, needHelmet,function(err, bungieResponse) {
    if (err) {
      return callback(err, null)
    }else if(!bungieResponse || !bungieResponse.bungieMemberShipId || utils._.isEmpty(bungieResponse.bungieMemberShipId)){
      var error = {
        error: utils.constants.bungieMessages.bungieMembershipLookupError
          .replace("#CONSOLE_TYPE#", utils._.get(utils.constants.consoleGenericsId, console.consoleType))
          .replace("#CONSOLE_ID#", console.consoleId),
        errorType: "BungieError"
      }
      return callback(error, null)
    } else {
      var bungieMember = {
        consoleId: console.consoleId,
        consoleType: console.consoleType,
        bungieMemberShipId: bungieResponse.bungieMemberShipId,
        destinyProfile: bungieResponse.destinyProfile
      }
      return callback(null, bungieMember)
    }
  })
}


function setLegalAttributes(user){
  var userWithLegalResp = JSON.parse(JSON.stringify(user))
  userWithLegalResp.legal.termsNeedsUpdate = false
  userWithLegalResp.legal.privacyNeedsUpdate = false

  return userWithLegalResp
}

function getNewUserData(password, clanId, mpDistinctId, refreshedMixPanel,
                        bungieResponse, consoleType, userVerificationStatus) {

  var userData = {
    passWord: password?passwordHash.generate(password):password,
    clanId: clanId,
    mpDistinctId: mpDistinctId,
    mpDistinctIdRefreshed:refreshedMixPanel,
    verifyStatus: userVerificationStatus,
    lastActiveTime: new Date()
  }

  if(utils._.isValidNonBlank(bungieResponse)) {
    var consolesList =  []
    utils._.map(bungieResponse.destinyProfile, function(destinyAccount) {
      var consoleObj = {}
      consoleObj.consoleType =  utils._.get(utils.constants.newGenConsoleType, destinyAccount.destinyMembershipType)
      consoleObj.destinyMembershipId = destinyAccount.destinyMembershipId
      consoleObj.consoleId = destinyAccount.destinyDisplayName
      consoleObj.clanTag = destinyAccount.clanTag
      consoleObj.imageUrl = utils._.isValidNonBlank(destinyAccount.helmetUrl) ?
      utils.config.bungieBaseURL + "/" +destinyAccount.helmetUrl : utils.config.defaultHelmetUrl
      consoleObj.isPrimary = consoleObj.consoleType == consoleType
      consolesList.push(consoleObj)
    })
    userData.consoles = consolesList
    userData.bungieMemberShipId =  bungieResponse.bungieMemberShipId
  }
  return userData
}

function refreshUserData(bungieResponse, user, consoleType){
  if(utils._.isValidNonBlank(bungieResponse)) {
    utils._.map(bungieResponse.destinyProfile, function(destinyAccount) {
      updateExistingConsole(destinyAccount,user,consoleType)
    })
    user.bungieMemberShipId =  bungieResponse.bungieMemberShipId
  }
  return user
}

//Used to update destiny/bungie profile info for a given user object
function updateUserConsoles(userToupdate){
  utils.l.d("updateUserConsoles::Entry user",userToupdate)
  var primaryConsole = utils.primaryConsole(userToupdate)
  var userObj = null
  utils.async.waterfall([
    function(callback){
      models.user.getById(userToupdate._id,callback)
    },
    function(user,callback){
      if(utils._.isValidNonBlank(user))
        userObj = user
      else
        return callback({error:"No userfound for id"+userToupdate._id},null)
      var destinyProfile = {
        memberShipId:user.bungieMemberShipId,
        memberShipType:"bungieNetUser"
      }
      if(utils._.isValidNonBlank(primaryConsole))
        destinyInterface.getBungieMemberShip(primaryConsole.consoleId,primaryConsole.consoleType,destinyProfile,true,callback)
      else
        return callback({error:"No console found for the user"},null)
    },function(bungieResponse,callback){
      utils.l.d('updateUserConsoles:bungieResponse',bungieResponse)
      if (utils._.isValidNonBlank(bungieResponse) && utils._.isValidNonBlank(bungieResponse.destinyProfile)) {
        utils._.map(bungieResponse.destinyProfile, function(destinyAccount) {
          utils.l.d('updateUserConsoles::destinyAccount',destinyAccount)
          var userConsoleType = utils._.get(utils.constants.newGenConsoleType, destinyAccount.destinyMembershipType)
          var userConsole = utils.getUserConsoleObject(userObj,userConsoleType)

          if(utils._.isValidNonBlank(userConsole)) {
            userConsole.destinyMembershipId = destinyAccount.destinyMembershipId
            userConsole.consoleId = destinyAccount.destinyDisplayName
            userConsole.clanTag = destinyAccount.clanTag
            userConsole.imageUrl = utils.config.bungieBaseURL + "/" + destinyAccount.helmetUrl
            userConsole.verifyStatus = userObj.verifyStatus ? userObj.verifyStatus : "INITIATED"

            //Set the iamge Url at the user object as app is using that field to display helmet
            if(userConsoleType == primaryConsole.consoleType)
              userObj.imageUrl=utils.config.bungieBaseURL + "/" + destinyAccount.helmetUrl
          }else{
            var newConsole = {}
            newConsole.destinyMembershipId = destinyAccount.destinyMembershipId
            newConsole.consoleId = destinyAccount.destinyDisplayName
            newConsole.consoleType=userConsoleType
            newConsole.clanTag = destinyAccount.clanTag
            newConsole.imageUrl = utils.config.bungieBaseURL + "/" + destinyAccount.helmetUrl
            newConsole.verifyStatus = userObj.verifyStatus ? userObj.verifyStatus : "INITIATED"
            userObj.consoles.push(newConsole)
          }
        })

        utils.l.d("updateUserConsoles::after updating user",userObj)
        models.user.updateUserConsoles(userObj,callback)
      }else{
        callback(null,userObj)
      }
    }
  ],function(err,data){
    if(err || userObj==null)
      utils.l.i("Error updating bungie profile for user. Please try again later",err)
    else
      helpers.firebase.updateUser(userObj)
  })
}

function updateExistingConsole(destinyAccount,userObj,consoleType){
  var userConsoleType = utils._.get(utils.constants.newGenConsoleType, destinyAccount.destinyMembershipType)
  var userConsole = utils.getUserConsoleObject(userObj,userConsoleType)
  if(utils._.isValidNonBlank(userConsole)) {
    if(utils._.isValidNonBlank(destinyAccount.destinyMembershipId))
      userConsole.destinyMembershipId = destinyAccount.destinyMembershipId
    if(utils._.isValidNonBlank(destinyAccount.clanTag))
      userConsole.clanTag = destinyAccount.clanTag
    if(utils._.isValidNonBlank(destinyAccount.helmetUrl))
      userConsole.imageUrl = utils.config.bungieBaseURL + "/" + destinyAccount.helmetUrl

    userConsole.isPrimary = userConsoleType == consoleType
    userConsole.consoleId = destinyAccount.destinyDisplayName
    userConsole.verifyStatus = userObj.verifyStatus ? userObj.verifyStatus : "INITIATED"
  }
}

function getPendingEventInvites(user, callback) {
  pendingEventInvitationService.listPendingEventInvitationsForInviter(user._id, callback)
}

//TODO: GroupID is set in clanID field. Need to change it later.
function updateUserGroup(data, callback) {
  utils.l.d("updateUserGroup::",data)
  var clanName = utils._.isInvalidOrBlank(data.clanName)?"":data.clanName
  var clanImageUrl = utils._.isInvalidOrBlank(data.clanImageUrl)?"":data.clanImageUrl
  models.user.updateUser({id: data.id, clanId: data.clanId, clanName:clanName, clanImageUrl:clanImageUrl}, true, callback)
}

function listGroups(user, callback) {
  utils.async.waterfall([
    function getUserGroups(callback){
      if(user) {
        models.userGroup.getByUser(user._id, null, callback)
      }
      else {
        return callback({error: "User doesnot exist/logged in."})
      }
    },
    function geUserGroupStats(userGroupList, callback) {
      transformGroups(userGroupList, utils.primaryConsole(user).consoleType, callback)
    }
  ], callback)
}

function listUserGroups(userGroupList, user, callback) {
  utils.async.waterfall([
    function(callback) {
      var groupsObj = (userGroupList && userGroupList.length > 0) ? userGroupList[0] : null
      var dateUpdated = utils._.isValidNonBlank(groupsObj) ?
        utils.moment(groupsObj.uDate).utc().add("24","hours") : utils.moment().utc()
      if (utils._.isInvalidOrBlank(groupsObj) || dateUpdated < utils.moment().utc()
        || groupsObj.refreshGroups || utils._.isInvalidOrBlank(groupsObj.group)) {
        utils.l.d("Groups does not exists. Fetching from bungie")
        destinyInterface.listBungieGroupsJoined(user.bungieMemberShipId,
          utils.primaryConsole(user).consoleType, 1, function(err, groups) {
          if(groups) {
            refreshGroups(user, userGroupList, groups, callback)
          }
          else {
            return callback(err, userGroupList)
          }
        })
      } else {
        utils.l.d("Groups already exists.")
        return callback(null, userGroupList)
      }
    }
  ], callback)
}

function refreshGroups(user, userGroupList, groups, callback) {
  utils.async.waterfall([
    function(callback) {
      models.groups.addGroups(groups, utils._.map(user.consoles,"consoleType"), callback)
    },
    function(docs, callback) {
      models.userGroup.refreshUserGroup(user, groups, userGroupList, callback)
    }
  ], callback)
}

function transformGroups(userGroupList, consoleType, callback) {
  utils.async.waterfall([
    function(callback) {
      var groups = []
      utils._.map(userGroupList, function(userGroup) {
        groups.push({
          "groupId": userGroup.group._id,
          "groupName": userGroup.group.groupName,
          "avatarPath": userGroup.group.avatarPath,
          "clanEnabled": userGroup.group.clanEnabled,
          "bungieMemberCount": userGroup.group.bungieMemberCount,
          "memberCount": utils._.find(userGroup.group.appStats, {consoleType: consoleType}).memberCount,
          "muteNotification": userGroup.muteNotification
        })
      })
      eventService.listEventCountByGroups(utils._.map(groups, 'groupId'), consoleType, function(err, eventStats) {
        return callback(null, mergeEventStatsWithGroups(eventStats,groups))
      })
    }
  ], callback)
}

function mergeEventStatsWithGroups(eventCountList, groupList){
  utils.l.d('groupList without eventcount',groupList)
  utils._.map(groupList,function(group){
    eventCountObj = utils._.find(eventCountList, {"_id": group.groupId})
    group.eventCount= utils._.isValidNonBlank(eventCountObj)?eventCountObj.count:0
  })

  return groupList
}

function handleMuteGroupNotifications(user, data, callback) {
  var muteNotification = data.muteNotification == "true" || data.muteNotification == true
  utils.async.waterfall([
    function(callback) {
      models.userGroup.getUserGroupByUserIdAndGroupId(user._id, data.groupId, callback)
    },
    function(userGroup, callback) {
      if(muteNotification) {
        unSubscribeUserGroupNotification(userGroup, user, data.groupId, muteNotification, callback)
      } else {
        subscribeUserGroupNotification(userGroup, user, data.groupId, muteNotification, callback)
      }
    }
  ],
    function (err, userGroup) {
      if(err) {
        return callback(err, userGroup)
      } else {
        return callback(null, {
          groupId: userGroup.group,
          muteNotification: userGroup.muteNotification
        })
      }
    })
}

function unSubscribeUserGroupNotification(userGroup, user, groupId, muteNotification, callback) {
  utils.async.waterfall([
    function(callback) {
      helpers.sns.unSubscirbeUserGroup(userGroup, callback)
    },
    function (result, callback) {
      models.userGroup.updateUserGroup(user._id, groupId,
        {muteNotification: muteNotification, serviceEndpoints: []}, callback)
    }
  ], callback)
}

function subscribeUserGroupNotification(userGroup,user,groupId, muteNotification, callback) {
  utils.async.waterfall([
    function(callback) {
      models.installation.getInstallationByUser(user, callback)
    },
    function(installation, callback) {
      helpers.sns.subscirbeUserGroup(userGroup, installation, callback)
    },
    function(result, callback) {
      models.userGroup.updateUserGroup(user._id, groupId,
        {muteNotification: muteNotification}, callback)
    }
  ], callback)
}

function bulkUpdateUserGroups(page, limit){
  utils.async.waterfall([
      function(callback) {
        models.user.findUsersPaginated({"verifyStatus" : "VERIFIED"} ,page ,limit, callback)
        //models.user.findUsersPaginated({"consoles.verifyStatus":{"$in":["VERIFIED"]},"verifyStatus":{"$in":[null]},"bungieMemberShipId":{"$ne":null}} ,page ,limit, callback)
      },
      function(userList, callback) {
        utils.async.mapSeries(userList,
          function(user,asyncCallback) {
            migrateUserGroup(user, asyncCallback)
          },function(errList, results){
            callback(errList,results)
          }
        )
      }
    ],
    function(err ,data) {
      utils.l.d('Completed processing page::' + page)
    })
}

function migrateUserGroup(user,callback){
  utils.async.waterfall([
    function(callback){
      models.userGroup.getByUserLean(user._id,callback)
    },function(userGroupList, callback){
      listUserGroups(userGroupList,user,callback)
    },function(userGroupList,callback){
      utils.async.map(userGroupList,function(userGroup,asyncCallback){
        var group = utils._.isValidNonBlank(userGroup.group)?utils._.find(user.groups,{"groupId":userGroup.group._id}):null
        if(group && group.muteNotification == true) models.userGroup.updateUserGroup(user._id,userGroup.group._id,{muteNotification:group.muteNotification},asyncCallback)
        else asyncCallback(null,null)
      },function(errorList, results){
        callback(null,null)
      })
    }
  ],function(err,result){
    if(err)
      models.helmetTracker.createUser(user,err,callback)
    else return callback(null, result)
  })
}

function bulkUpdateGroupStats(page,limit){
  utils.async.waterfall([
      function(callback) {
        models.groups.findGroupsPaginated({} ,page ,limit, callback)
      },
      function(groupList, callback) {
        utils.async.mapSeries(groupList,
          function(group,asyncCallback) {
            updateGroupStats(group, asyncCallback)
          },function(errors,results){
            utils.l.d("completed processing group status update for page:"+page)
            callback(null,null)
          }
        )
      }
    ],
    function(err ,data) {
      utils.l.d('Completed processing page::' + page)
    })
}

function updateGroupStats(group, callback){
  utils.l.d("group",group._id)
  utils.async.waterfall([
    function(callback){
      utils.async.parallel({
          ps4Stats: function (callback) {
            models.userGroup.getGroupCountByConsole(group._id,"PS4", callback)
          },
          xboxStats: function (callback) {
            models.userGroup.getGroupCountByConsole(group._id,"XBOXONE", callback)
          },
          pcStats: function (callback) {
            models.userGroup.getGroupCountByConsole(group._id,"PC", callback)
          }
        },
        function (err, results) {
          if(utils._.isValidNonBlank(err)) {
            utils.l.s("There was an error in fetching group stats for "+group._id, err)
            return callback(null, null)
          }
          else {
            return callback(null, results)
          }
        })
    },function(results, callback){
      if(utils._.isValidNonBlank(results)) {
        var ps4Stats = results.ps4Stats
        var xboxStats = results.xboxStats
        var pcStats = results.pcStats
        subscribeGroups(ps4Stats,xboxStats, pcStats,group,callback)
      }else{
        callback(null,null)
      }
    }
  ],callback)
}

function subscribeGroups(ps4Stats,xboxStats,pcStats,group, callback){
  var needUserGroupSubscription = false;
  utils.async.waterfall([
    function(callback){
      var serviceEndPoint = utils._.find(group.serviceEndpoints,{consoleType:"PS4",serviceType:utils.constants.serviceTypes.PUSHNOTIFICATION})
      if(ps4Stats >= utils.config.minUsersForGroupNotification && (utils._.isInvalidOrBlank(serviceEndPoint) || utils._.isInvalidOrBlank(serviceEndPoint.topicEndpoint))) {
        needUserGroupSubscription=true
        helpers.sns.subscribeGroup(group, "PS4", callback)
      }else
        callback(null,null)
    },function(result,callback){
      var serviceEndPoint = utils._.find(group.serviceEndpoints,{consoleType:"XBOXONE",serviceType:utils.constants.serviceTypes.PUSHNOTIFICATION})
      if(xboxStats >= utils.config.minUsersForGroupNotification && (utils._.isInvalidOrBlank(serviceEndPoint) || utils._.isInvalidOrBlank(serviceEndPoint.topicEndpoint))) {
        needUserGroupSubscription=true
        helpers.sns.subscribeGroup(group, "XBOXONE", callback)
      }else
        callback(null,null)
    },function(result,callback){
      if((ps4Stats >= utils.config.minUsersForGroupNotification || xboxStats >= utils.config.minUsersForGroupNotification) && needUserGroupSubscription) {
        subscribeUsersForGroup(group, callback)
      }else
        callback(null,null)
    },function(result,callback){
      utils.async.parallel({
          ps4StatsUpdate: function (parallelCallback) {
            models.groups.updateGroupStats(group._id, "PS4", ps4Stats, parallelCallback)
          },
          xboxStatsUpdate: function (parallelCallback) {
            models.groups.updateGroupStats(group._id, "XBOXONE", xboxStats, parallelCallback)
          },
          pcStatsUpdate: function (parallelCallback) {
            models.groups.updateGroupStats(group._id, "PC", pcStats, parallelCallback)
          }
        },
        function (err, results) {
          return callback(err, results)
        })
    }
  ],callback)
}
/*
function subscribeUsersForGroup(group,callback){
  utils.l.d("BEGIN subscribeUsersForGroup:"+group._id)
  utils.async.waterfall([
    function(callback){
      models.userGroup.findUsersByGroup(group._id,callback)
    },function(userGroupStream,callback){
      userGroupStream.on('data', function (doc) {
        utils.l.d('################# got user',doc._id)
        subsribeUserGroupNotification(doc,function(err,data){
          utils.l.d('&&&&& COMPLETED subScribeUsergropu UPDATE &&&&')
        })
      }).on('error', function (err) {
        utils.l.d('error getting userGroup',err)
      }).on('close', function () {
        utils.l.d('Completed processing subscribeUsersForGroup for group',group._id)
        return callback(null,null)
      });
    }
  ],callback)
}
*/
function subscribeUsersForGroup(group,callback){
  utils.async.waterfall([
    function(callback){
      models.userGroup.getUserCountByGroup(group._id,callback)
    },function(userGroupCount, callback){
      utils.l.d("usercount",userGroupCount)
      var page=0
      var limit=50
      var batchStop = 0
      utils.async.whilst(
        function(){
          utils.l.d("batchStop in condition",batchStop)
          return batchStop<userGroupCount
        },function(asyncCallback){
          utils.l.d("about to call subscribeUsersForGroupAsync",page)
          subscribeUsersForGroupAsync(page,limit,group,asyncCallback)
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

function subscribeUsersForGroupAsync(page,limit,group,callback){
  utils.l.i("processing page::"+page)
  utils.async.waterfall([
    function(callback){
      models.userGroup.findUsersPaginated({group:group._id},page,limit,callback)
    },function(userGroupList,callback){
      utils.async.map(userGroupList,function(userGroup,asynCallback){
        utils.l.d("subscribing for ",userGroup._id)
        subsribeUserGroupNotification(userGroup,asynCallback)
      },function(err,result){callback(null,page)})
    }
  ],callback)
}

/*
function subsribeUsersForGroupPaginated(group,page,limit){
  utils.async.waterfall([
    function(callback){
      models.userGroup.findUsersPaginated({group:group._id},page,limit,callback)
    },function(userGroupList, callback){
      utils.async.map(userGroupList,
        function(userGroup,asynCallback){
          subsribeUserGroupNotification(userGroup,asynCallback)
        },function(errors, results){
          callback(null,null)
        }
      )
    }
  ],function(err,data){
    utils.l.d("Completed subsribeUsersForGroupPaginated")
    //return callback(err,data)
  })
}*/

function subsribeUserGroupNotification(userGroup,callback){
  utils.async.waterfall([
    function(callback){
      models.installation.getInstallationByUser(userGroup.user,callback)
    },function(installation, callback) {
      if(utils._.isValidNonBlank(installation))
        helpers.sns.subscirbeUserGroup(userGroup, installation, callback)
      else return callback(null,null)
    }
  ],function(err,data){
    utils.l.d('completed subsribeUserGroupNotification')
    return callback(err,data)
  })
}

function subscribeUserNotifications(user,forceUpdate,callback){
  var installationObj = null
  utils.async.waterfall([
    function(callback){
      models.installation.getInstallationByUser(user,callback)
    },function(installation, callback){
      installationObj=installation
      if(utils._.isValidNonBlank(installation))
        models.userGroup.getByUser(user._id,null,callback)
      else return callback({errorType:"EMPTY_INSTALLATION"},null)
    },function(userGroupList, callback){
      utils.async.mapSeries(
        userGroupList,
        function(userGroup,asyncCallback){
          if(utils._.isInvalidOrBlank(userGroup.serviceEndpoints))
            helpers.sns.subscirbeUserGroup(userGroup, installationObj, asyncCallback)
          else if(forceUpdate)
            helpers.sns.reSubscirbeUserGroup(userGroup, installationObj, asyncCallback)
          else
            return asyncCallback(null, null)
        },
        function(err, results){
          utils.l.d("completed userNotificationSubscriptions for "+utils.l.userLog(user))
          callback(null,null)
        }
      )
    }
  ],function(err,data){
    utils.l.d('completed subscription for notifications ')
    if(utils._.isValidNonBlank(err) && err.errorType == "EMPTY_INSTALLATION")
      return callback(null,data)
    else
      return callback(err,data)
  })
}

// -------------------------------------------------------------------------------------------------
// New Code

function createNewUser(req, data, callback) {
  utils.async.waterfall([
    function setImageUrlIfBlank(callback) {
      if(utils._.isInvalidOrBlank(data.imageUrl)) {
        handleMissingImageUrl(data, callback)
      } else {
        return callback(null, data)
      }
    },
    function createUserInDb(updatedData, callback) {
      models.user.createUserFromData(updatedData, callback)
    },
    function trackUserCreateInMixpanel(user, callback) {
      trackingService.trackUserSignup(req, user, function (err, response) {
        if(err) {
          utils.l.s("mixpanel trackUserSignup failed", err)
          return callback(null, user)
        } else {
          utils.l.d("mixpanel trackUserSignup succeeded", response)
          helpers.req.getHeader(req, 'x-mixpanelid')
          user.mpDistinctId = helpers.req.getHeader(req, 'x-mixpanelid')
          updateUser(user, callback)
        }
      })
    }
  ], callback)
}

function handleMissingImageUrl(data, callback) {
  utils.async.waterfall([
    function getRoundRobinCounterValue(callback) {
      models.roundRobinCounterModel.getValue(callback)
    },
    function setImageUrlAndUpdateCounterValue(roundRobinCounterValue, callback) {
      var imageFiles = utils.constants.imageFiles
      data.imageUrl = utils.constants.baseImageUrl + imageFiles[roundRobinCounterValue % imageFiles.length]
      utils.l.d("image URL round robin count = " + roundRobinCounterValue)
      utils.l.d("image files length = " + imageFiles.length)
      models.roundRobinCounterModel.incrementCounter(callback)
    }
  ],
    function (err, result) {
      return callback(null, data)
    })
}

function addConsole(user, consoleId, region, callback) {
  var outerUser = null
  utils.async.waterfall([
    function validateConsoleId(callback) {
      validateSummonerName(consoleId, region, callback)
    },
    function addConsoleToUser(summonerInfoResponse, callback) {
      var summonerInfo = getSummonerInfoFromSummonerInfoResponse(summonerInfoResponse)
       var console = {
         consoleId: summonerInfo.name,
         gamePlatformId: summonerInfo.id,
         region: region,
         gamePlayerLevel: summonerInfo.summonerLevel,
         isPrimary: true
       }
      user.consoles.push(console)
      // clanId == groupId == region
      user.clanId = region
      user.imageUrl = utils.constants.lolImageUrlTemplate.replace("#profileIconId#",
        summonerInfo.profileIconId.toString())
      updateUser(user, callback)
    },
    function addUserGroup(user, callback) {
      outerUser = user
      // clanId == groupId == region
      createUserGroup(user, region, "PC", false, callback)
    },
    function (userGroup, callback) {
      sendWelcomeEmail(user, function (err, response) {
        if(err) {
          utils.l.s("There was an error in sending welcome email", err)
        } else {
          utils.l.d("Email was sent successfully to: " + outerUser.userName)
        }
        return callback(null, outerUser)
      })
    }
  ], callback)
}

function createUserGroup(user, groupId, consoleType, muteNotification, callback) {
  userGroupService.createUserGroup(user, groupId, consoleType, muteNotification, callback)
}

function sendWelcomeEmail(user, callback) {
  utils.async.waterfall([
    function readHtmlFile(callback) {
      fs.readFile(utils.constants.WELCOME_EMAIL_HTML_TEMPLATE_PATH, 'utf8', function (err, html) {
        if(err) {
          return callback(err, null)
        } else {
          var emailMsg =  {
            subject: "Welcome to Crossroads For League of Legends",
            body: html
          }
          return callback(null, emailMsg)
        }
      })
    },
    function (emailMsg, callback) {
      if(utils.config.enableSESIntegration && utils.config.enableSendWelcomeEmail) {
        utils.l.d("SES integration is enabled")
        helpers.ses.sendEmail([user.userName], utils.constants.SES_EMAIL_SENDER, emailMsg.subject,
          emailMsg.body, callback)
      } else {
        utils.l.i("SES integration is disabled")
      }
    }
  ], callback)
}


function validateSummonerName(consoleId, region, callback) {
  var summonerNameExistsError = utils.errors.formErrorObject(utils.errors.errorTypes.addConsole,
    utils.errors.errorCodes.summonerNameAlreadyTaken, null, region)
  utils.async.waterfall([
    function checkDBForConsoleId(callback) {
      checkDBForSummonerProfile(consoleId, region, null, function (err, user) {
        if(utils._.isValidNonBlank(user)) {
          return callback(summonerNameExistsError, null)
        } else {
          return callback(err, user)
        }
      })
    },
    function getSummonerInfoFromLoLServer(user, callback) {
      getSummonerInfo(region, consoleId, callback)
    },
    function checkDBForGamePlatformId(summonerInfoResponse, callback) {
      checkDBForSummonerProfile(consoleId, region, summonerInfoResponse[Object.keys(summonerInfoResponse)[0]].id, function (err, user) {
        if(utils._.isValidNonBlank(user)) {
          return callback(summonerNameExistsError, null)
        } else {
          return callback(err, summonerInfoResponse)
        }
      })
    }
  ], callback)
}

function checkDBForSummonerProfile(consoleId, region, gamePlatformId, callback) {
  models.user.getUserBySummonerProfile(consoleId, region, gamePlatformId, callback)
}

function getSummonerInfoFromSummonerInfoResponse(summonerInfoResponse) {
  return summonerInfoResponse[Object.keys(summonerInfoResponse)[0]]
}

function getSummonerInfo(region, summonerName, callback) {
  var url = "/by-name/" + urlencode(summonerName)
  var baseUrlPlaceHolder = "https://#REGION_ABBR#.api.pvp.net/api/lol/#REGION_ABBR#/v1.4/summoner"
  request({
      baseUrl: baseUrlPlaceHolder
        .replace("#REGION_ABBR#", region.toLowerCase())
        .replace("#REGION_ABBR#", region.toLowerCase()),
      url: url,
      method: "GET",
      qs: {
        api_key: utils.config.riotGamesAPIKey
      }
    },
    function(err, response, results) {
      var error = utils.errors.formErrorObject(utils.errors.errorTypes.all,
        utils.errors.errorCodes.internalServerError, null, null)

      if(err) {
        utils.l.s("Error for url "  + " and err is::----" + err)
        return callback(err, null)
      }
      else if(response.statusCode == 200){
        return callback(null, JSON.parse(results))
      }

      switch(response.statusCode) {
        case 200:
          utils.l.d("got results:", results)
          return callback(null, JSON.parse(results))
          break
        case 400:
          utils.l.s("Bad request", response)
          return callback(error, null)
          break
        case 401:
          utils.l.s("Unauthorized", response)
          return callback(error, null)
          break
        case 404:
          utils.l.d("Summoner not found", response)
          error = utils.errors.formErrorObject(utils.errors.errorTypes.addConsole,
            utils.errors.errorCodes.summonerNotFoundInRegion, null, region)
          return callback(error, null)
          break
        case 429:
          utils.l.s("Rate limit exceeded", response)
          error = utils.errors.formErrorObject(utils.errors.errorTypes.all,
            utils.errors.errorCodes.serversBusy, null, null)
          return callback(error, null)
          break
        case 500:
          utils.l.s("Internal server err", response)
          error = utils.errors.formErrorObject(utils.errors.errorTypes.riotServerUnavailable,
            utils.errors.errorCodes.riotServerUnavailable, null, null)
          return callback(error, null)
          break
        case 503:
          utils.l.s("Service unavailable", response)
          error = utils.errors.formErrorObject(utils.errors.errorTypes.riotServerUnavailable,
            utils.errors.errorCodes.riotServerUnavailable, null, null)
          return callback(error, null)
          break
      }
    })
}

function changePassword(user, oldPassWord, newPassWord, callback) {
  utils.async.waterfall([
    function getUserWithPassword(callback) {
      models.user.getUserByIdWithPassword(user._id, callback)
    },
    function changePassword(userWithPassWord, callback) {
      if(!passwordHash.verify(oldPassWord.trim(), userWithPassWord.passWord)) {
        var error = utils.errors.formErrorObject(utils.errors.errorTypes.updatePassword,
          utils.errors.errorCodes.oldPasswordDoesNotMatchTheCurrentPassword, null, null)
        return callback(error, null)
      }
      user.passWord = passwordHash.generate(newPassWord.trim())
      updateUser(user, callback)
    }
  ], callback)
}

function changeEmail(user, passWord, newEmail, callback) {
  var trimmedPassword = passWord.trim()
  var cleanedNewEmail = newEmail.toLowerCase().trim()
  utils.async.waterfall([
    function getUserWithPassword(callback) {
      models.user.getUserByIdWithPassword(user._id, callback)
    },
    function validateLegitimateEmailChange(userWithPassWord, callback) {
      if(!passwordHash.verify(trimmedPassword, userWithPassWord.passWord)) {
        var error = utils.errors.formErrorObject(utils.errors.errorTypes.updatePassword,
          utils.errors.errorCodes.oldPasswordDoesNotMatchTheCurrentPassword, null, null)
        return callback(error, null)
      }
      models.user.getByQuery({userName: cleanedNewEmail}, utils.firstInArrayCallback(callback))
    },
    function changeEmail(userFoundInDb, callback) {
      if(utils._.isValidNonBlank(userFoundInDb)) {
        var error = utils.errors.formErrorObject(utils.errors.errorTypes.updateEmail,
          utils.errors.errorCodes.emailIsAlreadyTaken, null, null)
        return callback(error, null)
      }

      user.userName = cleanedNewEmail
      updateUser(user, callback)
    }
  ], callback)
}

function refreshHelmet(user, callback) {
  var primaryConsole = utils.primaryConsole(user)
  if(utils._.isInvalidOrBlank(primaryConsole)) {
    utils.l.s("user does not have a primary console", user)
    var error = utils.errors.formErrorObject(utils.errors.errorTypes.all,
      utils.errors.errorCodes.internalServerError, null, null)
    return callback(error, null)
  }

  var summonerName = primaryConsole.consoleId
  var region = primaryConsole.region

  utils.async.waterfall([
    function getSummonerInfoFromLoLServer(callback) {
      getSummonerInfo(region, summonerName, callback)
    },
    function refreshImageUrl(summonerInfoResponse, callback) {
      var summonerInfo = getSummonerInfoFromSummonerInfoResponse(summonerInfoResponse)
      user.imageUrl = utils.constants.lolImageUrlTemplate.replace("#profileIconId#",
        summonerInfo.profileIconId.toString())
      updateUser(user, callback)
    }
  ], callback)
}

module.exports = {
  userTimeout: userTimeout,
  preUserTimeout: preUserTimeout,
  upgradeConsole: upgradeConsole,
  updateReviewPromptCardStatus: updateReviewPromptCardStatus,
  changePrimaryConsole: changePrimaryConsole,
  checkBungieAccount: checkBungieAccount,
  setLegalAttributes: setLegalAttributes,
  refreshConsoles: refreshConsoles,
  setPrimaryConsoleAndHelmet: setPrimaryConsoleAndHelmet,
  getNewUserData: getNewUserData,
  updateUserConsoles: updateUserConsoles,
  updateUser: updateUser,
  getPendingEventInvites: getPendingEventInvites,
  refreshUserData: refreshUserData,
  updateUserGroup: updateUserGroup,
  handleMuteGroupNotifications: handleMuteGroupNotifications,
  listGroups: listGroups,
  bulkUpdateUserGroups: bulkUpdateUserGroups,
  bulkUpdateGroupStats: bulkUpdateGroupStats,
  subscribeUserNotifications: subscribeUserNotifications,
  updateGroupStats: updateGroupStats,
  refreshGroups: refreshGroups,
  subscribeUsersForGroup: subscribeUsersForGroup,

  // -------------------------------------------------------------------------------------------------
  // New Code

  createNewUser: createNewUser,
  addConsole: addConsole,
  changePassword: changePassword,
  changeEmail: changeEmail,
  refreshHelmet: refreshHelmet
}