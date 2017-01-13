// external libraries
var request = require('request')
var utils = require('../utils')
var models = require('../models')
var helpers = require('../helpers')
var tinyUrlService = require('./tinyUrlService')
var proxyURL = process.env.QUOTAGUARD_URL || 'http://quotaguard6541:60a2ade59642@proxy.quotaguard.com:9292'
var momentTimeZone = require('moment-timezone')

function getBungieVariables(callback) {
  var keys = [
    utils.constants.sysConfigKeys.bungieCookie,
    utils.constants.sysConfigKeys.bungieCsrfToken
  ]
  var bungieVariables = {}
  models.sysConfig.getSysConfigList(keys, function(err, sysConfigList) {
    if(!err && sysConfigList) {
      var bungieCookie = utils._.find(sysConfigList, function(sysConfig) {
        return sysConfig.key.toString() == utils.constants.sysConfigKeys.bungieCookie
      })
      var bungieCsrfToken = utils._.find(sysConfigList, function(sysConfig) {
        return sysConfig.key.toString() == utils.constants.sysConfigKeys.bungieCsrfToken
      })
      utils.l.d("got bungie cookie from sysconfig: ", bungieCookie.value)
      utils.l.d("got bungie csrf token from sysconfig: ", bungieCsrfToken.value)
      bungieVariables.bungieCookie = bungieCookie.value.toString()
      bungieVariables.bungieCsrfToken = bungieCsrfToken.value.toString()
    }
    else {
      bungieVariables.bungieCookie = utils.config.bungieCookie
      bungieVariables.bungieCsrfToken = utils.config.bungieCSRFToken
      if(utils._.isValidNonBlank(utils.config.bungieCookie)) {
        utils.l.d("got cookie from defaults: ", utils.config.bungieCookie)
      } else {
        utils.l.s("unable to get bungie cookie value")
      }

      if(utils._.isValidNonBlank(utils.config.bungieCSRFToken)) {
        utils.l.d("got csrf token from defaults: ", utils.config.bungieCSRFToken)
      } else {
        utils.l.s("unable to get bungie csrf value")
      }
    }
    return callback(bungieVariables)
  })
}

/*Get bungienet profile
 * 1. Make destinySearch call for displayname
 * 2. Using the result from search take membershipType and call GetBungieAccount API to bungie membershipcode
 * */
function getBungieMemberShip(consoleId, consoleType, destinyMembership, needHelmet, callback) {
  var destinyProfile = null
  var bungieResponse = {}
  utils.async.waterfall([
    function(callback) {
      if(utils._.isValidNonBlank(destinyMembership) && utils._.isValidNonBlank(destinyMembership.memberShipType))
        return callback(null, {
          memberShipId: destinyMembership.memberShipId,
          memberShipType: getBungieMembershipType(destinyMembership.memberShipType)
        })
      else if(utils._.isValidNonBlank(destinyMembership))
        return callback(null, {
          memberShipId: destinyMembership,
          memberShipType: getBungieMembershipType(consoleType)
        })
      else
        getDestinyProfileByConsole(consoleId, consoleType, callback)
    },
    function(destinyProfileResp, callback) {
      destinyProfile = destinyProfileResp
      getBungieAccount(destinyProfile, consoleId, consoleType, callback)
    },
    function(bungieAcct,callback) {
      getAccountDetails(bungieAcct, 'all', callback)
    },
    function(accountDetails, callback) {
      bungieResponse.bungieMemberShipId = accountDetails.bungieNetUser.membershipId
      getDestinyAccounts(accountDetails, needHelmet, callback)
    },
    function(destinyAccounts,callback) {
      bungieResponse.destinyProfile = destinyAccounts
      return callback(null, bungieResponse)
    }
  ], callback)
}

