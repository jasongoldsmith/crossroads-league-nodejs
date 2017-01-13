var LocalStrategy = require('passport-local').Strategy
var models = require('../models')
var passwordHash = require('password-hash')
var utils = require('../utils')
module.exports = function (passport, config) {
  // serialize sessions
  passport.serializeUser(function(user, callback) {
    return callback(null, user.id)
  })

  passport.deserializeUser(function(id, callback) {
    models.user.getById(id, function (err, user) {
      return callback(err, user)
    })
  })

  var local = new LocalStrategy({
      usernameField: 'userName',
      passwordField: 'passWord',
      passReqToCallback: true
    },
    function(req, userName, password, callback) {
      var body = req.body
      if(!body.consoles && !body.bungieMemberShipId) {
        models.user.getUserByData({userName:body.userName.toLowerCase().trim()}, function (err, user) {
          if(err) {
            utils.l.s("Database lookup for user failed", err)
            return callback({error: "Something went wrong. Please try again"}, null)
          } else if(!user) {
            utils.l.d("user not found")
            return callback({error: "The username and password do not match our records."}, null)
          } else if(!passwordHash.verify(password, user.passWord)) {
            return callback({error: "The username and password do not match our records."}, null)
          } else {
            user.passWord=undefined
            return callback(null, user)
          }
        })
      } else if(body.consoles) {
        var consoleId = body.consoles.consoleId
        utils.l.d("consoles: " + consoleId)
        models.user.getUserByConsole(consoleId, body.consoles.consoleType, null,
          function (err, user) {
            if (err) {
              utils.l.s("Database lookup for user failed", err)
              return callback({error: "Something went wrong. Please try again"}, null)
            } else if (!user) {
              return callback(null, null)
            } else if (!passwordHash.verify(password, user.passWord) && (user.verifyStatus != "INVITED" && user.verifyStatus != "INVITATION_MSG_FAILED" && user.verifyStatus != "INVALID_GAMERTAG")) {
              return callback({error: "The username and password do not match our records."}, null)
            } else {
              user.passWord = undefined
              return callback(null, user)
            }
          }
        )
      } else {
        utils.l.d("bungieMemberShipId: " , body.bungieMembership)
        utils.l.d("selectedConsole::",body.selectedConsole)
        models.user.getUserByConsole(body.selectedConsole.consoleId, body.selectedConsole.consoleType, body.bungieMemberShipId,
        function (err, user) {
          if (err) {
            utils.l.s("Database lookup for user failed", err)
            return callback({error: "Something went wrong. Please try again"}, null)
          } else if (!user) {
            return callback(null, null)
          } else {
            user.passWord = undefined
            return callback(null, user)
          }
        })
      }
    }
  )
  passport.use(local)
}