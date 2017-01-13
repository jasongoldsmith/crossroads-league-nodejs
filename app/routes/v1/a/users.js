var express = require('express')
var router = express.Router()
var routeUtils = require('./../../routeUtils')
var models = require('../../../models')
var utils = require('../../../utils')
var service = require('../../../service')
var passwordHash = require('password-hash')

function getSelfUser(req, res) {
  var feedData = {value: req.user}
  routeUtils.handleAPISuccess(req, res, feedData)
}

function listById(req, res) {
  utils.l.i("Get user by id request" + JSON.stringify(req.body))
  getUserById(req.body, function(err, user) {
    if (err) {
      routeUtils.handleAPIError(req, res, err, err)
    } else {
      routeUtils.handleAPISuccess(req, res,  {value: user})
    }
  })
}

function list(req, res) {
  utils.l.i("User list request")
  var username = req.param("userName")
  var consoleId = req.param("consoleId")
  utils.l.i("User list request", "username: " + username + " consoleId: " + consoleId)
  listUsers(username, consoleId, function(err, users) {
    if (err) {
      routeUtils.handleAPIError(req, res, err, err)
    } else {
      routeUtils.handleAPISuccess(req, res, users)
    }
  })
}

function update(req, res) {
  utils.l.i("Update user request" + JSON.stringify(req.body))
  updateUser(req.body, function(err, user) {
    if (err) {
      routeUtils.handleAPIError(req, res, err, err)
    } else {
      routeUtils.handleAPISuccess(req, res, user)
    }
  })
}

function updateGroup(req, res) {
  utils.l.i("Update user group request" + JSON.stringify(req.body))

  if(!req.body.id || !req.body.clanId) {
    var err = {
      error: "Id and ClanId are required fields"
    }
    routeUtils.handleAPIError(req, res, err, err)
  }else {
    service.userService.updateUserGroup(req.body, function (err, user) {
      if (err) {
        routeUtils.handleAPIError(req, res, err, err)
      } else {
        routeUtils.handleAPISuccess(req, res, {value: user})
      }
    })
  }
}

function updatePassword(req, res) {
  utils.l.i("Update user password request" + JSON.stringify(req.body))

  if(!req.body.id || !req.body.oldPassWord || !req.body.newPassWord) {
    var err = {
      error: "id, old password and new password are required fields"
    }
    routeUtils.handleAPIError(req, res, err, err)
  } else {

    try {
      req.assert('newPassWord').notEmpty().isAlphaNumeric()
    } catch(ex) {
      var err = {
        error: "password must be between 1 and 9 characters and must be alphanumeric"
      }
      return routeUtils.handleAPIError(req, res, err, err)
    }

    updateUserPassword(req.body, function (err, user) {
      if (err) {
        routeUtils.handleAPIError(req, res, err, err)
      } else {
        routeUtils.handleAPISuccess(req, res, user)
      }
    })
  }
}

function updateReviewPromptCardStatus(req, res) {
  utils.l.d("Update user review prompt card status request" + JSON.stringify(req.body))
  if(!req.body.reviewPromptCardStatus) {
    var err = {
      error: "reviewPromptCardStatus is a required field"
    }
    routeUtils.handleAPIError(req, res, err, err)
  } else {
    service.userService.updateReviewPromptCardStatus(req.user, req.body, function (err, user) {
      if (err) {
        routeUtils.handleAPIError(req, res, err, err)
      } else {
        routeUtils.handleAPISuccess(req, res, user)
      }
    })
  }
}

function getUserMetrics(req, res) {
  utils.l.i("Get user metrics request")
  models.user.getUserMetrics(function(err, metrics) {
    if(err) {
      routeUtils.handleAPIError(req, res, err, err)
    } else {
      routeUtils.handleAPISuccess(req, res, metrics)
    }
  })
}

function addConsole(req, res) {
  var newConsoleType = req.body.consoleType ? req.body.consoleType.toString().toUpperCase() : null

  if(!newConsoleType) {
    var err = {error: "new console type is needed"}
    routeUtils.handleAPIError(req, res, err, err)
  } else if(utils._.isValidNonBlank(utils.getUserConsoleObject(req.user, newConsoleType))) {
    var err = {error: "You already own this console"}
    routeUtils.handleAPIError(req, res, err, err)
  } else if((newConsoleType == 'PS3' && utils._.isValidNonBlank(utils.getUserConsoleObject(req.user, "PS4")))
  || (newConsoleType == 'XBOX360' && utils._.isValidNonBlank(utils.getUserConsoleObject(req.user, "XBOXONE")))) {
    var err = {error: "You cannot downgrade your console"}
    routeUtils.handleAPIError(req, res, err, err)
  } else if(newConsoleType == 'PS4' && utils._.isValidNonBlank(utils.getUserConsoleObject(req.user, "PS3"))) {
    service.userService.upgradeConsole(req.user, "PS3", newConsoleType, function (err, user) {
      if (err) {
        routeUtils.handleAPIError(req, res, err, err)
      } else {
        routeUtils.handleAPISuccess(req, res, {value:user})
      }
    })
  } else if(newConsoleType == 'XBOXONE' && utils._.isValidNonBlank(utils.getUserConsoleObject(req.user, "XBOX360"))) {
    service.userService.upgradeConsole(req.user, "XBOX360", newConsoleType, function (err, user) {
      if (err) {
        routeUtils.handleAPIError(req, res, err, err)
      } else {
        routeUtils.handleAPISuccess(req, res, {value:user})
      }
    })
  } else {
    if(utils._.isInvalidOrBlank(req.body.consoleId)) {
      var err = {error: "Please enter a gamertag to add a new console."}
      routeUtils.handleAPIError(req, res, err, err)
    } else {
      service.userService.addConsole(req.user, req.body, function (err, user) {
        if (err) {
          routeUtils.handleAPIError(req, res, err, err)
        } else {
          routeUtils.handleAPISuccess(req, res, {value:user})
        }
      })
    }
  }
}