function getDestinyProfileByConsole(consoleId, consoleType, callback) {
  utils.async.waterfall([
    function(callback) {
      var destinySearchURL = utils.config.bungieDestinySearchByPSNURL
        .replace(/%MEMBERSHIPTYPE%/g, getBungieMembershipType(consoleType))
        .replace(/%MEMBERSHIPID%/g, consoleId)

      bungieGet(destinySearchURL, consoleId,
        utils._.get(utils.constants.consoleGenericsId, consoleType),
        callback)
    },
    function(destinyProfile, callback) {
      var destinyProfileJSON = JSON.parse(destinyProfile)
      if(destinyProfileJSON && destinyProfileJSON.Response) {
        var destinyResponse = {memberShipType: getBungieMembershipType(consoleType), memberShipId: destinyProfileJSON.Response}
        utils.l.d("Got destiny profile", destinyResponse)
        return callback(null, destinyResponse)
      } else {
        return callback(null, null)
      }
    }
  ], callback)
}

function getBungieAccount(destinyProfile, consoleId, consoleType, callback) {
  utils.async.waterfall([
    function(callback) {
      var bungieAcctURL = utils.config.bungieUserAccountURL + destinyProfile.memberShipId + "/"
        + destinyProfile.memberShipType + "/"
      bungieGet(bungieAcctURL, consoleId, utils._.get(utils.constants.consoleGenericsId, consoleType), callback)
    },
    function(bungieAcct, callback) {
      var bungieAcctJson = JSON.parse(bungieAcct)

      if(bungieAcctJson && bungieAcctJson.Response) {
        return callback(null, bungieAcctJson)
      }
      else {
        var err = utils.constants.bungieErrorMessage(bungieAcctJson.ErrorStatus)
        err.error.replace(/%CONSOLETYPE%/g, utils._.get(utils.constants.consoleGenericsId, consoleType))
          .replace(/%GAMERID%/g, consoleId)
        return callback(err, null)
      }
    }
  ], callback)
}

function getAccountDetails(bungieAcct,acctType,callback){
  var bungieAcctResponse = {}
  switch (acctType) {
    case "bungieNetUser":
      if(utils._.isInvalidOrBlank(bungieAcct.Response.bungieNetUser))
        return callback({
          error: "Your public Bungie profile is not displaying your linked gaming account. Please set it to public and try again.",
          errorType: "BungieError"
        }, null)
      else
        bungieAcctResponse.bungieNetUser = bungieAcct.Response.bungieNetUser
      break
    case "destinyAccounts":
      if(utils._.isInvalidOrBlank(bungieAcct.Response.destinyAccounts))
        return callback({
          error: "It looks like your Bungie account may be set to private or the server is busy. Please ensure your account is public and try again in a few minutes.",
          errorType: "BungieError"
        }, null)
      else
        bungieAcctResponse.destinyAccounts = bungieAcct.Response.destinyAccounts
        bungieAcctResponse.clans = bungieAcct.Response.clans
        bungieAcctResponse.relatedGroups = bungieAcct.Response.relatedGroups
      break
    case "all":
      if(utils._.isInvalidOrBlank(bungieAcct.Response.bungieNetUser)) {
        return callback({
          error: "Your public Bungie profile is not displaying your linked gaming account. Please set it to public and try again.",
          errorType: "BungieError"
        }, null)
      } else if((utils._.isValidNonBlank(bungieAcct.Response.destinyAccountErrors) && bungieAcct.Response.destinyAccountErrors.length > 0)
        && (utils._.isInvalidOrBlank(bungieAcct.Response.destinyAccounts) || bungieAcct.Response.destinyAccounts.length <=0))  {
        return callback({
          error: "In line with Rise of Iron, we now only support next-gen consoles. When you’ve upgraded your console, please come back and join us!",
          errorType: "BungieLegacyConsoleError"
        }, null)
      } else {
        bungieAcctResponse.bungieNetUser = bungieAcct.Response.bungieNetUser
        bungieAcctResponse.destinyAccounts = bungieAcct.Response.destinyAccounts
        bungieAcctResponse.clans = bungieAcct.Response.clans
        bungieAcctResponse.relatedGroups = bungieAcct.Response.relatedGroups
      }
      break
    default:
      break
  }
  return callback(null, bungieAcctResponse)
}

function getDestinyAccounts(accountDetail,needHelmet,callback) {
  utils.async.mapSeries(accountDetail.destinyAccounts, function(account, asyncCallback) {
    getDestinyDetails(account, accountDetail.clans, accountDetail.relatedGroups, needHelmet, asyncCallback)
  },
    function(err, destinyAccounts) {
    return callback(err, destinyAccounts)
  })
}

