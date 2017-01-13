var utils = require('../utils')
var models = require('../models')
var moment = require('moment')
//for recipientType = knownUsers passin playerList as recipient list otherwise playerList will be playersLeft
function getNotificationDetails(event, notification, playerList, comment, callback) {

	var notificationObj = {
		name: notification.name,
		message: (notification.recipientType == 'knownUsers')
			? formatMessage(notification.messageTemplate, event, null, comment)
			: formatMessage(notification.messageTemplate, event, playerList, comment)
	}

	if(notification.recipientType == 'knownUsers'){
		notificationObj.recipients = playerList
		return callback(null, notificationObj)
	} else {
		getRecipients(notification.recipientType, event, null, null, function (err, recipients) {
			if (err) {
				return callback(err, null)
			}
			notificationObj.recipients = recipients
			return callback(null, notificationObj)
		})
	}
}

function getAggregateNotificationDetails(clanId, consoleType, eventCount, notification, callback) {
	var notificationObj = {
		name: notification.name,
		message: notification.messageTemplate.replace("#EVENT_COUNT#",eventCount)
	}

	getRecipients(notification.recipientType, null, clanId, consoleType, function(err, recipients) {
		if (err) {
			return callback(err, null)
		}
		notificationObj.recipients = recipients
		return callback(null, notificationObj)
	})
}

function formatMessage(messageTemplate, event, playerLeft, comment) {
	if(messageTemplate.indexOf("#CREATOR#") >= 0 )
		messageTemplate =  messageTemplate.replace("#CREATOR#",
			utils.consoleByType(event.creator,event.consoleType).consoleId)
	if(messageTemplate.indexOf("#EVENT_NAME#") >= 0 )
		messageTemplate =  messageTemplate.replace("#EVENT_NAME#", getEventName(event.eType))
	if(messageTemplate.indexOf("#TIME#") >= 0 )
		messageTemplate =  messageTemplate.replace("#TIME#", getTimeStringForDisplay(event.launchDate))
	if(messageTemplate.indexOf("#COMMENT#") >= 0 )
		messageTemplate =  messageTemplate.replace("#COMMENT#", comment)

	if(utils._.isValidNonBlank(playerLeft) && messageTemplate.indexOf("#PLAYER#") >= 0) {
		messageTemplate = messageTemplate.replace("#PLAYER#",
			utils.consoleByType(playerLeft,event.consoleType).consoleId)
	} else if(messageTemplate.indexOf("#PLAYER#") >= 0 ){
		messageTemplate = messageTemplate.replace("#PLAYER#",
			utils.consoleByType(event.playerJoinedOrLeft, event.consoleType).consoleId)
	}

	if(messageTemplate.indexOf("#PLAYERS_NEEDED#") >= 0 ) {
		var playersNeeded = event.maxPlayers - event.players.length
		messageTemplate = messageTemplate.replace("#PLAYERS_NEEDED#", "" + playersNeeded)
	}

	if(messageTemplate.indexOf("#PLAYERS_COUNT_NEEDED#") >= 0 ) {
		var playersNeeded = event.maxPlayers - event.players.length

		if(messageTemplate.indexOf("#PLAYERS_NEEDED_TXT#") >= 0){
			if(playersNeeded > 1) {
				messageTemplate = messageTemplate.replace("#PLAYERS_COUNT_NEEDED#", "" + playersNeeded)
				messageTemplate = messageTemplate
					.replace("#PLAYERS_NEEDED_TXT#", " more players for ")
					.replace("#PLAYERS_PREFIX_TXT#", "We are looking for ")
			}else if(playersNeeded == 1) {
				messageTemplate = messageTemplate.replace("#PLAYERS_COUNT_NEEDED#", "" + playersNeeded)
				messageTemplate = messageTemplate
					.replace("#PLAYERS_NEEDED_TXT#", " player for ")
					.replace("#PLAYERS_PREFIX_TXT#", "We are looking for ")
			}
			else {
				messageTemplate = messageTemplate.replace("#PLAYERS_COUNT_NEEDED#", "")
				messageTemplate = messageTemplate
					.replace("#PLAYERS_NEEDED_TXT#", "")
					.replace("#PLAYERS_PREFIX_TXT#", "Your fireteam is ready for ")
			}
		}
	}

	if(messageTemplate.indexOf("#EVENT_PLAYERS#") >= 0 ) {
		var players = utils._.filter(event.players, function(player) {
			return player._id != event.creator._id
		})

		var playernames = (utils._.compact(utils._.map(players, function(player) {
			var playerConsole = utils.consoleByType(player,event.consoleType)
			if(playerConsole.consoleId != utils.consoleByType(event.creator,event.consoleType).consoleId) {
				return playerConsole.consoleId
			}
		}))).join(", ")

		messageTemplate = messageTemplate.replace("#EVENT_PLAYERS#", playernames)
	}

	return messageTemplate
}

