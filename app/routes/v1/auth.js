var express = require('express')
var router = express.Router()
var config = require('config')
var utils = require('../../utils')
var helpers = require('../../helpers')
var routeUtils = require('../routeUtils')
var models = require('../../models')
var service = require('../../service/index')
var passport = require('passport')
var passwordHash = require('password-hash')

function login (req, res) {
  utils.l.d("Login request", req.body)
/*  var outerUser = null
    utils.async.waterfall(
    [
      helpers.req.handleVErrorWrapper(req),
      function(callback) {
        if(req.body.consoles) {
          req.body.consoles.consoleType = req.body.consoles.consoleType.toString().toUpperCase()
          req.body.consoles.consoleId = req.body.consoles.consoleId.toString().trim()
        }
        if(!req.body.userName) {
          req.body.userName = req.body.consoles.consoleId
        }
        utils.l.d('calling passport...')
        var passportHandler = passport.authenticate('local', function(err, user) {
          utils.l.d('passport.authenticate',user)
          if (err) {
            return callback(err, null)
          } else if (!user) {
            return callback({error: "Our signup has changed. Please update to the latest version to sign up."},null)
            //handleNewUser(req, callback)
          } else {
            return callback(null, user)
          }
        })
        passportHandler(req, res)
      },
      function (user, callback) {
        handlePostLogin(req, user, callback)
      },
      function(user,callback) {
        service.authService.addLegalAttributes(user, function(err, data) {
          outerUser = data
          return callback(null, user)
        })
      },
      reqLoginWrapper(req, "auth.login")
    ],
      function (err) {
        if (err) {
          return routeUtils.handleAPIError(req, res, err, err)
        } else {
          routeUtils.handleAPISuccess(req, res,
            {
              value: outerUser,
              message: getSignupMessage(outerUser)
            })
        }
      }
    )*/

  var errorResponse = {
    error: "Our login system has changed. Please update to the latest version in the App Store to continue using Crossroads."
  }
  routeUtils.handleAPIError(req, res, errorResponse, errorResponse)
}

function validateUserLogin(req, res) {
  utils.l.d("handleBungieResponse request", req.body)
  var data = req.body

  if(!data.bungieResponse || !data.consoleType) {
    utils.l.s("Bad handleBungieResponse request")
    var err = {error: "Something went wrong. Please try again later."}
    routeUtils.handleAPIError(req, res, err, err)
    return
  }

  var errorStatus = data.bungieResponse.ErrorStatus
  var response = data.bungieResponse.Response
  var outerUser = null

  if(!errorStatus || errorStatus != "Success" || !response || !response.bungieNetUser || utils._.isInvalidOrBlank(response.bungieNetUser.membershipId)) {
    var err = utils.constants.bungieErrorMessage(data.bungieResponse.ErrorStatus)
    err.error.replace(/%CONSOLETYPE%/g, utils._.get(utils.constants.consoleGenericsId, data.consoleType))
    routeUtils.handleAPIError(req, res, err, err)
    return
  }

  var bungieNetUser = response.bungieNetUser
  if(utils._.isValidNonBlank(response.destinyAccountErrors)
    &&
    (response.destinyAccountErrors.length > 1
    || utils._.get(utils.constants.newGenConsoleType, response.destinyAccountErrors[0].membershipType) == data.consoleType)) {
    var err = utils.constants.bungieErrorMessage("BungieLegacyConsoleError")
    routeUtils.handleAPIError(req, res, err, err)
    return
  }

  var createNewUser = false

  var trimmedBungieResponse = getDestinyAccounts(bungieNetUser,data.consoleType)

  utils.async.waterfall([
    helpers.req.handleVErrorWrapper(req),
    function(callback) {
      data.bungieMemberShipId = bungieNetUser.membershipId
      data.selectedConsole = trimmedBungieResponse.selectedConsole
      data.userName = data.bungieMemberShipId
      data.passWord = "password"
      utils.l.d('calling passport...')
      var passportHandler = passport.authenticate('local', function(err, user) {
        utils.l.d('passport.authenticate', user)
        if (err) {
          return callback(err, null)
        } else if (!user) {
          createNewUser = true
          handleNewUserV2(req, trimmedBungieResponse, data.bungieMemberShipId, data.consoleType, callback)
        } else {
          user.isLoggedIn = true
          user.verifyStatus = "VERIFIED"
          user.lastActiveTime=new Date()
          service.userService.changePrimaryConsole(user, data.consoleType, function (err, updatedUser) {})
          service.userService.updateUser(user, callback)
        }
      })
      passportHandler(req, res)
    },
    function (user, callback) {
      handlePostLoginV2(req, user,trimmedBungieResponse, callback)
    },
    function(user, callback) {
      service.authService.addLegalAttributes(user, function(err, data) {
        outerUser = data
        return callback(null, user)
      })
    },
    reqLoginWrapper(req, "auth.login")
  ],
    function (err) {
      if (err) {
        return routeUtils.handleAPIError(req, res, err, err)
      } else {
        //if(createNewUser)
        service.userService.updateUserConsoles(outerUser)
        routeUtils.handleAPISuccess(req, res,
          {
            value: outerUser,
            message: getSignupMessage(outerUser)
          })
      }
    }
  )
}

