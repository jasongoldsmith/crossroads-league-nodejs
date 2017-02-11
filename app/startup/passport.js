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

      models.user.getUserByData({userName: body.userName.toLowerCase().trim()}, function (err, user) {
        if(err) {
          utils.l.s("Database lookup for user failed", err)
          return callback({error: "Something went wrong. Please try again"}, null)
        } else if(!user) {
          utils.l.d("user not found")
          return callback({error: "An account with that email address does not exist."}, null)
        } else if(!passwordHash.verify(password, user.passWord.trim())) {
          return callback({error: "The email and password do not match our records."}, null)
        } else {
          return callback(null, user)
        }
      })
    })
  passport.use(local)
}