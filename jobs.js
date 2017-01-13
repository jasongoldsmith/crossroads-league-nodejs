// external dependencies
var express = require('express')
var config = require("config")
var fs = require('fs')
var passwordHash = require('password-hash')
var moment = require('moment')
var temporal = require('temporal')
var request = require('request')

// internal dependencies
var routeUtils = require('./app/routes/routeUtils')
var utils = require('./app/utils/index')
var tUtils = require ('./app/tests/utils/index')
var models = require('./app/models/index')
var helpers = require('./app/helpers')
var service = require ('./app/service')
require('./app/startup/db')
var mongoose = require('mongoose')

function updatePassWord() {
  utils.async.waterfall(
    [
      function(callback) {
        models.user.getAll(callback)
      },
      function(users, callback) {
        utils.async.map(users, function(user, callback){
            if(!passwordHash.isHashed(user.passWord)) {
              user.passWord = passwordHash.generate(user.passWord)
              models.user.save(user, callback)
            }else {
              callback(null, user)
            }
        }, callback)
      }
    ],
    function(err, users) {
      utils.l.i("ADMIN : all passwords hashed All  done, exec users=", users)
      process.exit(0)
    }
  )
}

function deleteOldFullEvents() {
  var stopTime = moment().add(9, 'minutes')
  var minsToSleep = 1
  deleteOldFullEventsHandler()
  temporal.loop(minsToSleep * 60 * 1000, function() {
    deleteOldFullEventsHandler()
    if(moment() > stopTime) {
      utils.l.i("deleteOldFullEvents was successful")
      this.stop()
    }
  })
}


function deleteOldFullEventsHandler() {
  utils.async.waterfall([
    function(callback) {
      models.sysConfig.getSysConfig(utils.constants.sysConfigKeys.deleteFullEventsTimeOutInMins, function (err, result) {
        if(err || utils._.isInvalidOrBlank(result) || utils._.isInvalidOrBlank(result.value)) {
          utils.l.i("There was an error in fetching the deleteFullEventsTimeOutInMins from db", err)
          return callback(null, 10)
        } else {
          utils.l.d("Found deleteFullEventsTimeOutInMins in db", result.value)
          return callback(null, result.value)
        }
      })
    },
    function (deleteFullEventsTimeOutInMins, callback) {
      // We need to clear full events 10 minutes after being full https://trello.com/c/ZSu0RENR
      var date = moment().subtract(deleteFullEventsTimeOutInMins, 'minutes')
      models.event.getByQuery({ status: "full", launchStatus:"now", updated: {$lt: date}}, null, callback)
    },
    function (events, callback) {
      utils._.forEach(events, function(event) {
        utils.l.d("job archiving event: ", event)
        models.archiveEvent.createArchiveEvent(event, callback)
        utils.l.d("job removing event: ", event)
        event.remove(function (err, deletedEvent) {
          if(err) {
            utils.l.s("There was an issue in deleting this event", err)
            return callback(err, null)
          } else {
            helpers.firebase.createEventV2(event, null, true)
            return callback(null, deletedEvent)
          }
        })
      })
    }
  ],
  function (err, event) {
    if (err) {
      utils.l.s("job unable to remove event due to: ", err)
    } else {
      utils.l.d("job removed events succesfully")
    }
  })
}

function deleteOldStaleEvents() {
  utils.async.waterfall([
      function (callback) {
        models.event.getByQuery({ launchStatus: "now"}, null, callback)
      },
      function(events, callback) {
        var currentTime = new Date(moment.tz(Date.now(), 'America/Los_Angeles').format())
        utils._.forEach(events, function(event) {
          var launchDate = new Date(moment.tz(event.launchDate, 'America/Los_Angeles').format())
          if(utils.format.compareDates(currentTime, launchDate) > 0) {
            utils.l.d("job archiving event: ", event)
            models.archiveEvent.createArchiveEvent(event, callback)
            utils.l.d("job removing event: ", event)
            event.remove(function (err, deletedEvent) {
              if(err) {
                utils.l.s("There was an issue in deleting this event", err)
                return callback(err, null)
              } else {
                helpers.firebase.createEventV2(event, null, true)
                return callback(null, deletedEvent)
              }
            })
          }
        })
      }
    ],
    function (err, event) {
      if (err) {
        utils.l.i("job unable to remove event due to: ", err)
      } else {
        utils.l.i("job removed events succesfully")
      }
    })
}