function getDestinyAccounts(bungieNetUser,consoleType){
  var consoles = []
  var selectedConsole = {}
  utils.l.d('getDestinyAccounts::consoleType',consoleType)
  // Due to the old login flow we parsed another bungie API to lookup a user
  // We need the trimmedBungieResponse to be in this format to be parsed correctly
  if(utils._.isValidNonBlank(bungieNetUser.psnDisplayName)) {
    if(consoleType.toString() == "PS4"){
      selectedConsole.consoleType= consoleType
      selectedConsole.consoleId= bungieNetUser.psnDisplayName
    }
    consoles.push({
      destinyDisplayName: bungieNetUser.psnDisplayName,
      destinyMembershipType: utils.constants.bungieMemberShipType.PS4
    })
  }

  if(utils._.isValidNonBlank(bungieNetUser.xboxDisplayName)) {
    if(consoleType.toString() == "XBOXONE"){
      selectedConsole.consoleType= consoleType
      selectedConsole.consoleId= bungieNetUser.xboxDisplayName
    }
    consoles.push({
      destinyDisplayName: bungieNetUser.xboxDisplayName,
      destinyMembershipType: utils.constants.bungieMemberShipType.XBOXONE
    })
  }

  var trimmedBungieResponse = {
    destinyProfile: consoles,
    bungieMemberShipId: bungieNetUser.membershipId,
    selectedConsole:selectedConsole
  }
  utils.l.d("trimmedBungieResponse::",trimmedBungieResponse)
  return trimmedBungieResponse
}