function getClanTag(accountDetail, clans, relatedGroups, destinyProfile) {
  var clanTag = null
  if(!utils._.isInvalidOrBlank(accountDetail.destinyAccounts)) {
    utils._.map(accountDetail.destinyAccounts, function(account) {
      utils.l.d('getClanTag::account.userInfo.membershipId',account.userInfo.membershipId)
      if(account.userInfo.membershipId.toString() == destinyProfile.memberShipId.toString()) {
       utils.l.d("getClanTag::"+account.userInfo.membershipId.toString()+"::clans::"+JSON.stringify(clans,null,'  ')+"::relatedGroups"+JSON.stringify(clans,null,'  '))
        clanTag = getClanTagFromGroups(account, clans, relatedGroups)
      }
    })
  }
  return clanTag
}

function getBungieHelmet(consoleId, consoleType, destinyMembershipId, callback){
  var destinyProfile = null
  var clanTag = null
  utils.async.waterfall([
    function(callback) {
      if(utils._.isValidNonBlank(destinyMembershipId))
        return callback(null, {memberShipId: destinyMembershipId, memberShipType: getBungieMembershipType(consoleType)})
      else
        getDestinyProfileByConsole(consoleId, consoleType, callback)
    },
    function(destinyProfileResp, callback) {
      destinyProfile = destinyProfileResp
      getBungieAccount(destinyProfile, consoleId, consoleType, callback)
    },
    function(bungieAcct, callback) {
      getAccountDetails(bungieAcct, 'destinyAccounts', callback)
    },
    function(accountDetails, callback) {
      clanTag = getClanTag(accountDetails, accountDetails.clans, accountDetails.relatedGroups,destinyProfile)
      utils.l.d("clanTag", clanTag)
      var character = getRecentlyPlayedCharacter(accountDetails.destinyAccounts, destinyProfile.memberShipId)
      utils.l.d("recent character", character)
      if(character) {
        return callback(null, character)
      }
      else {
        return callback({error: "Looks like you do not have any destiny account.", errorType: "BungieError"}, null)
      }
    },
    function(character, callback){
      var bungieItemsURL = utils.config.bungieItemsURL
        .replace(/%MEMBERSHIPTYPE%/g, character.membershipType)
        .replace(/%MEMBERSHIPID%/g, character.membershipId)
        .replace(/%CHARACTERID%/g, character.characterId)

      bungieGet(bungieItemsURL, consoleId,utils._.get(utils.constants.consoleGenericsId, consoleType),callback)
    },
    function(itemDefinitions, callback) {
      var itemDefJSON = JSON.parse(itemDefinitions)
      if(itemDefJSON && itemDefJSON.Response && itemDefJSON.Response.definitions && itemDefJSON.Response.definitions.items) {
        var helmetURL = getHelmentURL(itemDefJSON.Response.definitions.items)
        utils.l.d("helmetURL::" +  helmetURL)
        return callback(null, {helmetURL: helmetURL, clanTag: clanTag, destinyProfile: destinyProfile})
      } else {
        return callback(null, null)
      }
    }
  ], callback)
}


function getDestinyDetails(account, clans, relatedGroups,needHelmet,callback){
  var destinyUserInfo = {}
  destinyUserInfo.clanTag= getClanTagFromGroups(account,clans,relatedGroups)
  destinyUserInfo.destinyMembershipId = account.userInfo.membershipId
  destinyUserInfo.destinyMembershipType = account.userInfo.membershipType
  destinyUserInfo.destinyDisplayName = account.userInfo.displayName

  utils.async.waterfall([
    function(callback) {
      if(needHelmet) {
        var character = getLastCharacter(account.characters)
        var bungieItemsURL = utils.config.bungieItemsURL
          .replace(/%MEMBERSHIPTYPE%/g, character.membershipType)
          .replace(/%MEMBERSHIPID%/g, character.membershipId)
          .replace(/%CHARACTERID%/g, character.characterId)
        var consoleType = utils._.get(utils.constants.newGenConsoleType, account.userInfo.memberShipType)
        bungieGet(bungieItemsURL, account.userInfo.displayName, utils._.get(utils.constants.consoleGenericsId, consoleType), callback)
      } else
        return callback(null, null)
    },
    function(itemDefinitions, callback) {
      var itemDefJSON = utils._.isValidNonBlank(itemDefinitions) ? JSON.parse(itemDefinitions) : null
      if(itemDefJSON && itemDefJSON.Response && itemDefJSON.Response.definitions && itemDefJSON.Response.definitions.items) {
        var helmetURL = getHelmentURL(itemDefJSON.Response.definitions.items)
        utils.l.d("helmetURL::" + helmetURL)
        destinyUserInfo.helmetUrl = helmetURL
        return callback(null, destinyUserInfo)
      } else {
        return callback(null, destinyUserInfo)
      }
    }
  ], callback)
}

