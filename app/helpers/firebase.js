var utils = require('../utils')
var Firebase = require("firebase")
var path = require('path')

Firebase.initializeApp({
      serviceAccount: (process.env.NODE_ENV == 'production' || process.env.NODE_ENV == 'staging' ?
        path.resolve('./firebase_credentials/prod/serviceAccountCredentials.json')
        : path.resolve('./firebase_credentials/dev/serviceAccountCredentials.json')),
      databaseURL: utils.config.firebaseURL
})



var firebaseRef = Firebase.database().ref()

var eventsRef = firebaseRef.child("events")
var usersRef = firebaseRef.child("users")
var commentsRef = firebaseRef.child("comments")

function createEvent(event, user){
  createEventV2(event,user,false)
}

function createEventV2(event, user,useEventClan) {
  utils.l.d('createEventV2::event',utils.l.eventLog(event))
  utils.l.d('createEventV2::user',utils.l.userLog(user))
  utils.l.d('createEventV2::useEventClan',useEventClan)
  var clansRef = useEventClan && utils._.isValidNonBlank(event.clanId) ? eventsRef.child(event.clanId) : eventsRef.child(user.clanId)
  var id = event._id.toString()
  var eventObj = null

  // If the event has been deleted it will not have the 'creator' field
  if(event.creator) {
    // We want to remove _id and __v from event as it creates problems while saving in firebase
    eventObj = getEventObj(event)
  }

  clansRef.child(id).set(eventObj, function (error) {
    if (error) {
      utils.l.d("event creation failed in firebase", utils.l.eventLog(ventObj))
    } else {
      utils.l.d("event was created successfully in firebase", utils.l.eventLog(eventObj))
    }
  })
}

function updateEvent(event, user){
  updateEventV2(event, user,false)
}

function updateEventV2(event, user,useEventClan) {
  utils.l.d('updateEventV2::event',utils.l.eventLog(event))
  utils.l.d('updateEventV2::user',utils.l.userLog(user))
  utils.l.d('updateEventV2::useEventClan',useEventClan)

  var clansRef = utils._.isValidNonBlank(event) && utils._.isValidNonBlank(event.clanId) ? eventsRef.child(event.clanId) : eventsRef.child(user.clanId)
  //var clansRef = eventsRef.child(user.clanId)
  var id = event._id.toString()
  // We want to remove _id and __v from event as it creates problems while saving in firebase
  var eventObj = getEventObj(event)

  clansRef.child(id).update(eventObj, function (error) {
    if (error) {
      utils.l.d("event creation failed in firebase", utils.l.eventLog(eventObj))
    } else {
      utils.l.d("event was updated successfully in firebase", utils.l.eventLog(eventObj))
    }
  })
}

function updateComment(event){
  var eventCommentRef = commentsRef.child(event._id.toString())
  eventCommentRef.set({updated: utils.moment(event.updated).unix()}, function (error) {
    if (error) {
      utils.l.d("Comment update failed in firebase", utils.l.eventLog(event))
    } else {
      utils.l.d("Comment was updated successfully in firebase", utils.l.eventLog(event))
    }
  })
}

function createUser(user) {
  var id = user._id.toString()
  var userObj = getUserObj(user)
  usersRef.child(id).set({value:userObj}, function (error) {
    if (error) {
      utils.l.d("user creation failed in firebase", utils.l.userLog(user))
    } else {
      utils.l.d("user was created successfully in firebase", utils.l.userLog(user))
    }
  })}

function updateUser(user) {
  var id = user._id.toString()
  var userObj = getUserObj(user)
  usersRef.child(id).update({value:userObj}, function (error) {
    if (error) {
      utils.l.d("user creation failed in firebase", utils.l.userLog(user))
    } else {
      utils.l.d("user was created successfully in firebase", utils.l.userLog(user))
    }
  })
}

function getEventObj(event) {
  /*
  We do not need to send the entire event objec to firebase
  The client just needs to know something changed in the event
  As they call the getFeed API on event change
   */
  return {
    updated: utils.moment(event.updated).unix()
  }
}

function getUserObj(user) {
  var userObj = user.toObject()
  userObj._id = userObj._id.toString()
  delete userObj.passWord
  return userObj
}

module.exports = {
  createEvent: createEvent,
  updateEvent: updateEvent,
  createEventV2: createEventV2,
  updateEventV2: updateEventV2,
  createUser: createUser,
  updateUser: updateUser,
  updateComment:updateComment
}