function getRecipients(recipientType, event, clanId, consoleType, callback) {
	var recipients = null
	switch(recipientType) {
		case "creator":
			recipients = [event.creator]
			return callback(null, recipients)
			break
		case "eventMembers":
			recipients = event.players
			return callback(null, recipients)
			break
		case "eventMembersMinusPlayerJoined":
			//TODO: Commenting to fix the issue with player being removed. Need to address this by passing in players to exclude.
			//event.players.pop()
			recipients = event.players
			return callback(null, recipients)
			break
		case "eventMembersNotCreator":
			recipients = utils._.filter(event.players, function(player) {
				return player._id.toString() != event.creator._id.toString()
			})
			return callback(null, recipients)
			break
		case "clanNotEventMembers":
			getClanMembers(event, clanId, consoleType, function(err, users) {
				if(err) {
					return callback(err, null)
				}
				recipients = removeEventPlayersFromClan(users, event.players)
				//utils.l.i("recipients with callback", recipients)
				return callback(null, recipients)
			})
			break
		case "clan":
			getClanMembers(event, clanId, consoleType, callback)
			break
	}
}

function getClanMembers(event, clanId, consoleType, callback) {
	var clanId = event ? event.clanId : clanId
	var consoleType = event ? event.consoleType : consoleType
	if(clanId == utils.constants.freelanceBungieGroup.groupId){
		return callback(null,[])
	}else {
		models.userGroup.getUsersByGroup(clanId,false,consoleType,callback)
	}
}

function removeEventPlayersFromClan(clanPlayers, eventPlayers) {
	//utils.l.d("clan players", clanPlayers)
	//utils.l.d("event players", eventPlayers)

	var recipients = []
	utils._.forEach(clanPlayers, function(clanPlayer) {
		var didMatch = false
		utils._.forEach(eventPlayers, function(eventPlayer) {
			if(clanPlayer._id.toString() == eventPlayer._id.toString()) {
				didMatch = true
			}
		})
		if(!didMatch) {
			recipients.push(clanPlayer)
		}
	})
	return recipients
}

function getEventName(activity) {
	var eventName = (utils._.compact([activity.aSubType, activity.aDifficulty])).join(" - ")
	if (utils._.isValidNonBlank(activity.aCheckpoint)) {
		eventName += ", " + activity.aCheckpoint
	}
	return eventName
}

function getTimeStringForDisplay(date) {

	var currentTime = new Date(moment.tz(Date.now(), 'America/Los_Angeles').format())
	var launchDate = new Date(moment.tz(date, 'America/Los_Angeles').format())

	switch(utils.format.compareDates(launchDate, currentTime)) {
		case 0:
			return "today"
			break
		case 1:
			return "tomorrow"
			break
		default:
			return moment.tz(date, 'America/Los_Angeles').format('MMM D, YYYY')
			break
	}
}

module.exports = {
	getNotificationDetails: getNotificationDetails,
	getAggregateNotificationDetails: getAggregateNotificationDetails,
	getClanMembers:getClanMembers,
	formatMessage:formatMessage
}