function getClanTagFromGroups(account, clans, relatedGroups) {
  var clanTag = null
  if(utils._.isValidNonBlank(clans)) {
    utils._.map(clans, function (clanGroup) {
      if (clanGroup.platformType == account.userInfo.membershipType) {
        var group = utils._.get(relatedGroups, clanGroup.groupId)
        if(utils._.isValidNonBlank(group))
          clanTag = group.clanCallsign
      }
    })
  }
  return clanTag
}

/*Get bungienet profile
 * 1. Make destinySearch call for displayname
 * 2. Using the result from search take membershipType and call GetBungieAccount API to bungie membershipcode
 * 3. Send message to bungie user from traveler account
 *
 * TBD - Change the from ID to traveler account instead of Harsha's account :-)
 * */
function sendBungieMessage(bungieMemberShipId, consoleType, messageType, callback) {
  utils.async.waterfall([
      function (callback) {
        var convUrl = utils.config.bungieConvURL
        var token = helpers.uuid.getRandomUUID()
        utils.l.d("bungieMemberShipId = ", bungieMemberShipId)

        getMessageBody(utils.config.hostUrl(), token, messageType,consoleType, null, function(err, msgTxt) {
          var msgBody = {
            membersToId: utils._.flatten([utils.config.bungieCrsRdAppId, bungieMemberShipId]),
            body: msgTxt
          }
          utils.l.d("msgBody::",msgBody)
          bungiePost(convUrl, msgBody, token, bungieMemberShipId, consoleType, callback)
        })
      }
    ], callback)
}

function sendBungieMessageV2(bungieMemberShipId, consoleType, messageType,messageDetails,callback){
  utils.async.waterfall([
      function (callback) {
        var convUrl = utils.config.bungieConvURL
        var token = helpers.uuid.getRandomUUID()
        utils.l.d("bungieMemberShipId=", bungieMemberShipId)

        getMessageBody(utils.config.hostUrl(), token, messageType,consoleType,messageDetails,function(err,msgTxt){
          var msgBody = {
            membersToId: utils._.flatten([utils.config.bungieCrsRdAppId, bungieMemberShipId]),
            body: msgTxt
          }
          utils.l.d("msgBody::",msgBody)
          bungiePost(convUrl, msgBody, token,bungieMemberShipId,consoleType, callback)
        })
      }
    ], callback)
}

function listBungieGroupsJoined(destinyMembershipId, consoleType, currentPage, callback){
  utils.async.waterfall([
    function(callback) {
      var destinyGruopsJoinedURL = utils.config.destinyGruopsJoinedURL
        .replace(/%MEMBERSHIPID%/g, destinyMembershipId)
        .replace(/%CURRENTPAGE%/g, currentPage)
      bungieGet(destinyGruopsJoinedURL, null,
        utils._.get(utils.constants.consoleGenericsId, consoleType), callback)
    },
    function(bungieGroups, callback) {
      tranformJoinedGroups(bungieGroups, callback)
    }
  ], callback)
}

