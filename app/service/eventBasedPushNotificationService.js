var utils = require('../utils')
var models = require('../models')
var notificationTriggerService = require('./eventNotificationTriggerService')

function sendPushNotificationForNewCreate(event) {
	utils.async.waterfall([
		function (callback) {
			models.notificationTrigger.getByQuery({triggerName: "Create"}, utils.firstInArrayCallback(callback))
		},
		function (notificationTrigger, callback) {
			notificationTriggerService.handleNewEvents(event, notificationTrigger, callback)
		}
	],
		function (err, updatedEvent) {
			if (err) {
			utils.l.s("Error in sendPushNotificationForNewCreate::" + err + "::" + JSON.stringify(updatedEvent))
			} else {
			utils.l.d("sendPushNotificationForNewCreate successful::", updatedEvent)
			}
		})
}

function sendPushNotificationForJoin(event, playerList) {
	utils.async.waterfall([
		function (callback) {
			models.notificationTrigger.getByQuery({triggerName: "Join"}, utils.firstInArrayCallback(callback))
		},
		function (notificationTrigger, callback) {
			notificationTriggerService.handleJoinEvent(event, notificationTrigger, playerList, callback)
		}
	],
		function (err, updatedEvent) {
			if (err) {
				utils.l.s("Error in sendPushNotificationForJoin::", err)
				utils.l.i("updated event", updatedEvent)
			} else {
				utils.l.d("sendPushNotificationForJoin successful::", updatedEvent)
			}
		})
}

function sendPushNotificationForLeave(event, user) {
	utils.async.waterfall([
		function (callback) {
			models.notificationTrigger.getByQuery({triggerName: "Leave"}, utils.firstInArrayCallback(callback))
		},
		function (notificationTrigger, callback) {
			notificationTriggerService.handleLeaveEvent(event, notificationTrigger, user[0], callback)
		}
	],
		function (err, updatedEvent) {
			if (err) {
				utils.l.s("Error in sendPushNotificationForLeave::", err)
				utils.l.i("updated event", updatedEvent)
			} else {
				utils.l.d("sendPushNotificationForLeave successful::", updatedEvent)
			}
		})
}

function sendPushNotificationForKick(event, user) {
	utils.async.waterfall([
			function (callback) {
				models.notificationTrigger.getByQuery({triggerName: "Kick"}, utils.firstInArrayCallback(callback))
			},
			function (notificationTrigger, callback) {
				notificationTriggerService.handleEventKick(event, notificationTrigger, user[0], callback)
			}
		],
		function (err, updatedEvent) {
			if (err) {
				utils.l.s("Error in sendPushNotificationForKick::", err)
				utils.l.i("updated event", updatedEvent)
			} else {
				utils.l.d("sendPushNotificationForKick successful::", updatedEvent)
			}
		})
}

function sendPushNotificationForAddComment(event, playerList, comment) {
	utils.async.waterfall([
		function (callback) {
			models.notificationTrigger.getByQuery({triggerName: "AddComment"}, utils.firstInArrayCallback(callback))
		},
		function (notificationTrigger, callback) {
			notificationTriggerService.handleAddComment(event, notificationTrigger, playerList, comment, callback)
		}
	],
		function (err, updatedEvent) {
			if (err) {
				utils.l.s("Error in sendPushNotificationForAddComment::" + err + "::" + JSON.stringify(updatedEvent))
			} else {
				utils.l.d("sendPushNotificationForAddComment successful::", updatedEvent)
			}
		})
}

function sendPushNotificationForCreatorChange(event, playerList) {
	utils.async.waterfall([
		function (callback) {
			models.notificationTrigger.getByQuery({triggerName: "CreatorChange"}, utils.firstInArrayCallback(callback))
		},
		function (notificationTrigger, callback) {
			notificationTriggerService.handleCreatorChange(event, notificationTrigger, playerList, callback)
		}
	],
		function (err, updatedEvent) {
			if (err) {
				utils.l.s("Error in sendPushNotificationForCreatorChange::" + err + "::" + JSON.stringify(updatedEvent))
			} else {
				utils.l.d("sendPushNotificationForCreatorChange successful::", updatedEvent)
			}
		})
}

function sendPushNotificationForEventInvites(event, playerList) {
	utils.async.waterfall([
		function (callback) {
			models.notificationTrigger.getByQuery({triggerName: "EventInvites"}, utils.firstInArrayCallback(callback))
		},
		function (notificationTrigger, callback) {
			notificationTriggerService.handleEventInvites(event, notificationTrigger, playerList, callback)
		}
	],
		function (err, updatedEvent) {
			if (err) {
				utils.l.s("Error in sendPushNotificationForEventInvites::" + err + "::" + JSON.stringify(updatedEvent))
			} else {
				utils.l.d("sendPushNotificationForEventInvites successful::", updatedEvent)
			}
		})
}

function sendInviteAcceptNotification(event, playerList) {
	utils.async.waterfall([
			function (callback) {
				models.notificationTrigger.getByQuery({triggerName: "eventInviteAccept"}, utils.firstInArrayCallback(callback))
			},
			function (notificationTrigger, callback) {
				notificationTriggerService.handleEventInviteAccept(event, notificationTrigger, playerList, callback)
			}
		],
		function (err, updatedEvent) {
			if (err) {
				utils.l.s("Error in sendInviteAcceptNotification::", err)
				utils.l.i("updated event", updatedEvent)
			} else {
				utils.l.d("sendInviteAcceptNotification successful::", updatedEvent)
			}
		})
}

module.exports = {
	sendPushNotificationForNewCreate: sendPushNotificationForNewCreate,
	sendPushNotificationForJoin: sendPushNotificationForJoin,
	sendPushNotificationForLeave: sendPushNotificationForLeave,
	sendPushNotificationForKick: sendPushNotificationForKick,
	sendPushNotificationForAddComment: sendPushNotificationForAddComment,
	sendPushNotificationForCreatorChange: sendPushNotificationForCreatorChange,
	sendPushNotificationForEventInvites: sendPushNotificationForEventInvites,
	sendInviteAcceptNotification: sendInviteAcceptNotification
}