var utils = require('../utils')
var mongoose = require('mongoose')

// Notification Schema
var notificationQueueSchema = require('./schema/notificationQueueSchema')

// Model initialization
var NotificationQueue = mongoose.model('NotificationQueue', notificationQueueSchema.schema)

function getByQuery(query, callback) {
	NotificationQueue
		.find(query)
		.exec(callback)
}

function addToQueue(eventId, notificationInformation, notificationType) {
	var notificationQueueData = {
		eventId: eventId,
		notificationInformation: notificationInformation,
		notificationType: notificationType
	}
	var notificationQueueObj = new NotificationQueue(notificationQueueData)

	notificationQueueObj.save(function (err, notificationQueueResult) {
		if(err) {
			utils.l.i("unable to add to notification queue", err)
		} else {
			utils.l.d("Successfully added to the notification queue", notificationQueueResult)
		}
	})
}

module.exports = {
	addToQueue: addToQueue,
	getByQuery: getByQuery
}