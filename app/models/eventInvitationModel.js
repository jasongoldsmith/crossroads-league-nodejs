var utils = require('../utils')
var mongoose = require('mongoose')
var helpers = require('../helpers')

// Activity Schema
var eventInvitationSchema = require('./schema/eventInvitationSchema')

// Model initialization
var EventInvitation = mongoose.model('EventInvitation', eventInvitationSchema.schema)

function getByQueryPopulated(query, callback) {
  EventInvitation
    .find(query)
    .populate("event")
    .populate("inviter", "-passWord")
    .populate("invitee", "-passWord")
    .batchSize(50)
    .exec(function (err, eventInvitationList) {
      if(err) {
        utils.l.s("There was a problem in getting EventInvitation populated from db", err)
        return callback({error: "There was some problem in sending the invite. Please try again later."}, null)
      } else {
        return callback(err, eventInvitationList)
      }
    })
}

function getByQueryLean(query, callback) {
  EventInvitation
    .find(query)
    .batchSize(50)
    .exec(function (err, eventInvitationList) {
      if(err) {
        utils.l.s("There was a problem in getting EventInvitation populated from db", err)
        return callback({error: "There was some problem in sending the invite. Please try again later."}, null)
      } else {
        return callback(err, eventInvitationList)
      }
    })
}

function create(data, callback) {
  var eventInvitationData = {
    event: data.eventId,
    inviter: data.inviterId,
    invitee: data.inviteeId
  }
  var eventInvitationObj = new EventInvitation(eventInvitationData)
  utils.async.waterfall([
    function (callback) {
      var query1 = {
        event: data.eventId,
        inviter: data.inviterId,
        invitee: data.inviteeId
      }
      var query2 = {
        event: data.eventId,
        inviter: data.inviteeId,
        invitee: data.inviterId
      }
      getByQueryLean({$or: [query1, query2]}, callback)
    },
    function(eventInvitation, callback) {
      if(utils._.isValidNonBlank(eventInvitation)) {
        utils.l.d("Invitation already exists for this event, skipping creation", eventInvitation)
        return callback({error: "One of the players has already been invited to this event"}, null)
      } else {
        save(eventInvitationObj, callback)
      }
    }
  ], callback)
}

function save(eventInvitationObj, callback) {
  eventInvitationObj.save(function(err, result) {
    if(err) {
      utils.l.s("There was a problem in saving the eventInvitation object", err)
      return callback({error: "There was some problem in sending the invite. Please try again later."}, null)
    } else {
      return callback(err, result)
    }
  })
}

function removeEventInvitation(eventInvitation, callback) {
  eventInvitation.remove(function (err, deletedEventInvitation) {
    if(err) {
      utils.l.s("There was a problem in deleting event invitation", eventInvitation)
      return callback({error: "We could not delete this user's invitation. Please try again later"}, callback)
    } else {
      return callback(err, deletedEventInvitation)
    }
  })
}

function findOneAndRemove(query, callback) {
  EventInvitation.findOneAndRemove(query, function (err, deletedeventInvitation) {
    if(err) {
      return callback({error: "Something went wrong while deleting this event invitation"}, null)
    } else if(utils._.isInvalidOrBlank(deletedeventInvitation)) {
      return callback({error: "This event invitation does not exist"}, null)
    } else {
      return callback(null , deletedeventInvitation)
    }
  })
}

module.exports = {
  model: EventInvitation,
  getByQueryLean: getByQueryLean,
  getByQueryPopulated: getByQueryPopulated,
  create: create,
  delete: removeEventInvitation,
  findOneAndRemove: findOneAndRemove
}