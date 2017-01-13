var express = require('express')
var router = express.Router()
var config = require('config')
var utils = require('../../utils')
var helpers = require('../../helpers')
var routeUtils = require('../routeUtils')
var models = require('../../models')

function create(req, res) {
	utils.l.d("Activity create request: " + JSON.stringify(req.body))
	createActivity(req.body, function(err, activity) {
		if (err) {
			routeUtils.handleAPIError(req, res, err, err)
		} else {
			routeUtils.handleAPISuccess(req, res, activity)
		}
	})
}

function list(req, res) {
	var activityType = req.param("aType")
	var includeTags=req.param("includeTags")
	utils.l.d("Activity list request", activityType)
	listActivities(activityType, includeTags,function(err, activities) {
		if (err) {
			routeUtils.handleAPIError(req, res, err, err)
		} else {
			routeUtils.handleAPISuccess(req, res, activities)
		}
	})
}

function listAll(req, res) {
	utils.l.d("Activity list all request")
	listAllActivities(function(err, activities) {
		if (err) {
			routeUtils.handleAPIError(req, res, err, err)
		} else {
			routeUtils.handleAPISuccess(req, res, activities)
		}
	})
}

function listAd(req, res) {
	utils.l.d("Ad Activities list request")
	listAdActivities(function(err, activities) {
		if (err) {
			routeUtils.handleAPIError(req, res, err, err)
		} else {
			routeUtils.handleAPISuccess(req, res, activities)
		}
	})
}

function listById(req, res) {
	utils.l.d("Get activity by id request" + JSON.stringify(req.body))
	listActivityById(req.body, function(err, activity) {
		if (err) {
			routeUtils.handleAPIError(req, res, err, err)
		} else {
			routeUtils.handleAPISuccess(req, res, activity)
		}
	})
}

function update(req, res) {
	utils.l.d("Update activity request" + JSON.stringify(req.body))
	updateActivity(req.body, function(err, activity) {
		if (err) {
			routeUtils.handleAPIError(req, res, err, err)
		} else {
			routeUtils.handleAPISuccess(req, res, activity)
		}
	})
}

function remove(req, res) {
	utils.l.d("Delete activity request" + JSON.stringify(req.body))
	removeActivity(req.body, function(err, deletedActivity) {
		if (err) {
			routeUtils.handleAPIError(req, res, err, err)
		} else {
			routeUtils.handleAPISuccess(req, res, deletedActivity)
		}
	})
}

function createActivity(data, callback) {
	models.activity.createActivity(data, callback)
}

function listActivities(activityType, includeTags,callback) {
	models.activity.listActivities(activityType,includeTags, callback)
}

function listAdActivities(callback) {
	models.activity.listAdActivities(callback)
}

function listAllActivities(callback) {
	models.activity.listAllActivities(callback)
}

function listActivityById(data, callback) {
	models.activity.listActivityById(data, callback)
}

function updateActivity(data, callback) {
	models.activity.updateActivity(data, callback)
}

function removeActivity(data, callback) {
	models.activity.deleteActivity({_id: data.id}, callback)
}

routeUtils.rPost(router, '/create', 'createActivity', create)
routeUtils.rGet(router, '/list', 'listActivity', list)
routeUtils.rGet(router, '/listAd', 'listAdActivities', listAd)
routeUtils.rGet(router, '/listAll', 'listAllActivities', listAll)
routeUtils.rPost(router, '/listById', 'ActivitylistById', listById)
routeUtils.rPost(router, '/update', 'updateActivity', update)
routeUtils.rPost(router, '/delete', 'deleteActivity', remove)
module.exports = router