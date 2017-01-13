var express = require('express')
var router = express.Router()
var routeUtils = require('./../../routeUtils')
var utils = require('../../../utils')
var models = require('../../../models')
var helpers = require('../../../helpers')
var service = require('../../../service')

function getFeed(req, res) {
	utils.l.d("Get feed request for user: " + JSON.stringify(req.user)
		+ " with console type: " + req.param('consoleType'))
	service.feedService.getFeed(req.user, req.param('consoleType'), false, req.param('myEvents'), function(err, feed) {
		if (err) {
			routeUtils.handleAPIError(req, res, err, err, {utm_dnt:"feed"})
		} else {
			routeUtils.handleAPISuccess(req, res, feed, {utm_dnt:"feed"})
		}
	})
}

function publicFeed(req, res) {
	service.feedService.getFeed(null, null, true, false, function(err, feed) {
		if (err) {
			routeUtils.handleAPIError(req, res, err, err, {utm_dnt:"feed"})
		} else {
			routeUtils.handleAPISuccess(req, res, feed, {utm_dnt:"feed"})
		}
	})
}

routeUtils.rGet(router, '/get', 'getFeed', getFeed, {utm_dnt:"feed"})
routeUtils.rGet(router, '/public', 'publicFeed', publicFeed, {utm_dnt:"publicFeed"})
module.exports = router