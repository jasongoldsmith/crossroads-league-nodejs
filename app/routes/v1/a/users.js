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
      models.user.getUserByIdWithPassword(data.id, callback)
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
      models.user.getUserByIdWithPassword(user._id, callback)
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

// -------------------------------------------------------------------------------------------------
// New Code

function addConsole(req, res) {
  utils.l.d("addConsole request" + JSON.stringify(req.body))
  var body = req.body
  var err = {}

  if(!body.consoleId || !body.region) {
    err = {error: "One or more inputs is missing"}
    routeUtils.handleAPIError(req, res, err, err)
    return
  }

  if(req.user.consoles.length >= 1) {
    err = {error: "We do not support multiple summoner profiles yet."}
    routeUtils.handleAPIError(req, res, err, err)
    return
  }

  service.userService.addConsole(req.user, body.consoleId, body.region, function (err, user) {
    if (err) {
      routeUtils.handleAPIError(req, res, err, err)
    } else {
      routeUtils.handleAPISuccess(req, res, {value: user})
    }
  })
}

function changeUserCredentials(req, res) {
  utils.l.d("change user credentials request" + JSON.stringify(req.body))
  var body = req.body
  var err = {}

  if(!(body.oldEmail && body.newEmail) && !(body.oldPassWord && body.newPassWord)) {
    err = {error: "One or more inputs is missing"}
    routeUtils.handleAPIError(req, res, err, err)
    return
  }

  if(body.newEmail) {
    service.userService.changeEmail(req.user, body.oldEmail, body.newEmail, function (err, user) {
      if (err) {
        routeUtils.handleAPIError(req, res, err, err)
      } else {
        routeUtils.handleAPISuccess(req, res, {value: user})
      }
    })
  } else {
    service.userService.changePassword(req.user, body.oldPassWord, body.newPassWord, function (err, user) {
      if (err) {
        routeUtils.handleAPIError(req, res, err, err)
      } else {
        routeUtils.handleAPISuccess(req, res, {value: user})
      }
    })
  }
}

function refreshHelmet(req, res) {
  utils.l.d("refresh helmet request" + JSON.stringify(req.user))
  var user = req.user
  var err = {}

  if(utils._.isInvalidOrBlank(user.consoles)) {
    err = {error: "You have to link your summoner profile with Crossroads before trying to refresh your summoner icon"}
    routeUtils.handleAPIError(req, res, err, err)
    return
  }

  service.userService.refreshHelmet(user, function (err, user) {
    if (err) {
      routeUtils.handleAPIError(req, res, err, err)
    } else {
      routeUtils.handleAPISuccess(req, res,
        // Inorder to keep compatibility with destiny we use this format for response
        {
          status : "Success",
          helmetUrl : user.imageUrl,
          message : "Successfully updated helmet"
        })
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
routeUtils.rPost(router, '/changePrimaryConsole', 'changePrimaryConsole', changePrimaryConsole)
routeUtils.rGet(router, '/getMetrics', 'getUserMetrics', getUserMetrics)
routeUtils.rGet(router, '/getPendingEventInvites', 'getPendingEventInvites', getPendingEventInvites)

// -------------------------------------------------------------------------------------------------
// New Code

routeUtils.rPost(router, '/addConsole', 'addUserConsole', addConsole)
routeUtils.rPost(router, '/changeUserCredentials', 'changeUserCredentials', changeUserCredentials)
routeUtils.rGet(router, '/refreshHelmet', 'refreshHelmet', refreshHelmet)
module.exports = router
