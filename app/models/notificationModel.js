var utils = require('../utils')
var mongoose = require('mongoose')

// Notification Schema
var notificationSchema = require('./schema/notificationSchema')

// Model initialization
var Notification = mongoose.model('Notification', notificationSchema.schema)

function createNotification(data, callback) {
	var notificationObj = new Notification(data)
	utils.async.waterfall([
		function(callback) {
			Notification.findOne({ name: data.name}, callback)
		},
		function(notification, callback) {
			if(!notification) {
				utils.l.d("no notification found, saving notification")
				notificationObj.save(callback)
			} else {
				utils.l.d("found notification: " + notification)
				return callback(null, notification)
			}
		}
	], callback)
}

function listNotifications(callback) {
	Notification.find({ isActive : {$ne: false} }, callback)
}

function listAllNotifications(callback) {
	Notification.find(callback)
}

function listNotificationById(data, callback) {
	utils.async.waterfall([
		function (callback) {
			Notification.findOne({_id: data.id}, callback)
		},
		function(notification, callback) {
			if (!notification) {
				utils.l.d("no notification found")
				return callback({ error: "notification with this id does not exist" }, null)
			} else {
				utils.l.d("found notification: " + JSON.stringify(notification))
				return callback(null, notification)
			}
		}
	], callback)
}

function updateNotification(data, callback) {
	utils.async.waterfall([
		function (callback) {
			Notification.findOne({_id: data.id}, callback)
		},
		function(notification, callback) {
			if (!notification) {
				utils.l.d("no notification found")
				return callback({ error: "notification with this id does not exist" }, null)
			} else {
				utils.l.d("found notification: " + JSON.stringify(notification))
				utils._.extend(notification, data)
				notification.save(callback)
			}
		}
	], callback)
}

module.exports = {
	model: Notification,
	createNotification: createNotification,
	listNotifications: listNotifications,
	listAllNotifications: listAllNotifications,
	listNotificationById: listNotificationById,
	updateNotification: updateNotification
}