function handlePostLogin(req,user,callback){
  var needFirebaseUpdate = false;
  var isInvitedUserInstall = false;
  utils.async.waterfall([
    function(callback){
      models.user.getById(user._id,callback)
    },function(user,callback){
      user.isLoggedIn = true
      if((user.verifyStatus == "INVITED" || user.verifyStatus == "INVITATION_MSG_FAILED" ||  user.verifyStatus == "INITIATED")){
        user.passWord = passwordHash.generate(req.body.passWord)
        if(isInvitedUser(req.body.invitation,user)) { //if the invited user clicks invitiation deep link from branch mark them verified.
          if(user.verifyStatus != "INITIATED")
            isInvitedUserInstall=true
          user.verifyStatus = "VERIFIED"
          utils._.map(user.consoles, function (console) {
            console.verifyStatus = "VERIFIED"
          })
          needFirebaseUpdate=true
          return callback(null, user)
        }else if( user.verifyStatus == "INVITED"){
          //if the user downloads app and signin treat them as regular user. Send bungie account verification link.
          //If message send fails keep the status as invited, so next login attempt will resent bungie message.
          //var bungieMsgResponse =
          needFirebaseUpdate=true
          service.authService.sendVerificationMessage(user,
            req.body.consoles?req.body.consoles.consoleType:utils.primaryConsole(user).consoleType,
            utils.constants.bungieMessageTypes.accountVerification,null,"INITIATED",function(err,userToVerify){
              utils.l.d("sent bungie message for invited user::",userToVerify)
              if(!err){
                utils._.map(userToVerify.consoles, function(console){
                  console.verifyStatus="INITIATED"
                })
                return callback(null,userToVerify)
                utils.l.d("Updated consoles for invited user::222::",userToVerify)
              }else
                return callback(null,user)
            })
        }else{
          return callback(null,user)
        }
      }else if(user.verifyStatus == "INVALID_GAMERTAG"){
        var error = {
          error: utils.constants.bungieMessages.bungieMembershipLookupError
            .replace("#CONSOLE_TYPE#", utils._.get(utils.constants.consoleGenericsId, req.body.consoles.consoleType))
            .replace("#CONSOLE_ID#", req.body.consoles.consoleId),
          errorType: "BungieError"
        }
        return callback({error:error},null)
      }
      else callback(null,user)
    },function(user,callback){
      if(req.body.consoles)
        service.userService.setPrimaryConsoleAndHelmet(user,req.body.consoles)

      var primaryConsole = utils.primaryConsole(user)
      if(utils._.isInvalidOrBlank(user.verifyStatus)){
        user.verifyStatus = primaryConsole.verifyStatus
        user.verifyToken = primaryConsole.verifyToken
      }
      callback(null,user)
    },function(user,callback){
      var updateMpDistinctId = service.trackingService.needMPIdfresh(req,user)
      var existingUserZuid = req.zuid
      if(updateMpDistinctId){// An existing user logging for first time after installing the app. Create mp user
        req.zuid = user._id
        req.adata.distinct_id=user._id
        service.trackingService.trackUserLogin(req,user,updateMpDistinctId,existingUserZuid,isInvitedUserInstall,function(err,data){
          utils.l.d('*********************auth:111::err',err)
          utils.l.d('*********************auth:111::data',data)
          if(!err){
            utils.l.d('setting mp refresh data')
            var mpDistincId = helpers.req.getHeader(req,'x-mixpanelid')
            user.mpDistinctId = mpDistincId
            user.mpDistinctIdRefreshed=true
          }
          utils.l.d("***************Saving user:::::",user)
          models.user.save(user, callback)
        })
      }else {// An existing user logging in either as a result of log out or app calling login when launched.
        utils.l.d("***************else::Saving user:::::", user)
        req.zuid = user._id
        req.adata.distinct_id=user._id
        if(existingUserZuid.toString() != user._id.toString()){
          //app calling due to log out then zuid and user._id are different.
          // With logout cookie is cleared and next api call will issue new zuid
          // Fire appInit and remove mp user created due to new session id.
          helpers.m.removeUser(existingUserZuid)
          helpers.m.incrementAppInit(req)
          helpers.m.trackRequest("appInit", {}, req, user)
        }
        models.user.save(user, callback)
      }

      if(needFirebaseUpdate)
        helpers.firebase.updateUser(user)
    }
  ],
  callback)
}

function handlePostLoginV2(req,user,trimmedBungieResponse, callback){
  utils.async.waterfall([
      function(callback){
        models.user.getById(user._id,callback)
      },function(user,callback){
        if(utils._.isInvalidOrBlank(user.bungieMemberShipId)){
          service.userService.refreshUserData(trimmedBungieResponse,user,req.body.consoleType)
        }

        callback(null,user)
      },function(user,callback){
        var isInvitedUserInstall =isInvitedUser(req.body.invitation,user)

        var updateMpDistinctId = service.trackingService.needMPIdfresh(req,user)
        var existingUserZuid = req.zuid
        if(updateMpDistinctId){// An existing user logging for first time after installing the app. Create mp user
          req.zuid = user._id
          req.adata.distinct_id=user._id
          service.trackingService.trackUserLogin(req,user,updateMpDistinctId,existingUserZuid,isInvitedUserInstall,function(err,data){
            if(!err){
              utils.l.d('setting mp refresh data')
              var mpDistincId = helpers.req.getHeader(req,'x-mixpanelid')
              user.mpDistinctId = mpDistincId
              user.mpDistinctIdRefreshed=true
            }
            models.user.save(user, callback)
          })
        }else {// An existing user logging in either as a result of log out or app calling login when launched.
          req.zuid = user._id
          req.adata.distinct_id=user._id
          if(existingUserZuid.toString() != user._id.toString()){
            //app calling due to log out then zuid and user._id are different.
            // With logout cookie is cleared and next api call will issue new zuid
            // Fire appInit and remove mp user created due to new session id.
            helpers.m.removeUser(existingUserZuid)
            helpers.m.incrementAppInit(req)
            helpers.m.trackRequest("appInit", {}, req, user)
          }
          models.user.save(user, callback)
        }
      }
    ],
    callback)
}

function isInvitedUser(invitation,user){
  var invitedUser = false
  if(utils._.isValidNonBlank(invitation) && utils._.isValidNonBlank(invitation.invitees)){
    utils._.map(user.consoles,function(console){
      if(utils._.hasElement(invitation.invitees,console.consoleId.toString()) ) {
        invitedUser = true
      }
    })
  }
  return invitedUser
}


