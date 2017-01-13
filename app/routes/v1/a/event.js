var express = require('express')
var router = express.Router()
var routeUtils = require('./../../routeUtils')
var utils = require('../../../utils')
var models = require('../../../models')
var helpers = require('../../../helpers')
var service = require('../../../service')

function create(req, res) {
	utils.l.i("Event create request: " + JSON.stringify(req.body))
	service.eventService.createEvent(req.user, req.body, function(err, event) {
		if (err) {
			routeUtils.handleAPIError(req, res, err, err)
		} else {
			helpers.m.trackEvent(event)
			if(event.players.length == 1) {
				helpers.firebase.createEvent(event, req.user)
				helpers.m.incrementEventsCreated(req.user)
			} else {
				helpers.firebase.updateEvent(event, req.user)
				helpers.m.incrementEventsJoined(req.user)
			}
			routeUtils.handleAPISuccess(req, res, event,{eventId:event._id})
		}
	})
}

function join(req, res) {
	utils.l.d("Event join request: " + JSON.stringify(req.body))
	service.eventService.joinEvent(req.user, req.body, function(err, event) {
		if (err) {
			routeUtils.handleAPIError(req, res, err, err)
		} else {
			helpers.m.incrementEventsJoined(req.user)
			helpers.firebase.updateEvent(event, req.user)
			routeUtils.handleAPISuccess(req, res, event,{eventId:event._id})
		}
	})
}

function list(req, res) {
	utils.l.d("Event list request")
	listEvents(req.user, req.param('consoleType'), function(err, events) {
		if (err) {
			routeUtils.handleAPIError(req, res, err, err, {utm_dnt:"list"})
		} else {
			routeUtils.handleAPISuccess(req, res, events, {utm_dnt:"list"})
		}
	})
}

function listAll(req, res) {
	utils.l.d("Event listAll request")
	models.event.getByQuery({}, null, function(err, events) {
		if (err) {
			routeUtils.handleAPIError(req, res, err, err, {utm_dnt:"listAll"})
		} else {
			routeUtils.handleAPISuccess(req, res, events, {utm_dnt:"listAll"})
		}
	})
}

function listById(req, res) {
	utils.l.d("Get event by id request" + JSON.stringify(req.body))
	service.eventService.listEventById(req.body, function(err, event) {
		if (err) {
			routeUtils.handleAPIError(req, res, err, err, {utm_dnt:"listById"})
		} else {
			if(!event){
				err = { error: "Sorry, looks like that event is no longer available."}
				routeUtils.handleAPIError(req, res, err, err)
			}else {
				service.eventService.publishFullEventListing(event,req)
				routeUtils.handleAPISuccess(req, res, event, {eventId: event._id})
			}
		}
	})
}

function leave(req, res) {
	utils.l.d("Event leave request: " + JSON.stringify(req.body))

	service.eventService.leaveEvent(req.user, req.body, function(err, event) {
		if (err) {
			routeUtils.handleAPIError(req, res, err, err)
		} else {
			//Send just event id if the event is deleted for backward compatibility
			event  = utils._.isValidNonBlank(event) && event.deleted ? {_id : req.body.eId}:event
			routeUtils.handleAPISuccess(req, res, event,{eventId:event._id})
		}
	})
}

function remove(req, res) {
	utils.l.d("Event delete request")
	deleteEvent(req.body, function(err, event) {
		if (err) {
			routeUtils.handleAPIError(req, res, err, err)
		} else {
			// Adding event id in delete request since it helps the client identify which event was deleted
			if(utils._.isInvalidOrBlank(event)) {
				event= {
					_id: req.body.eId
				}
			}
			routeUtils.handleAPISuccess(req, res, event)
		}
	})
}

function listEvents(user, consoleType, callback) {
	if(utils._.isInvalidOrBlank(consoleType)) {
		consoleType = utils.primaryConsole(user).consoleType
	}
	models.event.getByQuery({clanId: user.clanId, consoleType: consoleType,
		$or: [
			{status: {$ne: "full"}},
			{players: user._id}
		]
	}, null, function(err, eventList) {
		if(err) {
			utils.l.s("There was an error in listEvent", err)
			return callback({error: "Something went wrong. Please try again in a few minutes"}, null)
		} else {
			return callback(null, eventList)
		}
	})
}

function deleteEvent(data, callback) {
	models.event.deleteEvent(data, callback)
}

function clearEventsForPlayer(req, res) {
	service.eventService.clearEventsForPlayer(req.user, null, null, function(err, events) {
		if (err) {
			routeUtils.handleAPIError(req, res, err, err)
		} else {
			routeUtils.handleAPISuccess(req, res, events)
		}
	})
}

function addComment(req, res) {
	utils.l.d("Add comment request: " + JSON.stringify(req.body))
	service.eventService.addComment(req.user, req.body, function (err, event) {
		if (err) {
			routeUtils.handleAPIError(req, res, err, err)
		} else {
			routeUtils.handleAPISuccess(req, res, event)
		}
	})
}

