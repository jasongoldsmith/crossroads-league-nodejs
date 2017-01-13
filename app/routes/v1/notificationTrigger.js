var express = require('express')
var router = express.Router()
var config = require('config')
var utils = require('../../utils')
var helpers = require('../../helpers')
var routeUtils = require('../routeUtils')
var models = require('../../models')

function create(req, res) {
	utils.l.d("NotificationTrigger create request: " + JSON.stringify(req.body))
	createNotificationTrigger(req.body, function(err, notificationTrigger) {
		if (err) {
			routeUtils.handleAPIError(req, res, err, err)
		} else {
			routeUtils.handleAPISuccess(req, res, notificationTrigger)
		}
	})
}

function list(req, res) {
	utils.l.d("NotificationTrigger list request")
	listNotificationTriggers(function(err, notificationTriggers) {
		if (err) {
			routeUtils.handleAPIError(req, res, err, err)
		} else {
			routeUtils.handleAPISuccess(req, res, notificationTriggers)
		}
	})
}

function listAll(req, res) {
	utils.l.d("NotificationTrigger list all request")
	listAllNotificationTriggers(function(err, notificationTriggers) {
		if (err) {
			routeUtils.handleAPIError(req, res, err, err)
		} else {
			routeUtils.handleAPISuccess(req, res, notificationTriggers)
		}
	})
}

function listById(req, res) {
	utils.l.d("Get notificationTrigger by id request" + JSON.stringify(req.body))
	listNotificationTriggerById(req.body, function(err, notificationTrigger) {
		if (err) {
			routeUtils.handleAPIError(req, res, err, err)
		} else {
			routeUtils.handleAPISuccess(req, res, notificationTrigger)
		}
	})
}

function update(req, res) {
	utils.l.d("Update notificationTrigger request" + JSON.stringify(req.body))
	updateNotificationTrigger(req.body, function(err, notificationTrigger) {
		if (err) {
			routeUtils.handleAPIError(req, res, err, err)
		} else {
			routeUtils.handleAPISuccess(req, res, notificationTrigger)
		}
	})
}

function createNotificationTrigger(data, callback) {
	models.notificationTrigger.createNotificationTrigger(data, callback)
}

function listNotificationTriggers(callback) {
	models.notificationTrigger.listNotificationTriggers(callback)
}

function listAllNotificationTriggers(callback) {
	models.notificationTrigger.listAllNotificationTriggers(callback)
}

function listNotificationTriggerById(data, callback) {
	models.notificationTrigger.listNotificationTriggerById(data, callback)
}

function updateNotificationTrigger(data, callback) {
	models.notificationTrigger.updateNotificationTrigger(data, callback)
}

routeUtils.rPost(router, '/create', 'create', create)
routeUtils.rGet(router, '/list', 'list', list)
routeUtils.rGet(router, '/listAll', 'listAll', listAll)
routeUtils.rPost(router, '/listById', 'listById', listById)
routeUtils.rPost(router, '/update', 'update', update)
module.exports = router