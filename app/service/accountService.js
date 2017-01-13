var utils = require('../utils')
var models = require('../models')
var helpers = require('../helpers')
var destinyInerface = require('./destinyInterface')
var userService =  require('./userService')
var Converter = require("csvtojson").Converter;

function handlUpdateHelmet(user, callback) {
  var newHelmetURL = null
  utils.async.waterfall([
    function(callback){
      var primaryConsole = utils.primaryConsole(user)
      destinyInerface.getBungieHelmet(primaryConsole.consoleId,primaryConsole.consoleType,primaryConsole.destinyMembershipId,callback)
    },function(helmet, callback){
      var primaryConsoleIndex = utils.primaryConsoleIndex(user)
      newHelmetURL = helmet.helmetURL
      user.consoles[primaryConsoleIndex].clanTag = helmet.clanTag
      user.consoles[primaryConsoleIndex].imageUrl = utils.config.bungieBaseURL + newHelmetURL
      user.consoles[primaryConsoleIndex].destinyMembershipId = helmet.destinyProfile.memberShipId
      models.user.updateUser({id:user._id,imageUrl:utils.config.bungieBaseURL+newHelmetURL,consoles:user.consoles},false,callback)
    }
  ],function(err, userUpdated){
    if(!err && newHelmetURL)
      return callback(null,
        {
          status:"Success",
          helmetUrl: utils.config.bungieBaseURL + newHelmetURL,
          message: "Successfully updated helmet"
        })
    else {
      models.helmetTracker.createUser(user,err,callback)
      return callback({error: "We were unable to update your helmet. Please try again later."}, null)
    }
  })
}

function refreshHelmentAndConsoles(user,callback){
  var consoleReq = utils.primaryConsole(user)
  utils.async.waterfall([
    function(callback) {
      userService.checkBungieAccount(consoleReq, true, callback)
    },
    function(bungieResponse, callback) {
      userService.refreshConsoles(user, bungieResponse, consoleReq, callback)
    }
  ], callback)
}

function bulkUpdateHelmet(page, limit) {
  utils.async.waterfall([
    function(callback) {
      models.user.findUsersPaginated({"consoles.verifyStatus" : "VERIFIED"} ,page ,limit, callback)
    },
    function(userList, callback) {
      utils._.map(userList, function(user) {
        handlUpdateHelmet(user, callback)
      })
    }
  ],
    function(err ,data) {
      utils.l.d('Completed processing page::' + page)
  })

/*
  userStream.on('data', function (doc) {
    utils.l.d('################# got user',doc._id)
    handlUpdateHelmet(doc,function(err,data){
      utils.l.d('&&&&& COMPLETED HELMET UPDATE &&&&')
    })
  }).on('error', function (err) {
    utils.l.d('error getting user',err)
  }).on('close', function () {
    utils.l.d('Completed processing data')
    return callback(null,null)
  });
*/
}

function bulkMPUserStatusUpdaet(userCSVPath,callback){
  utils.async.waterfall([
    function(callback){
      var converter = new Converter({});
      converter.fromFile(userCSVPath,function(err,result){
        return callback(null,result)
      });
    },function(mpUsers,callback){
      utils.async.eachLimit(mpUsers,4,function(user,asyncCallback){
        if(user.properties.verifyStatus != 'INITIATED' && user.properties.verifyStatus != 'VERIFIED' && user.properties.verifyStatus != 'NOT_INITIATED' && user.properties.verifyStatus != 'INVITED') {
          //utils.l.d('Looking for::user::',user.distinct_id)
          utils.l.d('processing mp user::'+user.distinct_id+'::verifyStatus::', user.properties.verifyStatus)
          updateMPUserStatus(user, asyncCallback)
        }else{
          return asyncCallback(null,user)
        }
      },function(errors,results){
        utils.l.d("Errors updating mixpanel users status",errors)
        utils.l.d("Completed mixpanel user status update",results)
      })
    }
  ],callback)
}

function updateMPUserStatus(mpUser,callback){
    utils.async.waterfall([
      function (callback) {
        models.user.getById(mpUser.distinct_id, callback)
      }, function (user, callback) {
        if (utils._.isValidNonBlank(user)) {
          utils.l.d('updating mp user::',user._id)
          helpers.m.setOrUpdateUserVerifiedStatusFromConsole(user)
        }
        return callback(null, user)
      }
    ], callback)

}

module.exports = {
  handlUpdateHelmet: handlUpdateHelmet,
  bulkUpdateHelmet:bulkUpdateHelmet,
  refreshHelmentAndConsoles: refreshHelmentAndConsoles,
  bulkMPUserStatusUpdaet:bulkMPUserStatusUpdaet
}