function changePrimaryConsole(req, res) {
  if(!req.body.consoleType) {
    var err = {error: "console type is needed"}
    routeUtils.handleAPIError(req, res, err, err)
  } else {
    service.userService.changePrimaryConsole(req.user, req.body.consoleType.toString().toUpperCase(), function (err, user) {
      if (err) {
        routeUtils.handleAPIError(req, res, err, err)
      } else {
        routeUtils.handleAPISuccess(req, res, {value:user})
      }
    })
  }
}

function getUserById(data, callback) {
  utils.async.waterfall([
    function(callback){
      models.user.getUserById(data, callback)
    },function(user, callback){
      service.authService.addLegalAttributes(user,callback)
    }
  ],callback)
}

function listUsers(username, consoleId, callback) {
  models.user.listUsers(username, consoleId, callback)
}

function updateUser(data, callback) {
  models.user.updateUser(data, false, callback)
}

function updateUserPassword(data, callback) {
  utils.async.waterfall([
    function(callback) {
      getUserById(data, callback)
    },
    function(user, callback) {

      if (!passwordHash.verify(data.oldPassWord, user.passWord)) {
        return callback({error: "old password entered does not match the password in our records"}, null)
      }

      if (data.oldPassWord == data.newPassWord) {
        return callback({error: "new password has to be different from the old password"}, null)
      }

      data.passWord = data.newPassWord
      updateUser(data, callback)
    }
  ], callback)
}

function acceptLegal(req,res){
  handleAcceptLegal(req.user, function(err, user) {
    if (err) {
      routeUtils.handleAPIError(req, res, err, err)
    } else {
      var userResp = service.userService.setLegalAttributes(user)
      routeUtils.handleAPISuccess(req, res,  {value: userResp})
    }
  })
}

function handleAcceptLegal(user, callback){
  utils.async.waterfall([
    function(callback){
      models.user.getUserById({id:user._id}, callback)
    },function(user, callback){
      models.sysConfig.getSysConfigList([utils.constants.sysConfigKeys.termsVersion,utils.constants.sysConfigKeys.privacyPolicyVersion],callback)
    },function(sysConfigs, callback){
      var termsVersionObj =  utils._.find(sysConfigs, {"key": utils.constants.sysConfigKeys.termsVersion})
      var privacyObj = utils._.find(sysConfigs, {"key": utils.constants.sysConfigKeys.privacyPolicyVersion})

      updateUser({id:user._id,legal:{termsVersion:termsVersionObj.value.toString(),privacyVersion:privacyObj.value.toString()}},callback)
    }
  ],callback)
}

function getPendingEventInvites(req, res) {
  service.userService.getPendingEventInvites(req.user, function (err, pendingEventInvites) {
    if (err) {
      routeUtils.handleAPIError(req, res, err, err)
    } else {
      routeUtils.handleAPISuccess(req, res, pendingEventInvites)
    }
  })
}

routeUtils.rGet(router, '/self', 'GetSelfUser', getSelfUser)
routeUtils.rGet(router, '/list', 'list', list)
routeUtils.rPost(router, '/listById', 'listById', listById)
routeUtils.rPost(router, '/update', 'update', update)
routeUtils.rPost(router, '/updateGroup', 'updateGroup', updateGroup)
routeUtils.rPost(router, '/acceptLegal', 'acceptLegal', acceptLegal)
routeUtils.rPost(router, '/updatePassword', 'updatePassword', updatePassword)
routeUtils.rPost(router, '/updateReviewPromptCardStatus', 'updateReviewPromptCardStatus', updateReviewPromptCardStatus)
routeUtils.rPost(router, '/addConsole', 'addUserConsole', addConsole)
routeUtils.rPost(router, '/changePrimaryConsole', 'changePrimaryConsole', changePrimaryConsole)
routeUtils.rGet(router, '/getMetrics', 'getUserMetrics', getUserMetrics)
routeUtils.rGet(router, '/getPendingEventInvites', 'getPendingEventInvites', getPendingEventInvites)
module.exports = router
