#!/usr/bin/env node

var express = require('express')
var router = express.Router()
var jobs = require('./jobs')
var utils = require('./app/utils')
var helpers = require('./app/helpers')
var models = require('./app/models')
var schedule = require('node-schedule');

var hashPassword = "hashPassword"
var deleteOldFullEvents = "deleteOldFullEvents"
var deleteOldStaleEvents = "deleteOldStaleEvents"
var upcomingEventsReminder = "upcomingEventsReminder"
var eventFullReminder = "eventFullReminder"
var eventStartReminder = "eventStartReminder"
var dailyOneTimeReminder = "dailyOneTimeReminder"
var eventUpcomingReminder = "eventUpcomingReminder"

var destinyService = require('./app/service/destinyInterface')
var userService = require('./app/service/userService')
var authService = require('./app/service/authService')
var notifService = require('./app/service/eventNotificationService')
var activityService = require('./app/service/activityService')
var actService = require('./app/service/accountService')
var eventNotifTrigService = require('./app/service/eventNotificationTriggerService')
var fs = require('fs')

var command = process.argv[2]
var event ='{'+
  '"_id": "572ce86427efb203002ea3f6",'+
  '"status": "can_join",'+
  '"creator":'+
  '{ "_id": "572ce20e27efb203002ea3d9",'+
  '"date": "Fri May 06 2016 18:27:26 GMT+0000 (UTC)",'+
  '"uDate": "Fri May 06 2016 18:30:33 GMT+0000 (UTC)",'+
  '"userName": "unteins"'+
  '},'+
  '"eType":'+
  '{ "_id": "56c647568162210300101953",'+
  '"aType": "Raid"},'+
  '"maxPlayers": "6",'+
  '"updated": "Fri May 06 2016 19:13:11 GMT+0000 (UTC)",'+
  '"created": "Fri May 06 2016 18:54:28 GMT+0000 (UTC)",'+
  '"players":'+
  '[ { "_id": "572ce20e27efb203002ea3d9",'+
  '"date": "Fri May 06 2016 18:27:26 GMT+0000 (UTC)",'+
  '"uDate": "Fri May 06 2016 18:30:33 GMT+0000 (UTC)",'+
  '"userName": "unteins"'+
  '},'+
  '{ "_id": "572ce20e27efb20307745666",'+
  '"date": "Fri May 06 2016 18:27:26 GMT+0000 (UTC)",'+
  '"uDate": "Fri May 06 2016 18:30:33 GMT+0000 (UTC)",'+
  '"userName": "unteins"'+
  '}'+
  '],'+
  '"launchStatus": "now"'+
  '}'

var objArray = []
objArray.push({user:"abc","dateTime":"2016-06-09T22:37:49Z"})
objArray.push({user:"abc","dateTime":"2016-06-07T20:37:49Z"})
objArray.push({user:"abc","dateTime":"2016-06-09T20:37:49Z"})

var objArray1= []
objArray1.push({user:"def","dateTime":"2016-07-09T22:37:49Z"})
objArray1.push({user:"def","dateTime":"2016-07-07T20:37:49Z"})
objArray1.push({user:"def","dateTime":"2016-06-09T20:37:49Z"})

var obj = {
  usr1: {
    user: "abc",
    "dateTime": "2016-06-09T20:37:49Z",
  },
  usr2: {
    user: "def",
    "dateTime": "2016-06-09T20:37:49Z",
  },
  usr3: {
    user: "ghi",
    "dateTime": "2016-06-09T20:37:49Z",
  }
}


