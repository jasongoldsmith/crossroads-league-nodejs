var utils = require('../utils')
var mongoose = require('mongoose')
var helpers = require('../helpers')

// Activity Schema
var pendingEventInvitationSchema = require('./schema/pendingEventInvitationSchema')

// Model initialization
var PendingEventInvitation = mongoose.model('PendingEventInvitation', pendingEventInvitationSchema.schema)

function getByQueryPopulated(query, callback) {
  PendingEventInvitation
    .find(query)
    .populate("event")
    .populate("inviter", "-passWord")
    .populate("invitee", "-passWord")
    .batchSize(50)
    .exec(function (err, pendingEventInvitationList) {
      if(err) {
        utils.l.s("There was a problem in getting EventInvitation populated from db", err)
        return callback({error: "There was some problem in sending the invite. Please try again later."}, null)
      } else {
        return callback(err, pendingEventInvitationList)
      }
    })
}

function getByQueryLean(query, callback) {
  PendingEventInvitation
    .find(query)
    .batchSize(50)
    .exec(function (err, pendingEventInvitationList) {
      if(err) {
        utils.l.s("There was a problem in getting EventInvitation populated from db", err)
        return callback({error: "There was some problem in sending the invite. Please try again later."}, null)
      } else {
        return callback(err, pendingEventInvitationList)
      }
    })
}

function create(data, callback) {
  var pendingEventInvitationData = {
    _id: data._id,
    event: data.eventId,
    inviter: data.inviterId,
    networkObject: data.networkObject
  }
  var pendingEventInvitationObj = new PendingEventInvitation(pendingEventInvitationData)
  save(pendingEventInvitationObj, callback)
}

function save(pendingEventInvitationObj, callback) {
  pendingEventInvitationObj.save(function(err, result) {
    if(err) {
      utils.l.s("There was a problem in saving the pendingEventInvitation object", err)
      return callback({error: "There was some problem in sending the invite. Please try again later."}, null)
    } else {
      return callback(err, result)
    }
  })
}

function findOneAndRemove(query, callback) {
  PendingEventInvitation.findOneAndRemove(query, function (err, deletedPendingEventInvitation) {
    if(err) {
      return callback({error: "Something went wrong while deleting this pending event invitation"}, null)
    } else if(utils._.isInvalidOrBlank(deletedPendingEventInvitation)) {
      return callback({error: "This pending event invitation does not exist"}, null)
    } else {
      return callback(null , deletedPendingEventInvitation)
    }
  })
}

module.exports = {
  model : PendingEventInvitation,
  getByQueryLean : getByQueryLean,
  getByQueryPopulated : getByQueryPopulated,
  create : create,
  findOneAndRemove: findOneAndRemove
}