function upcomingEventsReminder() {
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
        if(!notifTrigger) {
          return callback({error: "Trigger for upcomingEventsReminder not found or is not active"}, null)
        }
        var stopTime = moment().add(9, 'minutes')
        var minsToSleep = 1

        service.eventNotificationTriggerService.handleUpcomingEvents(notifTrigger)
        temporal.loop(minsToSleep * 60 * 1000, function() {
          service.eventNotificationTriggerService.handleUpcomingEvents(notifTrigger)
          if(moment() > stopTime) {
            this.stop()
            return callback(null, null)
          }
        })

        // If temporal is too CPU intensive we can use this logic
        /*
        service.eventNotificationTriggerService.handleUpcomingEvents(notifTrigger)
        callHandleUpcomingEvents(notifTrigger, stopTime, callback)
        */
      }
    ],
    function (err, events) {
      if (err) {
        utils.l.s("Error sending upcomingEventsReminder notification::" + JSON.stringify(err))
      } else {
        utils.l.i("upcomingEventsReminder was successful")
      }
    })
}

/*
function callHandleUpcomingEvents(notifTrigger,stopTime, callback) {
  setTimeout(function() {
    service.eventNotificationTriggerService.handleUpcomingEvents(notifTrigger)
      if(moment() < stopTime) {
        callHandleUpcomingEvents(notifTrigger, stopTime, callback)
      } else {
        return callback(null, null)
      }
  }, 60000)
}
*/

function eventFullReminder() {
  utils.async.waterfall([
      function (callback) {
        models.notificationTrigger.getByQuery({
            type: 'schedule',
            triggerName: utils.constants.eventNotificationTrigger.launchEventStart,
            isActive: true
          },
          utils.firstInArrayCallback(callback))
      },
      function(notifTrigger, callback) {
        if(!notifTrigger) {
          return callback({error: "Trigger for eventFullReminder not found or is not active"}, null)
        }
        var stopTime = moment().add(8, 'minutes')
        var minsToSleep = 2

        service.eventNotificationTriggerService.launchEventStart(notifTrigger)
        temporal.loop(minsToSleep * 60 * 1000, function() {
          service.eventNotificationTriggerService.launchEventStart(notifTrigger)
          if(moment() > stopTime) {
            this.stop()
            return callback(null, null)
          }
        })
      }
    ],
    function (err, events) {
      if (err) {
        utils.l.s("Error sending eventFullReminder notification::" + JSON.stringify(err) )
      } else {
        utils.l.i("eventFullReminder was successful")
      }
    })
}

function eventStartReminder() {
  utils.async.waterfall([
      function (callback) {
        models.notificationTrigger.getByQuery({
            type: 'schedule',
            triggerName: utils.constants.eventNotificationTrigger.eventStartReminder,
            isActive: true
          },
          utils.firstInArrayCallback(callback))
      },
      function(notifTrigger, callback) {
        if(!notifTrigger) {
          return callback({error: "Trigger for eventStartReminder not found or is not active"}, null)
        }
        var stopTime = moment().add(8, 'minutes')
        var minsToSleep = 2

        service.eventNotificationTriggerService.eventStartReminder(notifTrigger)
        temporal.loop(minsToSleep * 60 * 1000, function() {
          service.eventNotificationTriggerService.eventStartReminder(notifTrigger)
          if(moment() > stopTime) {
            this.stop()
            return callback(null, null)
          }
        })
      }
    ],
    function (err, events) {
      if (err) {
        utils.l.s("Error sending eventStartReminder notification::" + JSON.stringify(err) )
      } else {
        utils.l.i("eventStartReminder was successful")
      }
    })
}

function eventExpiry() {
  var sysConfigObj = null
  utils.async.waterfall([
      function(callback){
        models.sysConfig.getSysConfig(utils.constants.sysConfigKeys.eventExpiryTimeInMins,callback)
      },
      function (sysConfig,callback) {
        sysConfigObj = sysConfig
        models.notificationTrigger.getByQuery({
            type: 'schedule',
            triggerName: utils.constants.eventNotificationTrigger.eventExpiry,
            isActive: true
          },
          utils.firstInArrayCallback(callback))
      },
      function(notifTrigger, callback) {
        if(!notifTrigger) {
          return callback({error: "Trigger for eventExpiry not found or is not active"}, null)
        }
        var stopTime = moment().add(8, 'minutes')
        var minsToSleep = 2

        service.eventService.expireEvents(notifTrigger,sysConfigObj)
        temporal.loop(minsToSleep * 60 * 1000, function() {
          service.eventService.expireEvents(notifTrigger,sysConfigObj)
          if(moment() > stopTime) {
            this.stop()
            return callback(null, null)
          }
        })
      }
    ],
    function (err, events) {
      if (err) {
        utils.l.s("Error sending eventExpiry notification::" + JSON.stringify(err))
      } else {
        utils.l.i("eventExpiry was successful")
      }
    })
}

