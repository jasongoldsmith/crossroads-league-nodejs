var utils = require('../utils')
var models = require('../models')
var notificationService = require('./eventNotificationService')
var helpers = require('../helpers')

// Schedule Based Notifications

function handleUpcomingEvents(notifTrigger) {
  utils.l.i("Starting the job to launch events")
  utils.async.waterfall([
      function (callback) {
        var date = utils.moment().utc().add(utils.config.triggerIntervalMinutes,"minutes")
        models.event.getByQueryLean({
          launchStatus: utils.constants.eventLaunchStatusList.upcoming,
          launchDate: {$lte: date}}, callback)
       /* models.event.getByQuery({
          launchStatus: utils.constants.eventLaunchStatusList.upcoming,
          launchDate: {$lte: date}},
          null, callback)*/
      },
      function (events, callback) {
        var eventsLaunched = 0
        var totalEventsToLaunch = events ? events.length: 0
        var lastError = null
        if(totalEventsToLaunch > 0) {
          utils.async.map(events, function(event) {
            launchUpcomingEvent(event, notifTrigger, callback)
          }, function(err, eventUpdatedStatus) {
            eventsLaunched = utils._.sum(eventUpdatedStatus)
            if(eventsLaunched > 0)
              return callback(null, { totalEventsToLaunch: totalEventsToLaunch, eventsLaunched: eventsLaunched })
            else
              return callback({ errorMessage: "Unable to launch any of the events", error: lastError }, null)
          })
        } else {
          return callback(null,{ totalEventsToLaunch: totalEventsToLaunch, eventsLaunched: 0 })
        }
      }
    ],
    function (err, eventsLaunchUpdate) {
      if (err) {
        utils.l.s("Error launching events::" + JSON.stringify(err) + "::" + JSON.stringify(eventsLaunchUpdate))
      } else {
        utils.l.d("Events launched successfully::" + JSON.stringify(eventsLaunchUpdate))
      }
      utils.l.i("Completed the job to launch events::"+utils.moment().utc().format())
    }
  )
}

function launchEventStart(notifTrigger){
  utils.l.d("Starting trigger launchEventStart")
  utils.async.waterfall([
      function (callback) {
        var date = utils.moment().utc()
        models.event.getByQuery({
          launchStatus: utils.constants.eventLaunchStatusList.now,
          launchDate: {$lte: date},
          status: "full",
          notifStatus: {$nin: ["launchEventStart"]}},
          null, callback)
      },
      function (events, callback) {
        var totalEventsToLaunch = events ? events.length: 0
        if(totalEventsToLaunch > 0) {
          utils.async.map(events, function(event) {
            if(notifTrigger.isActive && notifTrigger.notifications.length > 0) {
              utils.async.map(notifTrigger.notifications,
                utils._.partial(createNotificationAndSend, event, null, null))
              event.notifStatus.push("launchEventStart")
              models.event.update(event, callback)
            } else {
              return callback(null, null)
            }
          }, function(err, updatedEvents) {
            return callback(err, updatedEvents)
          })
        } else {
          return callback(null, null)
        }
      }
    ],
    function (err, updatedEvents) {
      if (err) {
        utils.l.s("Error sending events start notification::" + JSON.stringify(err) + "::" + JSON.stringify(updatedEvents))
      }
      utils.l.i("Completed trigger launchEventStart::" + utils.moment().utc().format())
    }
  )
}

