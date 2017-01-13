var utils = require('../utils')
var mongoose = require('mongoose')
var notificationTriggerSchema = require('./schema/notificationTriggerSchema')

// Model initialization
var NotificationTrigger = mongoose.model('NotificationTrigger', notificationTriggerSchema.schema)

function getByQuery(query, callback) {
	NotificationTrigger
		.find(query)
		.populate("notifications")
		.exec(callback)
}

function createNotificationTrigger(data, callback) {
	var notificationTriggerObj = new NotificationTrigger(data)
	utils.async.waterfall([
		function(callback) {
			NotificationTrigger.findOne({ triggerName: data.triggerName}, callback)
		},
		function(notificationTrigger, callback) {
			if(!notificationTrigger) {
				utils.l.d("no notificationTrigger found, saving notificationTrigger")
				notificationTriggerObj.save(callback)
			} else {
				utils.l.d("found notificationTrigger: " + notificationTrigger)
				return callback(null, notificationTrigger)
			}
		}
	], callback)
}

function listNotificationTriggers(callback) {
	getByQuery({ isActive : {$ne: false}}, callback)
}

function listAllNotificationTriggers(callback) {
	getByQuery({}, callback)
}

function listNotificationTriggerById(data, callback) {
	utils.async.waterfall([
		function (callback) {
			NotificationTrigger.findOne({_id: data.id}, callback)
		},
		function(notificationTrigger, callback) {
			if (!notificationTrigger) {
				utils.l.d("no notificationTrigger found")
				return callback({ error: "notificationTrigger with this id does not exist" }, null)
			} else {
				utils.l.d("found notification: " + JSON.stringify(notificationTrigger))
				return callback(null, notificationTrigger)
			}
		}
	], callback)
}

function updateNotificationTrigger(data, callback) {
	utils.async.waterfall([
		function (callback) {
			NotificationTrigger.findOne({_id: data.id}, callback)
		},
		function(notificationTrigger, callback) {
			if (!notificationTrigger) {
				utils.l.d("no notificationTrigger found")
				return callback({ error: "notificationTrigger with this id does not exist" }, null)
			} else {
				utils.l.d("found notificationTrigger: " + JSON.stringify(notificationTrigger))
				utils._.extend(notificationTrigger, data)
				notificationTrigger.save(callback)
			}
		}
	], callback)
}

module.exports = {
	model: NotificationTrigger,
	createNotificationTrigger: createNotificationTrigger,
	listNotificationTriggers: listNotificationTriggers,
	listAllNotificationTriggers: listAllNotificationTriggers,
	listNotificationTriggerById: listNotificationTriggerById,
	updateNotificationTrigger: updateNotificationTrigger,
	getByQuery: getByQuery
}