function handleNewUserV2(req, trimmedBungieResponse, bungieMemberShipId, consoleType, callback) {
  // We need to define this as that's how we were handling consoles in the old API
  req.body.consoles = {
    consoleType: consoleType
  }
  createNewUser(req, trimmedBungieResponse, false, "VERIFIED", callback)
}

/*
function handleNewUser(req, callback) {
  var body = req.body
  var bungieResponse = null
  utils.async.waterfall([
    function(callback) {
      service.userService.checkBungieAccount(body.consoles, true,callback)
    },
    function (bungieMember, callback) {
      bungieResponse = bungieMember
      models.user.getUserByData({bungieMemberShipId: bungieMember.bungieMemberShipId}, function(err, user) {
        if(err) {
          utils.l.s("Database lookup for user failed", err)
          return callback({error: "Something went wrong. Please try again"}, null)
        } else {
          return callback(null, user)
        }
      })
    },
    function(user, callback) {
      if(!user) {
        createNewUser(req, bungieResponse, null, "INITIATED", callback)
      } else {
        if (!passwordHash.verify(body.passWord, user.passWord)) {
          return callback({error: "The username and password do not match our records."}, null)
        } else if((body.consoles.consoleType == 'PS3' && utils._.isValidNonBlank(utils.getUserConsoleObject(user, "PS4")))
          || (body.consoles.consoleType == 'XBOX360' && utils._.isValidNonBlank(utils.getUserConsoleObject(user, "XBOXONE")))) {
          return callback({error: "You cannot downgrade your console"}, null)
        } else {
          service.userService.refreshConsoles(user, bungieResponse, req.body.consoles, callback)
        }
      }
    }
  ], callback)
}
*/

function createNewUser(req, bungieResponse, localEnableBungieIntegration,
                       userVerificationStatus, callback) {
  var body = req.body
  if(body.consoles.consoleType == "XBOX360" || body.consoles.consoleType == "PS3") {
    return({error: "We do not support old generation consoles anymore. " +
    "Please try again once you have upgraded to a new generation console"}, null)
  }
  var mpDistinctId = helpers.req.getHeader(req, 'x-mixpanelid')

  var userData = service.userService.getNewUserData(body.passWord, body.clanId, mpDistinctId, false,
    bungieResponse, body.consoles.consoleType, userVerificationStatus)

  utils.async.waterfall([
      helpers.req.handleVErrorWrapper(req),
      function(callback) {
        /* We need this call explicitly incase a new user is trying to
         create an account from a phone which already had this app */
        models.user.getOrCreateUIDFromRequest(req, true, callback)
      },
      function (uid, callback) {
        userData._id = uid
        var enableBungieIntegration = utils._.isValidNonBlank(localEnableBungieIntegration) ? localEnableBungieIntegration : utils.config.enableBungieIntegration
        service.authService.createNewUser(userData, enableBungieIntegration, userVerificationStatus,
          utils.constants.bungieMessageTypes.accountVerification, null, callback)
      },
      reqLoginWrapper(req, "auth.login")
    ],
    function (err, user) {
      if (err) {
        utils.l.s("There was an error in creating the user", err)
        return callback(err, null)
      } else {
        helpers.firebase.createUser(user)
        service.trackingService.trackUserSignup(req, user, callback)
        return callback(null, user)
      }
    }
  )
}

function boLogin (req, res) {
  //req.assert('userName', "Name must be between 1 and 50 alphanumeric, alpha if one character, no special characters/space").notEmpty().isName()
  //req.assert('passWord', "Name must be between 1 and 50 alphanumeric, alpha if one character, no special characters/space").notEmpty().isAlphaNumeric()
  utils.l.d("In boLogin")
  var outerUser = null
  utils.async.waterfall(
    [
      helpers.req.handleVErrorWrapper(req),
      function(callback) {
        var passportHandler = passport.authenticate('local', function(err, user, info) {
          if (err) {
            return callback(err)
          }
          var userType = JSON.parse(JSON.stringify(user)).userType
          console.log("userType from passport "+userType)
          if (!user) {
            return callback({error: "Password is incorrect"}, null)
          }else if(user && userType != 'admin'){
            return callback({error: "User is not authorized"}, null)
          }
          outerUser = user
          callback(null, user)
        })
        passportHandler(req, res)
      },
      reqLoginWrapper(req, "auth.login")
    ],
    function (err) {
      if (err) {
        if (err instanceof helpers.errors.ValidationError) {
          req.routeErr = err
        } else {
          req.routeErr = {error: "the input auth combination is not valid"}
        }
        return routeUtils.handleAPIError(req, res, req.routeErr,req.routeErr)
      }

      routeUtils.handleAPISuccess(req, res, {value: outerUser})
    }
  )
};

