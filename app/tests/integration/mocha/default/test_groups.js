var utils = require("../../../../utils")
var models = require("../../../../models")
var helpers = require('../../../../helpers')
var service = require('../../../../service')
var mongoose = require('mongoose')
var groupsData = require('../../../data/groups.json')
var usersData = require('../../../data/users.json')
describe("Successful installation object create test cases: ", function() {
  this.timeout(300000)
  describe("test groups: ", function() {
    it("Set Group stats,create topic and subscribe users to that topic: ", function (done) {
      utils.l.d("BEGINING:Create a new installation object::")
      var group = null
      var user = null
      var installation = null
      utils.async.waterfall([
        function (callback) {
          models.user.createUserFromData(usersData.tinacplays, callback)
        }, function (userDB, callback) {
          user = userDB
          service.installationService.updateInstallation("apn", "c56d4bd5434f73b4d9decd313f7a0daafffd809b8318eafcabcca7f62156f37c", user, callback)
        }, function (installationDB, callback) {
          installation = installationDB
          var groupsList = []
          groupsList.push(groupsData["112233"])
          service.userService.refreshGroups(user, null, groupsList, callback)
        }, function (data, callback) {
          utils.l.d("testcase::got groups after refresh", data)
          models.groups.findGroupById("112233", callback)
        }, function (groupDB, callback) {
          group = groupDB
          utils.l.d("about to update groupstats")
          utils.config.minUsersForGroupNotification = 1
          service.userService.updateGroupStats(group, callback)
        }, function (groupStats, callback) {
          utils.l.d("about to subscribe notifications")
          service.userService.subscribeUserNotifications(user, false, callback)
        }, function (subscription, callback) {
          utils.l.d("Starting cleanup")
          cleanupData(user, installation, group, callback)
        }
      ], function (err, data) {
        utils.l.d("END:Create a new installation object::")
        done();
      })
    })
  })
/*
    it("Set Group stats,create topic and subscribe users to that topic: ", function (done) {
      utils.l.d("BEGINING:Create a new installation object::")
      var group = null
      var user = null
      var installation = null
      utils.async.waterfall([
        function(callback){
          models.user.createUserFromData(usersData.tinacplays,callback)
        },function (userDB,callback) {
          user = userDB
          service.installationService.updateInstallation("apn", "c56d4bd5434f73b4d9decd313f7a0daafffd809b8318eafcabcca7f62156f37c", user, callback)
        },function(installationDB,callback){
          installation=installationDB
          service.userService.listGroups(user,callback)
        },function(groupsList,callback){
          validteUserGroupList(groupsList)
          utils.l.d("Starting cleanup")
          cleanupData(user,installation,group, callback)
        }
      ], function (err, data) {
        utils.l.d("END:Create a new installation object::")
        done();
      })
    })
  })
*/

  after(function() {
  })
})

function validateUserObject(data) {
  utils.assert.isDefined(data.clanId, "clanId property not defined in user response object")
  utils.assert.isDefined(data.imageUrl, "imageUrl property not defined in user response object")
  utils.assert.isDefined(data.date, "date property not defined in user response object")
  utils.assert.isDefined(data.uDate, "uDate property not defined in user response object")
  utils.assert.isDefined(data.clanId, "clanId property not defined in user response object")
  utils.assert.isDefined(data.bungieMemberShipId, "bungieMemberShipId property not defined in user response object")
}

function validateInstallation(installation){
  utils.assert.isDefined(installation.deviceSubscription, "deviceSubscription is not defined in installation")
  utils.assert.isDefined(installation.deviceSubscription.deviceEndpointArn, "device end point is not defined in installation")
  utils.assert.isDefined(installation.deviceSubscription, "device not subscribed to all users topic")
}

function cleanupData(user,installation,group,callback){
  utils.async.waterfall([
    function(callback){
      helpers.sns.unRegisterDeviceToken(user,installation,callback)
    },function(result,callback){
      helpers.sns.unSubscribeGroup(group._id,callback)
    },function(result, callback){
      models.user.model.remove({_id:user._id},function(err,data){})
      models.installation.model.remove({user:user._id},function(err,data){})
      models.userGroup.model.remove({"user" : user._id},function(err,data){})
      models.groups.model.remove({"_id" : "112233"},function(err,data){})
      callback(null,null)
    }
  ],callback)
}