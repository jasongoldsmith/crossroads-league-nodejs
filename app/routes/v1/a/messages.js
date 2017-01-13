var express = require('express')
var router = express.Router()
var routeUtils = require('./../../routeUtils')
var utils = require('../../../utils')
var models = require('../../../models')
var helpers = require('../../../helpers')

function send(req, res) {
	utils.l.d("Message send request: " + JSON.stringify(req.body))

	sendMessage(req.body, req.user, function(err, message) {
		if (err) {
			routeUtils.handleAPIError(req, res, err, err)
		} else {
			routeUtils.handleAPISuccess(req, res, message)
		}
	})
}

function sendToAll(req, res) {
	utils.l.d("Message send request: " + JSON.stringify(req.body))

	sendCustomMessageToAllUsers(req.body, function(err, message) {
		if (err) {
			routeUtils.handleAPIError(req, res, err, err)
		} else {
			routeUtils.handleAPISuccess(req, res, message)
		}
	})
}

function sendMessage(data, messageCreator, callback) {
	var eventObj = null
	utils.async.waterfall(
		[
			function(callback) {
				models.event.getById(data.eId, callback)
			},
			function(event, callback) {
				if(!event) {
					utils.l.i("No event found in database", data.eId)
					return callback({error: "This event has been deleted"}, null)
				} else {
					eventObj = event
					models.user.getUserById(data, callback)
				}
			},
			function (user, callback) {
				if(!user) {
					return callback({error: "There was an issue in sending the message"}, null)
				} else {
					models.installation.getInstallationByUser(user, callback)
				}
			},
			function (installation, callback) {
				var notificationObject = {
					name: "messageFromPlayer"
				}
				var message = utils.primaryConsole(messageCreator).consoleId + " from "
					+ eventObj.eType.aSubType + ": "  + data.message

				var payload = {
					user: messageCreator,
					event: eventObj
				}
				helpers.pushNotification.sendSinglePushNotification(payload, message, notificationObject, null, installation)
				return callback(null, {messageSent: data.message })
			}
		], callback)
}

function sendCustomMessageToAllUsers(data, callback) {
	utils.async.waterfall([
		function (callback) {
			if(utils._.isValidNonBlank(data.clanId)) {
				models.user.getByQuery({ clanId: data.clanId }, callback)
			} else {
				models.user.getByQuery({}, callback)
			}
		}, function (users, callback) {
			var notificationObject = {
				name : "customMessageFromFounders"
			}
			utils.async.map(users, models.installation.getInstallationByUser, function(err, installations) {
				helpers.pushNotification.sendMultiplePushNotifications(installations, null, data.message, notificationObject, null)
			})
			callback(null, {message: "pushes were sent successfully"})
		}
	], callback)

}

routeUtils.rPost(router, '/send', 'send', send)
routeUtils.rPost(router, '/sendToAll', 'sendToAll', sendToAll)
module.exports = router