function eventStartReminder(notifTrigger){
  utils.l.d("Starting trigger eventStartReminder")
  utils.async.waterfall([
      function (callback) {
        var date = utils.moment().utc().add(utils.config.triggerReminderInterval, "minutes")
        var date1 =  utils.moment().utc().add((utils.config.triggerReminderInterval - 15), "minutes")
        models.event.getByQuery({
          launchStatus: utils.constants.eventLaunchStatusList.upcoming,
          launchDate: {$lte: date, $gte: date1},
          notifStatus: {$nin: ["eventStartReminder"]}},
          null, callback)
      },
      function (events, callback) {
        var totalEventsToLaunch = events ? events.length: 0
        if(totalEventsToLaunch > 0) {
          utils.async.map(events, function(event) {
            if(notifTrigger.isActive && notifTrigger.notifications.length > 0) {
              utils.async.map(notifTrigger.notifications,
                utils._.partial(createNotificationAndSend, event, null, null))
              event.notifStatus.push("eventStartReminder")
              models.event.update(event, callback)
            }else {
              return callback(null, null)
            }
          },function(err, updatedEvents) {
            return callback(err, updatedEvents)
          })
        }else {
          return callback(null, null)
        }
      }
    ],
    function (err, updatedEvents) {
      if (err) {
        utils.l.s("Error sending eventStartReminder notification::" + JSON.stringify(err) + "::" + JSON.stringify(updatedEvents))
      }
      utils.l.i("Completed trigger eventStartReminder::" +utils.moment().utc().format())
    }
  )
}

function dailyOneTimeReminder(notifTrigger, callback){
  utils.l.i("Starting trigger dailyOneTimeReminder")
  var date = new Date()
  date.setHours(0, 0, 0, 0)
  var date1 =  utils.moment(date).utc().format()
  var date2 = utils.moment(date).utc().add(24, "hours").format()

  utils.async.waterfall([
      function (callback) {
        models.event.getByQuery({
            launchStatus: utils.constants.eventLaunchStatusList.upcoming,
            status: {$ne: "full"},
            launchDate: {$gte: date1, $lte: date2}
        },
          null, callback)
      },
      function (events, callback) {
        var totalEventsToLaunch = events ? events.length: 0
        if(totalEventsToLaunch > 0) {
          if(notifTrigger.isActive && notifTrigger.notifications.length > 0) {
            var eventsByClan = utils._.groupBy(events, 'clanId')
            for(var clanId in eventsByClan) {
              var eventsCountByConsole = utils._.countBy(eventsByClan[clanId], 'consoleType')
              for(var consoleType in eventsCountByConsole) {
                utils.async.map(notifTrigger.notifications,
                  utils._.partial(createAggregateNotificationAndSend, clanId, consoleType,
                    eventsCountByConsole[consoleType]))
              }
            }
          }
        }
        callback(null, null)
      }
    ], callback)
}

function launchUpComingReminders(notifTrigger){
  utils.l.d("Starting trigger launchUpComingReminders")
  utils.async.waterfall([
      function (callback) {
        var date = utils.moment().utc().add(utils.config.triggerUpcomingReminderInterval, "minutes")
        models.event.getByQuery({
          launchStatus: utils.constants.eventLaunchStatusList.now,
          launchDate:{$lte: date}},
          null, callback)
      },
      function (events, callback) {
        var totalEventsToLaunch = events ? events.length: 0
        if(totalEventsToLaunch > 0) {
          utils.async.map(events, function(event) {
            if(notifTrigger.isActive && notifTrigger.notifications.length > 0) {
              var raidLf2mfNotif = utils._.find(notifTrigger.notifications, {"name": "RaidEventLf2mNotification"})
              var eventLf1mNotif = utils._.find(notifTrigger.notifications, {"name": "EventLf1mNotification"})
              var eventUdpated = false;
              if(event.eType.aType == "Raid"
                && ((event.maxPlayers - event.players.length) == 2)
                && !hasNotifStatus(event.notifStatus,"RaidEventLf2mNotification")) {
                createNotificationAndSend(event, null, null, raidLf2mfNotif)
                event.notifStatus.push("RaidEventLf2mNotification")
                eventUdpated=true
              }

              if((event.maxPlayers - event.players.length) == 1
                && !hasNotifStatus(event.notifStatus,"EventLf1mNotification")) {
                createNotificationAndSend(event, null, null, eventLf1mNotif)
                event.notifStatus.push("EventLf1mNotification")
                eventUdpated=true
              }

              if(!eventUdpated)
                callback(null,event)
              else
                models.event.update(event, callback)
            } else {
              return callback(null, null)
            }
          },function(err, updatedEvents) {
            return callback(err, updatedEvents)
          })
        }else {
          return callback(null, null)
        }
      }
    ],
    function (err, updatedEvents) {
      if (err) {
        utils.l.s("Error sending launchUpComingReminders notification::" + JSON.stringify(err) + "::" + JSON.stringify(updatedEvents))
      }
      utils.l.i("Completed trigger launchUpComingReminders::" + utils.moment().utc().format())
    }
  )
}

