var utils = require("../../../../utils")
var models = require("../../../../models")
var helpers = require('../../../../helpers')
var mongoose = require('mongoose')
var loginDataProvider = require('../../../data/utils/loginUtils')
var service = require('../../../../service')
var usersData = require('../../../data/users.json')

describe("Successful event test cases: ", function() {
  this.timeout(30000)
  var firstUserObj = null
  var secondUserObj = null
  var eventObj = null
  it("create a new event: ", function(done) {

    utils.async.waterfall([
      function loginFirstUser(callback) {
        //loginDataProvider.loginUser("sreeharshadasa", "PS4", null, callback)
        models.user.createUserFromData(usersData.sreeharshadasa,callback)
      },
      function createActivity(user, callback) {
        firstUserObj = user
        var data = {
          "aType": "Raid",
          "aSubType": "Crota's End",
          "aCheckpoint": "Fresh",
          "aDifficulty": "Normal",
          "aLight": 1,
          "minPlayers": 4,
          "maxPlayers": 6,
          "aIconUrl": "https://www.bungie.net/common/destiny_content/icons/b4f61245217ab76825ad1bb1a16a5cee.png",
          "aLevel": 30,
          "isAdCard": true,
          "aTypeDefault": false,
          "adCard": {
            "isAdCard": false
          },
          "isFeatured": false,
          "isActive": false,
          "aBonus": [],
          "aModifiers": []
        }
        models.activity.createActivity(data, callback)
      },
      function createEvent(activity, callback) {
        var data = {
          "eType": activity._id.toString(),
          "minPlayers": 1,
          "maxPlayers": 6
        }
        service.eventService.createEvent(firstUserObj, data, function(err, event) {
          if(err) {
            return callback(err, event)
          }
          eventObj = event
          validateSuccessfulEventCreate(event)
          return callback(null, event)
        })
      },
      function loginSecondUser(event, callback) {
       // loginDataProvider.loginUser("CrossroadsTina", "PS4", null, callback)
        models.user.createUserFromData(usersData.CrossroadsTina,callback)
      },
      function secondUserJoinsEvent(user, callback) {
        secondUserObj = user
        var data = {
          eId: eventObj._id
        }
        service.eventService.joinEvent(user, data, function(err, event) {
          if(err) {
            return callback(err, event)
          }
          validateSuccessfulEventJoin(event, user)
          return callback(null, user)
        })
      },
      function secondUserLeavesEvent(user, callback) {
        var data = {
          eId: eventObj._id
        }
        service.eventService.leaveEvent(user, data, function(err, event) {
          if(err) {
            return callback(err, event)
          }
          validateSuccessfulEventLeave(event, user)
          return callback(null, user)
        })
      }
    ],
      function (err, result) {
        done()
      })
  })

  after(function() {
    utils.l.d("Removing user", firstUserObj)
    models.user.model.remove({_id: {$in: [firstUserObj._id, secondUserObj. _id]}}, function(err, data) {})
    utils.l.d("Removing user:2222")
    models.userGroup.model.remove({"user": {$in: [firstUserObj._id, secondUserObj. _id]}}, function(err, data) {})
    utils.l.d("Removing user:3333")
    models.eventInvitation.model.remove({"inviter": {$in: [firstUserObj._id, secondUserObj. _id]}}, function(err, data) {})
    utils.l.d("Removing user:2222")
    models.eventInvitation.model.remove({"invitee": {$in: [firstUserObj._id, secondUserObj. _id]}}, function(err, data) {})
    models.event.model.remove({"players": {$in: [firstUserObj._id, secondUserObj. _id]}}, function(err, data) {})
  })
})

function validateSuccessfulEventCreate(event) {
  console.log("event2" + event)
  utils.assert.isDefined(event._id, "Event id not defined in event object")
  utils.assert.isDefined(event.creator, "Event creator not defined in event object")
  utils.assert.isArray(event.players, "Event players not defined in event object")
}

function validateSuccessfulEventJoin(event, player) {
  utils.assert.equal(utils.IsUserPartOfTheEvent(player, event), true, "Expected player to be part of event")
}

function validateSuccessfulEventLeave(event, player) {
  utils.assert.equal(utils.IsUserPartOfTheEvent(player, event), false, "Expected player to not be a part of event")
}