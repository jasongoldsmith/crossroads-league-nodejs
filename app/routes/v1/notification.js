var express = require('express')
var router = express.Router()
var config = require('config')
var utils = require('../../utils')
var helpers = require('../../helpers')
var routeUtils = require('../routeUtils')
var models = require('../../models')

function create(req, res) {
	utils.l.d("Notification create request: " + JSON.stringify(req.body))
	createNotification(req.body, function(err, notification) {
		if (err) {
			routeUtils.handleAPIError(req, res, err, err)
		} else {
			routeUtils.handleAPISuccess(req, res, notification)
		}
	})
}

function list(req, res) {
	utils.l.d("Notification list request")
	listNotifications(function(err, notifications) {
		if (err) {
			routeUtils.handleAPIError(req, res, err, err)
		} else {
			routeUtils.handleAPISuccess(req, res, notifications)
		}
	})
}

function listAll(req, res) {
	utils.l.d("Notification list all request")
	listAllNotifications(function(err, notifications) {
		if (err) {
			routeUtils.handleAPIError(req, res, err, err)
		} else {
			routeUtils.handleAPISuccess(req, res, notifications)
		}
	})
}

function listById(req, res) {
	utils.l.d("Get notification by id request" + JSON.stringify(req.body))
	listNotificationById(req.body, function(err, notification) {
		if (err) {
			routeUtils.handleAPIError(req, res, err, err)
		} else {
			routeUtils.handleAPISuccess(req, res, notification)
		}
	})
}

function update(req, res) {
	utils.l.d("Update notification request" + JSON.stringify(req.body))
	updateNotification(req.body, function(err, notification) {
		if (err) {
			routeUtils.handleAPIError(req, res, err, err)
		} else {
			routeUtils.handleAPISuccess(req, res, notification)
		}
	})
}

function createNotification(data, callback) {
	models.notification.createNotification(data, callback)
}

function listNotifications(callback) {
	models.notification.listNotifications(callback)
}

function listAllNotifications(callback) {
	models.notification.listAllNotifications(callback)
}

function listNotificationById(data, callback) {
	models.notification.listNotificationById(data, callback)
}

function updateNotification(data, callback) {
	models.notification.updateNotification(data, callback)
}

routeUtils.rPost(router, '/create', 'create', create)
routeUtils.rGet(router, '/list', 'list', list)
routeUtils.rGet(router, '/listAll', 'listAll', listAll)
routeUtils.rPost(router, '/listById', 'listById', listById)
routeUtils.rPost(router, '/update', 'update', update)
module.exports = router