var mongoose = require('mongoose')
var Schema = mongoose.Schema
var Mixed = Schema.Types.Mixed

var pendingEventInvitationSchema = new Schema({
  event: {type: Schema.Types.ObjectId, ref: 'Event'},
  inviter: {type: Schema.Types.ObjectId, ref: 'User', required: true},
  networkObject: Mixed,
})

pendingEventInvitationSchema.index({'event': 1})
pendingEventInvitationSchema.index({'inviter': 1})

module.exports = {
  schema: pendingEventInvitationSchema
}