function userTimeout() {
  var sysConfigObj = null;
  utils.async.waterfall([
      function(callback){
        models.sysConfig.getSysConfig(utils.constants.sysConfigKeys.userTimeoutInMins,callback)
      },
      function (sysConfig,callback) {
        sysConfigObj = sysConfig
        models.notificationTrigger.getByQuery({
            type: 'schedule',
            triggerName: utils.constants.eventNotificationTrigger.userTimeout,
            isActive: true
          },
          utils.firstInArrayCallback(callback))
      },
      function(notifTrigger, callback) {
        if(!notifTrigger) {
          return callback({error: "Trigger for userTimeout not found or is not active"}, null)
        }
        var stopTime = moment().add(8, 'minutes')
        var minsToSleep = 2

        service.userService.userTimeout(notifTrigger,sysConfigObj)
        temporal.loop(minsToSleep * 60 * 1000, function() {
          service.userService.userTimeout(notifTrigger,sysConfigObj)
          if(moment() > stopTime) {
            this.stop()
            return callback(null, null)
          }
        })
      }
    ],
    function (err, events) {
      if (err) {
        utils.l.s("Error sending userTimeout notification::" + JSON.stringify(err))
      } else {
        utils.l.i("userTimeout was successful")
      }
    })
}

function preUserTimeout() {
  var sysConfigObj = null;
  utils.async.waterfall([
      function(callback){
        models.sysConfig.getSysConfigList([utils.constants.sysConfigKeys.userTimeoutInMins,
          utils.constants.sysConfigKeys.preUserTimeoutInMins],callback)
      },
      function (sysConfig,callback) {
        sysConfigObj = sysConfig
        models.notificationTrigger.getByQuery({
            type: 'schedule',
            triggerName: utils.constants.eventNotificationTrigger.preUserTimeout,
            isActive: true
          },
          utils.firstInArrayCallback(callback))
      },
      function(notifTrigger, callback) {
        if(!notifTrigger) {
          return callback({error: "Trigger for preUserTimeout not found or is not active"}, null)
        }
        var stopTime = moment().add(8, 'minutes')
        var minsToSleep = 2

        service.userService.preUserTimeout(notifTrigger,sysConfigObj)
        temporal.loop(minsToSleep * 60 * 1000, function() {
          service.userService.preUserTimeout(notifTrigger,sysConfigObj)
          if(moment() > stopTime) {
            this.stop()
            return callback(null, null)
          }
        })
      }
    ],
    function (err, events) {
      if (err) {
        utils.l.s("Error sending preUserTimeout notification::" + JSON.stringify(err))
      } else {
        utils.l.i("preUserTimeout was successful")
      }
    })
}

function dailyOneTimeReminder() {
  utils.async.waterfall([
    function (callback) {
      models.notificationTrigger.getByQuery({
        type: 'schedule',
        triggerName: utils.constants.eventNotificationTrigger.dailyOneTimeReminder,
        isActive: true
      },
        utils.firstInArrayCallback(callback))
    },
    function(notifTrigger, callback) {
      if(!notifTrigger) {
        return callback({error: "Trigger for dailyOneTimeReminder not found or is not active"}, null)
      }
      service.eventNotificationTriggerService.dailyOneTimeReminder(notifTrigger, callback)
    }
  ],
    function (err, events) {
      if (err) {
        utils.l.s("Error sending dailyOneTimeReminder notification::" + JSON.stringify(err))
      } else {
        utils.l.i("job completed dailyOneTimeReminder successfully")
      }
    })
}

function eventUpcomingReminder() {
  utils.async.waterfall([
      function (callback) {
        models.notificationTrigger.getByQuery({
            type: 'schedule',
            triggerName: utils.constants.eventNotificationTrigger.launchUpComingReminders,
            isActive: true
          },
          utils.firstInArrayCallback(callback))
      },
      function(notifTrigger, callback) {
        if(!notifTrigger) {
          return callback({error: "Trigger for eventUpcomingReminder not found or is not active"}, null)
        }
        var stopTime = moment().add(8, 'minutes')
        var minsToSleep = 2

        service.eventNotificationTriggerService.launchUpComingReminders(notifTrigger)
        temporal.loop(minsToSleep * 60 * 1000, function() {
          service.eventNotificationTriggerService.launchUpComingReminders(notifTrigger)
          if(moment() > stopTime) {
            this.stop()
            return callback(null, null)
          }
        })
      }
    ],
    function (err, events) {
      if (err) {
        utils.l.s("Error sending eventUpcomingReminder notification::" + JSON.stringify(err) )
      } else {
        utils.l.i("eventUpcomingReminder was successful")
      }
    })
}