// Event based Notifications

function handleNewEvents(event, notifTrigger, callback) {
  var playersNeeded = getPlayersNeeded(event)
  utils.l.d("Running trigger handleNewEvents for event::playersNeeded"+playersNeeded, utils.l.eventLog(event))
  utils.l.d('handleNewEvents::notifTrigger',notifTrigger)
  if(notifTrigger.isActive) {
    var newEventNotif = null
    if (event.launchStatus == utils.constants.eventLaunchStatusList.upcoming
      && !hasNotifStatus(event.notifStatus,"NewCreateForUpcoming")) {
      newEventNotif = utils._.find(notifTrigger.notifications, {"name": "NewCreateForUpcoming"})
      event.notifStatus.push("NewCreateForUpcoming")
      createNotificationAndSend(event, null, null, newEventNotif)
      models.event.update(event,callback)
    } else if (event.launchStatus == utils.constants.eventLaunchStatusList.now
      && !hasNotifStatus(event.notifStatus,"NoSignupNotification") && playersNeeded>0) {
      utils.l.d('handleNewEvents::Sending NoSignupNotification notification for '+playersNeeded)
      newEventNotif = utils._.find(notifTrigger.notifications, {"name": "NoSignupNotification"})
      event.notifStatus.push("NoSignupNotification")
      createNotificationAndSend(event, null, null, newEventNotif)
      models.event.update(event,callback)
    }else return callback(null, null)
  } else {
    return callback(null, {message: "handleNewEvents Trigger is not active"})
  }
}

function handleJoinEvent(event, notifTrigger, playerList, callback) {
  utils.l.d("Running trigger for event join", utils.l.eventLog(event))
  if(notifTrigger.isActive) {
    if(event.launchStatus == utils.constants.eventLaunchStatusList.now &&
      event.players.length > 1 && event.players.length < event.maxPlayers) {
      utils.async.map(notifTrigger.notifications,
        utils._.partial(createNotificationAndSend, event, playerList, null))
      utils.l.d('event in join notification::',event)
      event.notifStatus.push("Join")
      models.event.update(event, callback)
    } else {
      return callback(null, null)
    }
  } else {
    return callback(null, {message: "handleJoinEvent Trigger is not active"})
  }
}

function handleEventInviteAccept(event, notifTrigger, playerList, callback) {
  utils.l.d("Running trigger for event join", utils.l.eventLog(event))
  if(notifTrigger.isActive) {
    if(event.launchStatus == utils.constants.eventLaunchStatusList.now &&
      event.players.length > 1 && event.players.length < event.maxPlayers) {
      utils.async.map(notifTrigger.notifications,
        utils._.partial(createNotificationAndSend, event, playerList, null))
      utils.l.d('event in join notification::',event)
      event.notifStatus.push("Join")
      models.event.update(event, callback)
    } else {
      return callback(null, null)
    }
  } else {
    return callback(null, {message: "handleJoinEvent Trigger is not active"})
  }
}

function handleLeaveEvent(event, notifTrigger, user, callback) {
  utils.l.d("Running trigger for event leave", utils.l.eventLog(event))
  if(notifTrigger.isActive) {
    if(event.launchStatus == utils.constants.eventLaunchStatusList.now) {
      utils.async.map(notifTrigger.notifications,
        utils._.partial(createNotificationAndSend, event, user, null))
      return callback(null, event)
    } else {
      return callback(null, null)
    }
  } else {
    return callback(null, {message: "handleLeaveEvent Trigger is not active"})
  }
}