function addLogin(userId, userIp, userAgent, reason, callback) {
  utils.async.waterfall([
    function (callback) {
      models.user.getById(userId, callback)
    },
    function(user, callback) {
      var login = {
        userIp: userIp,
        userAgent: userAgent,
        reason: reason
      }
      // user.logins.values.push(login)
      models.user.save(user, callback)
    }], callback)
}

function reqLoginWrapper(req, reason) {
  return function (user, callback) {
    utils.async.waterfall(
      [
        function (callback) {
          req.logIn(user, callback)
        },
        function(callback) {
          addLogin(user.id, req.adata.ip, req.adata.user_agent, reason, callback)
        }
      ],
      callback
    )
  }
}

function signup(req, res) {
  var errorResponse = {
    error: "Our signup has changed. Please update to the latest version to sign up."
  }
  routeUtils.handleAPIError(req, res, errorResponse, errorResponse)
}

function verifyAccount(req,res){
/*
  var token = req.param("token")
  var query = { $or: [ { "consoles.verifyToken":token }, { "verifyToken":token } ] }
  models.user.getUserByData(query,function(err, user){
    if(user){
      var primaryConsole = utils.primaryConsole(user)
      res.render("account/index",{
        token: token,
        consoleId: primaryConsole.consoleId,
        consoleType: utils._.get(utils.constants.consoleGenericsId, primaryConsole.consoleType),
        appName:utils.config.appName,
        userName:user.userName,
        verifyStatus: utils._.isValidNonBlank(user.verifyStatus) ? user.verifyStatus: user.consoles[0].verifyStatus
      })
    }else{
      res.render("account/error")
    }
  })
*/
  res.render("account/error")
}

/*function verifyConfirm(req,res){
  var token = req.param("token")
  var userObj = null
  utils.l.d("verifyAccount::token="+token)
  //req.assert('token', "Invalid verification link. Please click on the link sent to you or copy paste the link in a browser.").notEmpty()
  utils.async.waterfall([
    function(callback){
      var query = { $or: [ { "consoles.verifyToken":token }, { "verifyToken":token } ] }
      models.user.getUserByData(query,callback)
    },function(user, callback){
      utils.l.d("user="+user)
      if(user){
        userObj = user
        user.verifyStatus ="VERIFIED"
        utils._.map(user.consoles,function(console){
          //if(console.verifyToken == token)
          console.verifyStatus ="VERIFIED"
        })
        models.user.save(user,function(err, updatedUser) {
          if(err) {
            utils.l.s("There was an error in saving the user", err)
            return callback(err, null)
          } else {
            helpers.m.setOrUpdateUserVerifiedStatus(updatedUser)
            return callback(null, utils.config.accountVerificationSuccess)
          }
        })
      } else {
        return callback("Invalid verification link. Please click on the link sent to you or copy paste the link in a browser.", null)
      }
    }],
    function (err, successResp){
      if(err) routeUtils.handleAPIError(req,res,err,err)
      else {
        helpers.firebase.updateUser(userObj)
        helpers.m.trackRequest("AccountVerifyConfirm_SUCC", {"distinct_id":userObj._id}, req, userObj)
        res.render("account/verifyConfirm",{appName:utils.config.appName})
      }
    })
}

function verifyReject(req,res){
  var token = req.param("token")
  utils.l.d("verifyReject::token=" + token)
  //req.assert('token', "Invalid verification link. Please click on the link sent to you or copy paste the link in a browser.").notEmpty()
  var userObj = null
  utils.async.waterfall([
    function(callback) {
      var query = { $or: [ { "consoles.verifyToken":token }, { "verifyToken":token } ] }
      models.user.getUserByData(query,callback)
    },function(user, callback) {
      utils.l.d("user= " + user)
      if(user) {
        user.verifyStatus ="DELETED"
        handleInvalidUser(user,callback)
      } else {
        callback("Invalid verification link. Please click on the link sent to you or copy paste the link in a browser.", null)
      }
    }
  ],
    function (err, userDeleted) {
      if(err) routeUtils.handleAPIError(req, res, err, err)
      else {
        helpers.firebase.updateUser(userDeleted)
        res.writeHead(302, {'Location': 'http://w3.crossroadsapp.co/'})
        res.end()
      }
    }
  )
}

function handleInvalidUser(user,callback){
  utils.async.waterfall([
    function(callback){
      utils._.map(user.consoles,function(console){
        console.verifyStatus ="DELETED"
      })
      user.verifyStatus="DELETED"
      callback(null,user)
    },function(userToDelete, callback){
      service.eventService.clearCommentsByUser(user,callback)
    },function(eventsUpdated,callback){
      service.eventService.clearEventsForPlayer(user,null,null,callback)
    }
  ],function(err,data){
    if(err)
      utils.l.i("unable to clear events/comments for user",err)
    models.user.deleteUser(user, function(deleteUserErr,deletedUser){
      if(deleteUserErr)
        utils.l.i("Unable to delete user during verification.",deleteUserErr)
      return callback(null,user)
    })
  })
}
*/