function eventBasedNotifications() {
  var stopTime = moment().add(9, 'minutes')
  var minsToSleep = 1
  eventBasedNotificationsHandler()
  temporal.loop(minsToSleep * 60 * 1000, function() {
    eventBasedNotificationsHandler()
    if(moment() > stopTime) {
      utils.l.i("eventNewCreateNotification was successful")
      this.stop()
    }
  })
}

function eventBasedNotificationsHandler() {
  utils.async.waterfall([
      function (callback) {
        models.notificationQueue.getByQuery({}, callback)
      },
      function (notificationQueue, callback) {
        utils.async.mapSeries(notificationQueue, function (notificationQueueObj, callback) {
          utils.l.d("notificationQueueObj", notificationQueueObj)
          models.event.getById(notificationQueueObj.eventId.toString(), function (err, event) {
            if (err) {
              utils.l.s("There was an issue while fetching the event from db", err)
            } else if (!event) {
              utils.l.d("Event has been deleted", notificationQueueObj.eventId)
            } else {
              var userList = notificationQueueObj.notificationInformation ? notificationQueueObj.notificationInformation.userList : null
              var comment = notificationQueueObj.notificationInformation ? notificationQueueObj.notificationInformation.comment : null
              event.playerJoinedOrLeft = notificationQueueObj.notificationInformation ? notificationQueueObj.notificationInformation.playerJoinedOrLeft : null
              service.eventBasedPushNotificationService
                [utils.constants.notificationQueueTypeEnum[notificationQueueObj.notificationType]](event, userList, comment)
            }
          })
          notificationQueueObj.remove(callback)
        }, callback)
      }
    ],
    function (err, notificationQueue) {
      if(err) {
        utils.l.s("Error sending in eventNewCreateNotificationHandler::" + JSON.stringify(err))
      }
    })
}

function mergeDuplicateEvents() {
  utils.async.waterfall([
    function (callback) {
      models.event.getByQueryLeanWithComments(
        {launchStatus: utils.constants.eventLaunchStatusList.now},
        callback)
    },
    function(eventList, callback) {
      utils.async.mapSeries(eventList, function (event, callback) {
        service.eventService.handleDuplicateCurrentEvent(event, callback)
      }, callback)
    }
  ],
  function (err, eventList) {
    if(err) {
      utils.l.s("There was an error in mergeDuplicateEvents::" + JSON.stringify(err))
    } else {
      utils.l.i("mergeDuplicateEvents completed successfully")
    }
  })
}

function helmetsFinder() {
  var fs = require("fs")
  console.log("\n *STARTING* \n")

  // Get content from file
  var contents = fs.readFileSync("/Users/abichsu/Desktop/Helmets/armor.json")
  // Define to JSON type
  var jsonContent = JSON.parse(contents)
  utils._.forEach(jsonContent.items, function(value, key) {
    if(value.subType == "Helmet") {
      request(value.icon, function (error, response, body) {

        if(response.statusCode == 200) {
          //console.log(value.icon.toString())
          fs.appendFile('/Users/abichsu/Desktop/Helmets/helmets.txt', "\"" + value.icon.toString() + "\"" + ",\n", function (err) {

          })
        }
      })
    }
  })
}

function bulkHelmetUpdate(){
  var limit = 10
  var page = 0
  utils.l.i("Started helmetupdate:"+utils.moment().format())
  utils.async.waterfall([
    function(callback){
      models.user.findUserCount({"consoles.verifyStatus":"VERIFIED"},callback)
    },function(userCount, callback){
      temporal.loop(5 * 1000, function() {
        var batchStop = limit * (page+1)
        utils.l.i("Processing helmetupdate:page["+page+"]="+batchStop+" of total users="+userCount)
        service.accountService.bulkUpdateHelmet(page,limit)
        if(batchStop >= userCount) {
          utils.l.i("Updated helmets for all users")
          this.stop()
          return callback(null, null)
        } else {
          page = page + 1
        }
      })
    }
  ],function(err,data){
    utils.l.i("Completed helmetupdate:"+utils.moment().format())
  })
}