function handleEventKick(event, notifTrigger, user, callback) {
  utils.l.d("Running trigger for event kick", utils.l.eventLog(event))
  if(notifTrigger.isActive) {
    if(event.launchStatus == utils.constants.eventLaunchStatusList.now) {
      utils.async.map(notifTrigger.notifications,
        utils._.partial(createNotificationAndSend, event, user, null))
      return callback(null, event)
    } else {
      return callback(null, null)
    }
  } else {
    return callback(null, {message: "handleLeaveEvent Trigger is not active"})
  }
}

function handleAddComment(event, notifTrigger, playerList, comment, callback) {
  utils.l.d("Running trigger for add comment", utils.l.eventLog(event))
  if(notifTrigger.isActive) {
    if(event.players.length > 1) {
      utils.async.map(notifTrigger.notifications,
        utils._.partial(createNotificationAndSend, event, playerList, comment))
      utils.l.d('event in add comment notification::',event)
      return callback(null, event)
    } else {
      return callback(null, null)
    }
  } else {
    return callback(null, {message: "handleAddComment Trigger is not active"})
  }
}

function handleCreatorChange(event, notifTrigger, playerList, callback) {
  utils.l.d("Running trigger for creator change", utils.l.eventLog(event))
  if(notifTrigger.isActive) {
    if(event.status == "full") {
      utils.async.map(notifTrigger.notifications,
        utils._.partial(createNotificationAndSend, event, playerList, null))
      utils.l.d('event in creator change notification::', event)
      return callback(null, event)
    } else {
      return callback(null, {message : "handleCreatorChange Trigger is not active"})
    }
  }
}

function handleEventInvites(event, notifTrigger, playerList, callback) {
  utils.l.d("Running trigger for event invite push notification", utils.l.eventLog(event))
  if(notifTrigger.isActive) {
    var eventInviteNotif = (event.launchStatus == utils.constants.eventLaunchStatusList.upcoming)
      ? utils._.find(notifTrigger.notifications, {"name": "EventInviteForUpcoming"})
      : utils._.find(notifTrigger.notifications, {"name": "EventInviteForCurrent"})
    createNotificationAndSend(event, playerList, null, eventInviteNotif)
    return callback(null, event)
  } else {
    return callback(null, {message : "handleEventInvites Trigger is not active"})
  }
}

// Helper Functions

function launchUpcomingEvent(event, notifTrigger, callback){
  utils.async.waterfall([
    function(callback){
      models.user.findUsersByIdAndUpdate(getEventPlayerIds(event),{lastActiveTime:new Date(),notifStatus:[]}, callback)
    },function (users,callback) {
      utils.l.d("launchEvent:: " + event._id + ",launchDate: " + event.launchDate)
      models.event.launchEvent(event._id, callback)
      //TODO: Make a firebase API to notify
    },
    function(updatedEvent, callback) {
      helpers.firebase.updateEvent(updatedEvent, updatedEvent.creator)
      var playersNeeded = getPlayersNeeded(event)
      // for each notification in the list return notification object with formatter message, recepients
      // Return notificationResp - array of notification{name:"",recepients:[{}],message:"")}
      if(notifTrigger.isActive && notifTrigger.notifications.length > 0 && playersNeeded>0) {
        //Send NoSignupNotification only if there are no players signedup. i.e Only player in event is creator
        var notifications = notifTrigger.notifications

        if(updatedEvent.status.toString() == utils.constants.eventStatus.full.toString()) {
          utils._.remove(notifications, {name: 'NoSignupNotification'})
          utils._.remove(notifications, {name: 'EventNotFullNotification'})
        } else if(updatedEvent.players.length > 1) {
          utils._.remove(notifications, {name: 'NoSignupNotification'})
        } else {
          utils._.remove(notifications, {name: 'EventNotFullNotification'})
        }
        utils.async.map(notifications, utils._.partial(createNotificationAndSend, updatedEvent, null, null))
      } else {
        return callback(null, null)
      }
    }], callback)
}