//url: "https://www.bungie.net/Platform/User/GetBungieAccount/"+memberShipId+"/2/",
//url:"https://www.bungie.net/Platform/Destiny/SearchDestinyPlayer/-1/"+memberShipId+"/",
//url: "https://www.bungie.net/Platform/Destiny/2/Account/"+memberShipId,
//url:"http://www.bungie.net/Platform/User/SearchUsers/?q="+memberShipId,
//url:"https://www.bungie.net/Platform/User/GetBungieNetUser/",
function bungieGet(url, gamerId, consoleType, callback) {
  utils.l.d("bungieGet", url)

  request({
    url: url,
    method: "GET",
    headers: {
      'X-API-KEY': utils.config.bungieAPIToken,
    }
  }, function(error, response, bungieData) {
    if(error) {
      utils.l.s("Error getting bungie for url " + url + " and error is::----" + error)
      return callback(error, null)
    } else {
      utils.l.d('bungie GET for url::'+url)
      if(utils.isJson(bungieData)) {
        var bungieJSON = JSON.parse(bungieData)
        utils.l.d("bungie error status: " + bungieJSON.ErrorStatus)
        if (bungieJSON.ErrorStatus == 'Success')
          return callback(null, bungieData)
        else {
          if (bungieJSON.ErrorStatus != "UserCannotResolveCentralAccount")
            utils.l.s("bungie message GET error", {url: url, bungieData: bungieData, consoleType: consoleType})
          var err = utils.constants.bungieErrorMessage(bungieJSON.ErrorStatus)
          err.error.replace(/%CONSOLETYPE%/g, consoleType).replace(/%GAMERID%/g, gamerId)
          return callback(err, null)
        }
      } else {
        var err = utils.constants.bungieErrorMessage('NotParsableError')
        err.error.replace(/%CONSOLETYPE%/g, consoleType).replace(/%GAMERID%/g, gamerId)
        return callback(err, null)
      }
    }
  })
}

function bungiePost(url, msgBody, token, bungieMemberShipId, consoleType, callback) {
  utils.async.waterfall([
    function (callback) {
      getBungieVariables(function(bungieVariables) {
        return callback(null, bungieVariables)
      })
    },
    function (bungieVariables, callback) {
      request({
        url: url,
        method: "POST",
        headers: {
          'x-api-key': utils.config.bungieAPIToken,
          'x-csrf': bungieVariables.bungieCsrfToken,
          'cookie': bungieVariables.bungieCookie,
        },
        body: msgBody,
        json: true
      }, function(error, response, bungieData) {
        if(error) {
          utils.l.s("Error posting to bungie::" + error)
          return callback(error, null)
        } else {
          utils.l.d("response::bungieData ", bungieData)
          var bungieJSON = bungieData
          utils.l.d("Got bungie for " + url)
          //if(utils.isJson(bungieData)) {
            if (bungieJSON.ErrorStatus == 'Success')
              return callback(null,
                {
                  bungieProfile: bungieData,
                  token: token,
                  bungieMemberShipId: bungieMemberShipId
                }
              )
            else {
              if (bungieJSON.ErrorStatus != "UserCannotResolveCentralAccount")
                utils.l.s("bungie message POST error",
                  {
                    errorStatus: bungieJSON.ErrorStatus,
                    url: url,
                    msgBody: msgBody,
                    token: token,
                    bungieMemberShipId: bungieMemberShipId,
                    consoleType: consoleType
                  })
              var err = utils.constants.bungieErrorMessage(bungieJSON.ErrorStatus)
              err.error.replace(/%CONSOLETYPE%/g, consoleType)
              return callback(err, null)
            }
        }
      })
    }
  ], callback)
}