function reportComment(req, res) {
	utils.l.d("Report comment request: " + JSON.stringify(req.body))
	if(req.body.formDetails) {
		req.assert('formDetails.reportDetails', "Report details cannot be empty").notEmpty()
	}
	service.eventService.reportComment(req.user, req.body, function (err, event) {
		if (err) {
			routeUtils.handleAPIError(req, res, err, err)
		} else {
			routeUtils.handleAPISuccess(req, res, event)
		}
	})
}

function kick(req, res) {
	utils.l.d("kick request: " + JSON.stringify(req.body))
	service.eventService.kick(req.body, function(err, event) {
		if (err) {
			routeUtils.handleAPIError(req, res, err, err)
		} else {
			routeUtils.handleAPISuccess(req, res, event)
		}
	})
}

function invite(req, res) {
	utils.l.d("Invite request: " + JSON.stringify(req.body))
	var networkObject = null
	if(!req.body.eId  || !req.body.invitees) {
		var err = {
			error: "Something went wrong in sending the invite. Please try again later"
		}
		utils.l.s("Bad request for invite request", req.body)
		routeUtils.handleAPIError(req, res, err, err)
	} else {
		var data = req.body
		data.invitees = utils._.map(data.invitees, utils._.trim)

		utils.async.waterfall([
			function (callback) {
				service.eventService.invite(req.user, data, callback)
			},
			function (event, bungieNetworkObject, userIds, userIdsInDatabase, callback) {
				networkObject = bungieNetworkObject
				service.eventService.addUsersToEvent(event, userIds, function(err, updatedEvent) {
					if(err) {
						return callback(err, null)
					} else {
						return callback(null, event, userIds, userIdsInDatabase)
					}
				})
			},
			function(event, userIds, userIdsInDatabase, callback) {
				createEventInvitations(userIds, userIdsInDatabase, event, req.user, callback)
			},
			function(event, callback) {
				service.eventService.handleCreatorChangeForFullCurrentEvent(event, callback)
			}
		],
			function (err, event) {
				if (err && err.errorType != "NO_NEW_INVITEES") {
					routeUtils.handleAPIError(req, res, err, err)
				} else {
					if(utils._.isValidNonBlank(event))
						helpers.firebase.updateEventV2(event, req.user,true)
					routeUtils.handleAPISuccess(req, res, {event: event, networkObject: networkObject})
				}
			})
	}
}

function createEventInvitations(inviteeIds, userIdsInDatabase, event, inviter, callback) {
	if(process.env.acceptingInvitations == "false") {
		inviteeIds = utils._.difference(inviteeIds, userIdsInDatabase)
	}

	utils.async.mapSeries(inviteeIds, function(userId, callback) {
			var data = {
				eventId: event._id.toString(),
				inviterId: inviter._id.toString(),
				inviteeId: userId
			}
			service.eventInvitationService.createInvitation(data, callback)
		},
		function(err, eventInvitations) {
			if(err || utils._.isInvalidOrBlank(eventInvitations)) {
				utils.l.s("create invitation mapSeries was unsuccessful", err)
				return callback(err, event)
			} else {
				return callback(null, event)
			}
		})
}

function acceptInvite(req, res) {
	utils.l.d('acceptInvite::************************START::')
	utils.l.d('acceptInvite::req.body',req.body)
	service.eventService.acceptInvite(req.user, req.body, function (err, event) {
		utils.l.d('acceptInvite::************************END::')
		if (err) {
			routeUtils.handleAPIError(req, res, err, err)
		} else {
			helpers.firebase.updateEventV2(event,req.user,true)
			routeUtils.handleAPISuccess(req, res, event)
		}
	})
}

function cancelInvite(req, res) {
	utils.l.d("Cancel Invite request: " + JSON.stringify(req.body))
	service.eventService.cancelInvite(req.user, req.body, function (err, event) {
		if (err) {
			routeUtils.handleAPIError(req, res, err, err)
		} else {
			routeUtils.handleAPISuccess(req, res, event)
		}
	})
}

routeUtils.rPost(router, '/create', 'createEvent', create)
routeUtils.rPost(router, '/join', 'joinEvent', join)
routeUtils.rGet(router, '/list', 'listEvents', list, {utm_dnt:"androidAppVersion"})
routeUtils.rGet(router, '/listAll', 'listAllEvents', listAll, {utm_dnt:"androidAppVersion"})
routeUtils.rPost(router, '/listById', 'listEventById', listById)
routeUtils.rPost(router, '/leave', 'leaveEvent', leave)
routeUtils.rPost(router, '/delete', 'removeEvent', remove)
routeUtils.rPost(router, '/clear', 'clearEventsForPlayer', clearEventsForPlayer)
routeUtils.rPost(router, '/addComment', 'addEventComment', addComment)
routeUtils.rPost(router, '/reportComment', 'reportEventComment', reportComment)
routeUtils.rPost(router, '/kick', 'kick', kick)
routeUtils.rPost(router, '/invite', 'invite', invite)
routeUtils.rPost(router, '/invite/accept', 'acceptInvite', acceptInvite)
routeUtils.rPost(router, '/invite/cancel', 'cancelInvite', cancelInvite)
module.exports = router