function hasNotifStatus(notifStatusList, notifStatus){
  //console.log("notifStatusList["+JSON.stringify(notifStatusList)+"],notifStatus:"+JSON.stringify(notifStatus)+"="+utils._.indexOf(JSON.parse(JSON.stringify(notifStatusList)),notifStatus))
  if(utils._.indexOf(notifStatusList,notifStatus) >= 0) return true
  else return false
}

function createNotificationAndSend(event, user, comment, notification){
  //utils.l.d("createNotificationAndSend::event="+utils.l.eventLog(event)+"\nnotification::" + JSON.stringify(notification))
  notificationService.getNotificationDetails(event, notification, user, comment, function(err, notificationResponse) {

    //utils.l.d("notification response object", utils.l.notificationResponse(notificationResponse))
    utils.l.d("notification response object", utils.l.notificationResponse(notificationResponse))
    if(err) utils.l.s("createNotificationAndSend::Error while creating notificationResponse object" + err)
    helpers.pushNotification.sendMultiplePushNotificationsForUsers(notificationResponse, event, null)
  })
}

function createAggregateNotificationAndSend(clanId, consoleType, eventCount, notification){
  //utils.l.d("createAggregateNotificationAndSend::notification::"+JSON.stringify(notification))
  notificationService.getAggregateNotificationDetails(clanId, consoleType, eventCount, notification, function(err,notificationResponse){
    //utils.l.d("notification response object", utils.l.notificationResponse(notificationResponse))
    helpers.pushNotification.sendMultiplePushNotificationsForUsers(notificationResponse, null, clanId)
  })
}

function sendMultipleEventNotifications(eventList, playerList, notification){
  //utils.l.d("createNotificationAndSend::event="+utils.l.eventLog(eventList)+"\nnotification::" + JSON.stringify(notification))
  utils._.map(eventList,function(event) {
      notificationService.getNotificationDetails(event, notification, playerList, null, function (err, notificationResponse) {
        //utils.l.d("notification response object", utils.l.notificationResponse(notificationResponse))
        if (err) util.l.s("createNotificationAndSend::Error while creating notificationResponse object" + err)
        helpers.pushNotification.sendMultiplePushNotificationsForUsers(notificationResponse, event, null)
      })
    })
}

function getEventPlayerIds(event){
  var playerIds = []

  if(event && event.players){
    if(event.players.length > 0 && event.players[0]._id)
      playerIds = utils._.map(event.players,"_id")
    else if(event.players.length > 0)
      playerIds = event.players
  }

  if(playerIds && playerIds.length == 0){
    if(event.creator && event.creator._id)
      playerIds.push(event.creator._id)
    else playerIds.push(event.creator)
  }

  utils.l.d("playerIds to activate",playerIds)
  return playerIds
}

function getPlayersNeeded(event){
  var playersNeeded = 0
  if(event){
    if(event.players && event.players.length>0)
      playersNeeded = event.maxPlayers - event.players.length
    else
      playersNeeded = event.maxPlayers
  }
  return playersNeeded
}


module.exports ={
  handleUpcomingEvents: handleUpcomingEvents,
  launchEventStart:launchEventStart,
  eventStartReminder: eventStartReminder,
  dailyOneTimeReminder: dailyOneTimeReminder,
  launchUpComingReminders: launchUpComingReminders,
  handleNewEvents: handleNewEvents,
  handleJoinEvent: handleJoinEvent,
  handleLeaveEvent: handleLeaveEvent,
  handleEventKick: handleEventKick,
  handleAddComment: handleAddComment,
  handleCreatorChange: handleCreatorChange,
  handleEventInvites: handleEventInvites,
  createNotificationAndSend: createNotificationAndSend,
  sendMultipleEventNotifications: sendMultipleEventNotifications,
  handleEventInviteAccept:handleEventInviteAccept
}