function logout(req, res) {
  var user = req.user
  utils.async.waterfall([
    function(callback){
      user.isLoggedIn = false
      models.user.save(user,callback)
    },function(user,callback){
      //models.userGroup.updateUserGroup(user._id,{refreshGroups:true},callback)
      helpers.sns.unSubscribeUser(user,callback)
    }
  ],function(err,userGroup){
    if(err) {
      utils.l.d("failed to save ths user object: ", err)
    }

    req.logout()
    routeUtils.handleAPISuccess(req, res, {success: true})
  })
}

function getSignupMessage(user){
  var primaryConsole = utils.primaryConsole(user)
  if(primaryConsole.verifyStatus == "INITIATED")
    return "Thanks for signing up for "+utils.config.appName+", the Destiny Fireteam Finder mobile app! An account verification message has been sent to your bungie.net account. Click the link in the message to verify your "+utils._.get(utils.constants.consoleGenericsId, primaryConsole.consoleType)+"."
  else return "Thanks for signing up for "+utils.config.appName+", the Destiny Fireteam Finder mobile app!"
}

function requestResetPassword(req,res){
/*  var useGamerTag = false
  var userName = req.body.userName
  var consoleType = req.body.consoleType ? req.body.consoleType.toString().toUpperCase() : null
  var consoleId = req.body.consoleId ? req.body.consoleId.toString().trim() : null
  utils.async.waterfall([
      function (callback) {
        utils.l.d("requestResetPassword::userName="+userName+",consoleType="+consoleType+",consoleId="+consoleId)
        if(utils._.isValidNonBlank(consoleType)) {
          useGamerTag = true
/!*          models.user.getUserByData({
            consoles: {
              $elemMatch: {
                consoleType: consoleType,
                consoleId:{$regex : new RegExp(["^", consoleId, "$"].join("")), $options:"i"}
              }
            }
          }, callback)*!/
          models.user.getUserByConsole(consoleId,consoleType,null,callback)
        }
        else
          models.user.getUserByData({userName: userName.toLowerCase().trim()}, callback)
      },
      function(user,callback){
        if(user) {
          service.authService.requestResetPassword(user, callback)
        }else {
         if(useGamerTag) callback({error: "Please provide a valid "+ utils._.get(utils.constants.consoleGenericsId, consoleType)})
          else callback({error: "Please provide a valid Crossroads Username."})
        }
      }
    ],
    function (err, updatedUser) {
      if (err) {
        return routeUtils.handleAPIError(req, res, err,err)
      }else  if(updatedUser && utils._.isEmpty(updatedUser.passwordResetToken)){
        var error =  {error:"Unable to process password reset request. Please try again later."}
        return routeUtils.handleAPIError(req, res,error,error)
      }else{
        return routeUtils.handleAPISuccess(req, res, updatedUser)
      }
    }
  )*/

  var errorResponse = {
    error: "Our login system has changed. Please update to the latest version in the App Store to continue using Crossroads."
  }
  routeUtils.handleAPIError(req, res, errorResponse, errorResponse)
}