switch(command) {
  case "helmetTest":
    destinyService.getBungieHelmet("sreeharshadasa","PS4",function(err,helmetURL){
      utils.l.d("err:",err)
      utils.l.d("helmentURL",helmetURL)
    })
    break;
  case "messageTest":
    destinyService.sendBungieMessage("13315699","PS4",utils.constants.bungieMessageTypes.passwordReset,function(err,messageResponse){
      utils.l.d("err:",err)
      utils.l.d("messageResponse",messageResponse)
    })
    break;
  case "sortTest":
    var sortedArray = utils._.sortBy(objArray,function(item){
      return utils.moment(item.dateTime)
    })
    utils.l.d("sortedArray",sortedArray)
    break;
  case "mergeTest":
    var arrays = []
    arrays.push(objArray)
    arrays.push(objArray1)
    var mergedArray = utils._.flatMap(arrays)
    utils.l.d("mergedArray",mergedArray)
    var mergedSortedArray = utils._.sortBy(utils._.flatMap(arrays),function(item){
      return utils.moment(item.dateTime)
    })
    utils.l.d("mergedSortedArray",mergedSortedArray)
  case "valueTest":
    var mapVal = utils._.mapValues(obj,function(value){
      if(value.user == "def")
        return value.user
    })
    utils.l.d("mapVal"+JSON.stringify(mapVal))
    utils.l.d("mapVal",utils._.compact(utils._.values(mapVal)))
  case "characterTest":
    var charObj = require("/Users/dasasr/projects/traveler/bungie/characters.json");
    var characterId = "2305843009392124098"
    var membershipId = "4611686018460471566" //"4611686018460342882"
    // var destinyAcct = utils._.filter(charObj.Response.destinyAccounts.userInfo,{"membershipId":"4611686018446478621"})

    //var destinyAcct = utils._.find(charObj,{"Response.destinyAccounts.characters.characterId":characterId})
    /*    var destinyAcct = utils._.find(charObj, utils._.flow(
     utils._.property('Response.destinyAccounts'),
     utils._.partialRight(utils._.some, { "userInfo.membershipId": "4611686018446478621" })
     ));*/

    var characters = null
    utils._.map(charObj.Response.destinyAccounts, function(account){
      utils.l.d('account.userInfo.membershipId',account.userInfo.membershipId)
      if(account.userInfo.membershipId.toString() == membershipId.toString())
        characters= account.characters
    })

    //utils.l.d("destinyAcct",destinyAcct)
    //var characters = utils._.map(charObj.Response.destinyAccounts,"characters")
    var sortedChars = utils._.sortBy(utils._.flatMap(characters),function(character){
      return utils.moment(character.dateLastPlayed)
    })

    var lastCharacter = utils._.last(sortedChars)
    utils.l.d('lastCharacter',{characterId:lastCharacter.characterId,membershipId:lastCharacter.membershipId,membershipType:lastCharacter.membershipType})
    break;
  case "consoleTest":
    var userObj = require("/Users/dasasr/projects/traveler/tmp/user.json");
    var consoleObj = utils.primaryConsole(userObj).consoleType
    utils.l.d("primary console",consoleObj)
    utils.l.d("index of primary console",utils.primaryConsoleIndex(userObj))
    break;
  case "reduceTest":
    var userGroups = require("/Users/dasasr/projects/traveler/admin/prod/usergroups.json");
    var results = []
    var result = "userId,groupId\n"
    results.push(result)
    utils._.flatMap(userGroups,function(userGroup){
      var userId = userGroup._id.$oid
      utils._.map(userGroup.groups,function(group){
        result = null
        result = userId+","
        result = result + group.groupId +","+group.muteNotification+"\n"
        results.push(result)
      })
    })

    //console.log(userGroupFlat)
    fs.writeFileSync("/Users/dasasr/projects/traveler/admin/prod/usergroups.csv",results)
    break;
  case "momentTest":
    var estTime = utils.moment.tz(Date.now(), 'America/New_York').utc().format()
    console.log("estTime::"+estTime)
    break;
  case "messageFormat":
    var evt = require("/Users/dasasr/projects/traveler/tmp/event.json");
    var message = notifService.formatMessage("#PLAYERS_PREFIX_TXT##PLAYERS_COUNT_NEEDED##PLAYERS_NEEDED_TXT##EVENT_NAME#. If you are still interested, please tap to confirm.",evt,null,null)
    console.log("message::"+message)
    break
  case "activityData":
    var activities = require('/Users/dasasr/projects/traveler/admin/activities.json')
    var mods = require('/Users/dasasr/projects/traveler/admin/modifiers.json')
    //var tags = require('/Users/dasasr/projects/traveler/admin/tags.json')
    activityService.createActivities(activities,mods,function(err,data){
      utils.l.d("Completing activity creation")
    })
    break;
  case "pushTest" :
    var alert ="sreeharshadasa need(s) 2 more for King's Fall - Normal, Warpriest. View details…"
    var eventJSON = require("/Users/dasasr/projects/traveler/tmp/devdata/event.json")
    var installJSON = require("/Users/dasasr/projects/traveler/tmp/devdata/installation.json")
    var notifResp = require("/Users/dasasr/projects/traveler/tmp/devdata/notifResp.json")
    var count = 1
    /*
     while( count < 2000) {
     helpers.pushNotification.sendSinglePushNotification(eventJSON, alert, notifResp, null, installJSON)
     count++
     }
     */
    helpers.pushNotification.sendMultiplePushNotificationsForUsers(notifResp,eventJSON,null)
    break
  case "tagTest":
    var tags = require('/Users/dasasr/projects/traveler/admin/tags1.json')
    utils._.map(tags,function(tag){
      utils.l.d("tag",utils._.get(tag, "Tags/Name"))
    })
    break
  case "csvToJSON":
    var adCards = [
      {
        "aType" : "Crucible",
        "aSubType" : "Zone Control",
        "aCheckpoint" : "",
        "aDifficulty" : "",
        "tag" : ""
      },
      {
        "aType" : "Strike",
        "aSubType" : "Vanguard Nightfall",
        "aCheckpoint" : "The Shadow Thief",
        "aDifficulty" : "",
        "tag" : ""
      },
      {
        "aType" : "Raid",
        "aSubType" : "King's Fall",
        "aCheckpoint" : "Golgoroth",
        "aDifficulty" : "Hard",
        "tag" : ""
      },
      {
        "aType" : "Arena",
        "aSubType" : "Challenge of the Elders",
        "aCheckpoint" : "",
        "aDifficulty" : "",
        "tag" : ""
      }]
    activityService.createActivitiesWithConverter("/Users/dasasr/projects/traveler/admin/activities.csv",
      "",adCards,
      function(err,data){
        utils.l.d("Done with activities")
      })
    /*
     converter.fromFile("/Users/dasasr/projects/traveler/admin/modifiers.csv",function(err,result){
     mods = result
     utils.l.d("mods",mods)
     });
     */
    break;
  case "bulkVerify":
    actService.bulkMPUserStatusUpdaet('/Users/dasasr/projects/traveler/temp/mpusers_prod.csv',function(err,data){
      utils.l.d('bulkMPUserStatusUpdaet::err',err)
      utils.l.d('bulkMPUserStatusUpdaet::data',data)
    })
    break;
  case "testPlayers":
    models.event.getAllCurrentEventPlayers(function(err,playerIds){
      utils.l.d("playerIds",playerIds)
    })
  case 'valueTest':
    console.log('getting consoles')
    utils.l.d("consoles",utils._.values(utils.constants.newGenConsoleType))
    break;
  case 'snsRegisterTest':
    utils.async.waterfall([
      function(callback){
        models.user.getById('57b54662a3cfd5bc3f9bd9c8',callback)
      },function(user,callback){
        helpers.sns.registerDeviceToken(user,callback)
      }
    ],function(err,result){
      utils.l.d('err',err)
      utils.l.d('result',result)
    })
    //helpers.sns.sendPush()
    break
  case "search":
    var usersSearchList = ["sreeharshadasa","unteins"]
    var searchUser = 'Unteins1'
    utils.l.d('finding::'+searchUser,utils._.find(usersSearchList,function(userId){
      utils.l.d('userId::',userId)
      if(userId.trim().toLowerCase() == "Unteins1".trim().toLocaleLowerCase())
        return true
    }))
    break
  case 'snsPublishTest':
    /*    var customPayload = {
     //alert:"Custom Hello World for event from Harsha",
     eventId:"57c5afccfd06cd0300cf8477",
     notificationName:"eventCreateNotif",
     activityId:"57b7a79c923973ee953d87ec",
     eventName:"King's fall",
     eventClanId:"clan_id_not_set",
     eventClanName: 'Free Lance Lobby',
     eventClanImageUrl: 'http://www.amazon.com/test.jpg',
     eventConsole: 'PS4'
     }*/

    var customPayload = {
      "notificationName": "NoSignupNotification",
      "eventId": "5878582d821555f8a66ab143",
      "activityId": null,
      "eventUpdated": "2017-01-13T04:32:09.898Z",
      "eventName": "Classic Free-For-All",
      "eventClanId": "1570671",
      "eventClanName": "",
      "eventClanImageUrl": "",
      "eventConsole": "PS4",
      "messengerConsoleId": null,
      "messengerImageUrl": null,
      "isTrackable": true
    }

    var alert = "sreeharshadasa need(s) 2 more for Classic Free-For-All. View details…"

    helpers.sns.publishToSNSTopic('PS4','1570671',customPayload,alert,function(err,result){
      utils.l.d('err',err)
      utils.l.d('result',result)
    })
    break;
  case 'launchUpComingTest':
    utils.async.waterfall([
        function (callback) {
          models.notificationTrigger.getByQuery({
              type: 'schedule',
              triggerName: utils.constants.eventNotificationTrigger.launchUpcomingEvents,
              isActive: true
            },
            utils.firstInArrayCallback(callback))
        },
        function(notifTrigger, callback) {
          eventNotifTrigService.handleUpcomingEvents(notifTrigger)
        }
      ],
      function (err, events) {
        if (err) {
          utils.l.s("Error sending upcomingEventsReminder notification::" + JSON.stringify(err))
        } else {
          utils.l.i("upcomingEventsReminder was successful")
        }
      })
    break;
  case 'bulkHelmet':
    actService.bulkUpdateHelmet(function(err,data){
      utils.l.d('OUT OF STREAM')
    })
    break;
  case 'userGroupTest':
    models.userGroup.getUsersByGroup('1570656',false,'PS4',function(err,data){
      utils.l.d('users by group',data)
    })
    break;
  case "registerDeviceToken":
    utils.async.waterfall([
      function(callback){
        models.installation.getById("580a518683de74fc2612035a",callback)
      },function(installation,callback){
        helpers.sns.registerDeviceToken(null,installation,callback)
      }
    ],function(err,installationDB){
      utils.l.d("got installatio",installationDB)
    })
    break;
  case "listGroups":
    utils.async.waterfall([
      function(callback){
        models.user.getById("580a517f83de74fc26120357",callback)
      },function(user,callback){
        userService.listGroups(user,callback)
      }
    ],function(err,userGroupList){
      utils.l.d("got userGroups",userGroupList)
    })
    break;
  default:
    return;
}