function bulkUserGroupUpdate(){
  var limit = 50
  var page = 0
  utils.l.i("Started helmetupdate:"+utils.moment().format())
  utils.async.waterfall([
    function(callback){
      //models.user.findUserCount({"verifyStatus":"VERIFIED"},callback)
      models.user.model.count({"verifyStatus":"VERIFIED"},callback)
      //models.user.model.count({"consoles.verifyStatus":{"$in":["VERIFIED"]},"verifyStatus":{"$in":[null]},"bungieMemberShipId":{"$ne":null}},callback)
    },function(userCount, callback){
      temporal.loop(5 * 1000, function() {
        var batchStop = limit * (page+1)
        utils.l.i("Processing bulkUserGroupUpdate:page["+page+"]="+batchStop+" of total users="+userCount)
        service.userService.bulkUpdateUserGroups(page,limit)
        if(batchStop >= userCount) {
          utils.l.i("Updated usergroups for all users")
          this.stop()
          return callback(null, null)
        } else {
          page = page + 1
        }
      })
    }
  ],function(err,data){
    utils.l.i("Completed bulkUserGroupUpdate:"+utils.moment().format())
  })
}

function groupStatsUpdate(){
  var limit = 150
  var page = 0
  utils.l.i("Started groupStatsUpdate:"+utils.moment().format())
  utils.async.waterfall([
    function(callback){
      models.groups.model.count({},callback)
    },function(groupCount, callback){
      temporal.loop(2 * 1000, function() {
        var batchStop = limit * (page+1)
        utils.l.i("Processing group stats:page["+page+"]="+batchStop+" of total groups="+groupCount)
        service.userService.bulkUpdateGroupStats(page,limit)
        if(batchStop >= groupCount) {
          utils.l.d("Updated stats for all group")
          this.stop()
          return callback(null, null)
        } else {
          utils.l.d("Processing next page for group stats")
          page = page + 1
        }
        utils.l.d("End of loop for group stats")
      })
    }
  ],function(err,data){
    utils.l.i("Completed groupStatsUpdate:"+utils.moment().format())
  })
}
function subscribeUsersForGroup(){
  var groupIdList = [
    "719107",
    "116823",
    "99063",
    "660926",
    "99846",
    "192001",
    "1052369",
    "672594",
    "414592",
    "63838",
    "118152",
    "900481",
    "755014",
    "1100775",
    "151350",
    "16555",
    "178871",
    "1115970",
    "619636",
    "879736",
    "844497",
    "503520",
    "660904",
    "233346",
    "313379",
    "693072",
    "648790",
    "3656",
    "129599",
    "247082",
    "551240",
    "370949",
    "172979",
    "40101",
    "498189",
    "544299"
  ]
  utils.async.mapSeries(groupIdList,
    function(groupId,asyncCallback){
      subscribeUsersForGroupById(groupId,asyncCallback)
    },function(err,results){
      utils.l.d("Completed updateGroupStats for all groups")
    }
  )
}
function updateGroupStats(){
  utils.async.waterfall([
    function(callback){
      models.groups.findGroupById("1570671",callback)
    },function(group, callback){
      service.userService.updateGroupStats(group,callback)
    }
  ],function(err,data){
    utils.l.i("Completed updateGroupStats:for groupId::"+"1570671"+"::"+utils.moment().format())

  })
}
function subscribeUsersForGroupById(groupId,callback){
  utils.l.i("jobs::subscribeUsersForGroup::group::"+groupId)
  utils.async.waterfall([
    function(callback){
      models.groups.findGroupById(groupId,callback)
    },function(group, callback){
      service.userService.subscribeUsersForGroup(group,callback)
    }
  ],function(err,data){
    utils.l.i("Completed subscribeUsersForGroup:"+utils.moment().format())
    return callback(null,null)
  })
}

function migrateInstllationsToSNS(){
  service.installationService.subscribeInstallation(function(err,data){
    utils.l.i("Completed migrateInstllationsToSNS:"+utils.moment().format())
  })
}

function createLoadTestUsers() {
  var minstoSleep = 1
  var counter = 1
  var totalUsers = 10000
  var step = 100
  temporal.loop(minstoSleep * 60 * 1000, function() {
    var batchStop = counter + step - 1
    createUserAndInstallation(counter, batchStop)
    if(batchStop >= totalUsers) {
      utils.l.i("Created all users")
      this.stop()
    } else {
      counter = counter + step
    }
  })
}

