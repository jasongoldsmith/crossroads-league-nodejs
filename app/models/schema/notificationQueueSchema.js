var mongoose = require('mongoose')
var Schema = mongoose.Schema
var Mixed = Schema.Types.Mixed
var utils = require('../../utils')

var notificationQueueSchema = new Schema({
	eventId: {type: Schema.Types.ObjectId, ref: 'Event', required: true},
	notificationInformation: {type: Mixed},
	notificationType: {type: String, enum: Object.keys(utils.constants.notificationQueueTypeEnum)}
})

module.exports = {
	schema: notificationQueueSchema
}