/*function resetPasswordLaunch(req,res){
  var token = req.param("token")
  models.user.getUserByData({passwordResetToken:token},function(err, user){
    if(user){
      res.render("account/resetPassword",{
        token: token,
        consoleId: utils.primaryConsole(user).consoleId,
        userName: user.userName,
        appName:utils.config.appName
      })
    }else{
      res.render("account/error")
    }
  })
}

function resetPassword(req,res){
  var userName = req.body.userName
  var token = req.param("token")
  try {
    req.assert('passWord').notEmpty().isAlphaNumeric()
  } catch(ex) {
    res.render("password must be between 1 and 9 characters and must be alphanumeric")
  }

  var newPassword = passwordHash.generate(req.body.passWord)
  console.log("resetPassword::userName"+userName+",token::"+token)
  utils.async.waterfall([
      function (callback) {
        models.user.getUserByData({passwordResetToken:token},callback)
      },
      function(user,callback){
        if(user) {
          user.passWord = newPassword
          user.verifyStatus ="VERIFIED"

          utils._.map(user.consoles,function(console){
            if(console.verifyStatus != "VERIFIED")
              console.verifyStatus ="VERIFIED"
          })
          models.user.save(user, callback)
        }else callback({error:"Invalid username. Please provide a valid username"})
      }
    ],
    function (err, updatedUser) {
      if (err) {
        req.routeErr = err
        return res.render("Unable to reset password at this time. Please try again later.."+err)
      }
      return res.render("account/resetPasswordConfirm",{appName:utils.config.appName})
    }
  )
}*/

function home(req,res){
  //res.render('home/index')
  res.writeHead(302, {'Location': 'http://w3.crossroadsapp.co/'})
  res.end()
}

function checkBungieAccount(req, res) {
/*
  utils.l.d("consoleId:: " + req.body.consoleId + ", consoleType:: " + req.body.consoleType)
  utils.l.d("checkBungieAccount", req.body)
  req.body.consoleId = utils._.isValidNonBlank(req.body.consoleId)?req.body.consoleId.trim():req.body.consoleId
  utils.async.waterfall([
    function(callback) {
      models.user.getByQuery({
        consoles: {
          $elemMatch: {
            consoleType: req.body.consoleType,
            consoleId: {$regex : new RegExp(["^", req.body.consoleId, "$"].join("")), $options:"i"}
          }
        }
      }, utils.firstInArrayCallback(callback))
    },
    function (user, callback) {
      if(utils._.isValidNonBlank(user)) {
        var errMsgTemplate = "The #CONSOLE_GENERICS# #CONSOLE_ID# is already taken"
        var error = {
          error: errMsgTemplate
            .replace("#CONSOLE_GENERICS#", utils._.get(utils.constants.consoleGenericsId, req.body.consoleType))
            .replace("#CONSOLE_ID#", req.body.consoleId)
        }
        return callback(error, null)
      }
      service.userService.checkBungieAccount(req.body, true, callback)
    }
  ],
    function(err, bungieMember) {
      if (err) {
        routeUtils.handleAPIError(req, res, err, err)
      } else {
        routeUtils.handleAPISuccess(req, res, bungieMember)
      }
    }
  )
*/
  var err = {error: "Our signup has changed. Please update to the latest version to sign up."}
  routeUtils.handleAPIError(req,res,err,err)
}

/** Routes */
routeUtils.rGetPost(router, '/login', 'Login', login, login)
routeUtils.rGetPost(router, '/bo/login', 'BOLogin', boLogin, boLogin)
routeUtils.rPost(router, '/register', 'Signup', signup)
routeUtils.rPost(router, '/logout', 'Logout', logout)
//routeUtils.rGet(router, '/verifyconfirm/:token', 'AccountVerification', verifyConfirm)
//routeUtils.rGet(router, '/verifyReject/:token', 'verifyReject', verifyReject)
routeUtils.rGet(router, '/verify/:token', 'AccountVerification', verifyAccount)
//routeUtils.rGet(router, '/resetPassword/:token', 'resetPasswordLaunch', resetPasswordLaunch, resetPasswordLaunch)
routeUtils.rPost(router, '/request/resetPassword', 'requestResetPassword', requestResetPassword, requestResetPassword)
//routeUtils.rPost(router, '/resetPassword/:token', 'resetPassword', resetPassword, resetPassword)
routeUtils.rGet(router,'/','homePage',home,home)
routeUtils.rPost(router, '/checkBungieAccount', 'checkBungieAccount', checkBungieAccount)
routeUtils.rPost(router, '/validateUserLogin', 'validateUserLogin', validateUserLogin)
module.exports = router