function createUserAndInstallation(counter, totalUsers) {
  var baseUrl = "https://travelerbackendproduction.herokuapp.com"

  var userData = {
    userName: "loadTestUser"+counter,
    passWord: "password",
    consoles: [{
      "consoleType": "PS4",
      "consoleId": "loadTestUser"+counter
    }],
    bungieMemberShipId: "13366437"
  }
  var myCookies = {}
  var userLoginResponse = {}

  utils.async.waterfall([
    function(callback) {
      tUtils.tPost(
        baseUrl,
        {path: "/api/v1/auth/register", data: userData},
        {status: 200},
        callback)
    },
    function(res, callback) {
      var loginData = {
        userName: userData.userName,
        passWord: userData.passWord
      }
      tUtils.tPost(
        baseUrl,
        {path: "/api/v1/auth/login", data: loginData},
        {status: 200},
        callback)
    },
    function(res, callback) {
      userLoginResponse = JSON.parse(res.text)
      var installationData = {
        deviceToken: "054f1fd8f081b985331c7745adaea5205b2d691eccd253b386e6ba28e63e6598"
      }
      myCookies = tUtils.getCookiesFromRes(res)
      tUtils.tPost(
        baseUrl,
        {
          path: "/api/v1/a/installation/ios",
          data: installationData,
          cookies: myCookies
        },
        {status: 200},
        callback)
    },
    function(res, callback) {
      tUtils.tGet(
        baseUrl,
        {
          path: "/api/v1/a/account/group/list",
          cookies: myCookies
        },
        {status: 200},
        callback)
    },
/*    function(res, callback) {
      tUtils.tGet(
        baseUrl,
        {
          path: "/api/v1/a/event/list",
          cookies: myCookies
        },
        {status: 200},
        callback)
    },
    function(res, callback) {
      tUtils.tGet(
        baseUrl,
        {
          path: "/api/v1/a/event/list",
          cookies: myCookies
        },
        {status: 200},
        callback)
    },
    function(res, callback) {
      tUtils.tGet(
        baseUrl,
        {
          path: "/api/v1/a/event/list",
          cookies: myCookies
        },
        {status: 200},
        callback)
    },*/
    function(res, callback) {
      if(counter == totalUsers) {
        //utils.l.i("user from response", userLoginResponse)
        var playerId = userLoginResponse.value._id
        var eventData = {
          "eType":"56df6ab3dac7e703003a101f",
          "minPlayers":1,
          "maxPlayers":3,
          "creator": playerId,
          "players": [playerId],
          "launchDate": getNewDate(counter)
        }

        tUtils.tPost(
          baseUrl,
          {
            path: "/api/v1/a/event/create",
            data: eventData,
            cookies: myCookies
          },
          {status: 200},
          callback)
      } else {
        callback(null, res)
      }
    }
  ],
    function (err, res) {
      if(err) {
        utils.l.d("Error in creating user::" + JSON.stringify(err) + "::" + JSON.stringify(res))
      } else {
        utils.l.d("user was created successfully", JSON.stringify(res))
        if(counter < totalUsers) {
          createUserAndInstallation(++counter, totalUsers)
        } else {
          utils.l.i("Created all batch users: ", counter)
        }
      }
    })
}

function getNewDate(minutes) {
  return new Date(Date.now() + (minutes * 60000)).toISOString()
}

module.exports = {
  updatePassWord: updatePassWord,
  deleteOldFullEvents: deleteOldFullEvents,
  deleteOldStaleEvents: deleteOldStaleEvents,
  upcomingEventsReminder: upcomingEventsReminder,
  eventFullReminder: eventFullReminder,
  eventStartReminder: eventStartReminder,
  dailyOneTimeReminder: dailyOneTimeReminder,
  eventUpcomingReminder: eventUpcomingReminder,
  helmetsFinder: helmetsFinder,
  eventExpiry:eventExpiry,
  userTimeout:userTimeout,
  preUserTimeout:preUserTimeout,
  createLoadTestUsers: createLoadTestUsers,
  eventBasedNotifications: eventBasedNotifications,
  bulkHelmetUpdate: bulkHelmetUpdate,
  mergeDuplicateEvents: mergeDuplicateEvents,
  bulkUserGroupUpdate:bulkUserGroupUpdate,
  groupStatsUpdate:groupStatsUpdate,
  subscribeUsersForGroup:subscribeUsersForGroup,
  updateGroupStats:updateGroupStats,
  migrateInstllationsToSNS:migrateInstllationsToSNS
}