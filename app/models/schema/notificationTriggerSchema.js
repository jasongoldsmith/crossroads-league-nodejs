var mongoose = require('mongoose')
var Schema = mongoose.Schema

var notificationTriggerSchema = new Schema({
	triggerName: { type: String, required: true},
	notifications:[{ type: Schema.Types.ObjectId, ref: 'Notification', required: true }],
	description: String,
	isActive: { type: Boolean, default: true},
	type: { type: String, enum: ['event', 'schedule'], required: true},
	schedule: String
})

module.exports = {
	schema: notificationTriggerSchema
}