function getMessageBody(host,token,messageType,consoleType, messageDetails, callback){
  var msg = null
  switch (messageType) {
    case utils.constants.bungieMessageTypes.accountVerification:
      tinyUrlService.createTinyUrl(host + "/api/v1/auth/verify/" + token, function(err, url) {
        console.log("url from createTinyUrl" + url)
        msg = utils.constants.bungieMessages.accountVerification
          .replace(/%URL%/g, url)
          .replace(/%APPNAME%/g, utils.config.appName)
          .replace(/%CONSOLETYPE%/g, consoleType)
        utils.l.d("verify msg to send::" + msg)
        return callback(null, msg)
      })
      break
    case utils.constants.bungieMessageTypes.passwordReset:
      tinyUrlService.createTinyUrl(host + "/api/v1/auth/resetPassword/" + token, function(err, url) {
        msg = utils.constants.bungieMessages.passwordReset
          .replace(/%URL%/g, url)
          .replace(/%APPNAME%/g, utils.config.appName)
        utils.l.d("resetPassword msg to send::" + msg)
        return callback(null, msg)
      })
      break
    case utils.constants.bungieMessageTypes.eventInvitation:
      var event = messageDetails ? messageDetails.event : null
      var invitedByGamerTag = messageDetails.invitedByGamerTag
      var invitationLink = messageDetails.invitationLink
      if(utils._.isValidNonBlank(event)) {
        if(event.launchStatus == utils.constants.eventLaunchStatusList.now)
          msg = utils.constants.bungieMessages.eventInvitationCurrent
            .replace(/%CONSOLE_ID%/g, invitedByGamerTag)
            .replace(/%ACTIVITY_NAME%/g, event.eType.aSubType)
            .replace(/%EVENT_DEEPLINK%/g, invitationLink)
        else
          msg = utils.constants.bungieMessages.eventInvitationUpcoming
            .replace(/%CONSOLE_ID%/g, invitedByGamerTag)
            .replace(/%ACTIVITY_NAME%/g, event.eType.aSubType)
            .replace(/%EVENT_DEEPLINK%/g, invitationLink)
            .replace(/%EVENT_TIME%/g, momentTimeZone.tz(event.launchDate,"America/Los_Angeles").format("h:m A z on dddd, MMM Do"))
      } else {
        msg = utils.constants.bungieMessages.eventInvitationDefault
      }
      return callback(null, msg)
      break
    default:
      break
  }
}

function tranformJoinedGroups(bungieGroups,callback){
  var bungieGroupsJson = JSON.parse(bungieGroups)
  if(bungieGroupsJson && bungieGroupsJson.Response && bungieGroupsJson.Response.results) {
    var groups = utils._.map(bungieGroupsJson.Response.results,function(group){
      return {
        groupId: group.detail.groupId,
        groupName: group.detail.name,
        avatarPath: utils.config.bungieBaseURL+group.detail.avatarPath,
        bungieMemberCount: group.detail.memberCount,
        clanEnabled: isClanEnabled(group.detail.clanCallsign)
      }
    })
    return callback(null, groups)
  }
  return callback(null, null)
}

function isClanEnabled(clanCallSign) {
  return utils._.isUndefined(clanCallSign) || utils._.isEmpty(clanCallSign)
}

function getBungieMembershipType(membershipType) {
  utils.l.d("membershipType::" + membershipType, utils._.get(utils.constants.bungieMemberShipType, membershipType))
  return utils._.get(utils.constants.bungieMemberShipType, membershipType)
}


function getRecentlyPlayedCharacter(destinyAccounts, memberShipId) {
  var characters = null
  utils._.map(destinyAccounts, function(account) {
    utils.l.d('account.userInfo.membershipId', account.userInfo.membershipId)
    if(account.userInfo.membershipId.toString() == memberShipId.toString())
      characters = account.characters
  })

  return getLastCharacter(characters)
}

function getLastCharacter(characters) {
  var sortedChars = utils._.sortBy(utils._.flatMap(characters), function(character) {
    return utils.moment(character.dateLastPlayed)
  })

  var lastCharacter = utils._.last(sortedChars)
  if(lastCharacter) {
    return {
      characterId: lastCharacter.characterId,
      membershipId: lastCharacter.membershipId,
      membershipType: lastCharacter.membershipType
    }
  }
  else {
    return null
  }
}

function getHelmentURL(itemDef) {
  var mapVal = utils._.mapValues(itemDef, function(value) {
    if(value.itemTypeName == "Helmet")
      return value.icon
  })
  utils.l.d("mapVal:raw::", mapVal)
  mapVal = utils._.compact(utils._.values(mapVal))
  utils.l.d("mapVal:compact", mapVal)
  mapVal = mapVal && mapVal.length > 0 ? mapVal[0] : null
  utils.l.d("mapVal:final", mapVal)
  return mapVal
}

module.exports = {
  getBungieMemberShip: getBungieMemberShip,
  sendBungieMessage: sendBungieMessage,
  sendBungieMessageV2: sendBungieMessageV2,
  listBungieGroupsJoined: listBungieGroupsJoined,
  getBungieHelmet: getBungieHelmet,
  getBungieAccount: getBungieAccount,
  getMessageBody: getMessageBody
}