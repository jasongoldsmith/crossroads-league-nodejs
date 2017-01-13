var mongoose = require('mongoose')
var Schema = mongoose.Schema

var EventInvitationSchema = new Schema({
  event: {type: Schema.Types.ObjectId, ref: 'Event', required: true},
  inviter: {type: Schema.Types.ObjectId, ref: 'User', required: true},
  invitee: {type: Schema.Types.ObjectId, ref: 'User', required: true},
})

EventInvitationSchema.index({'event': 1})
EventInvitationSchema.index({'inviter': 1})
EventInvitationSchema.index({'invitee': 1})

module.exports = {
  schema: EventInvitationSchema
}