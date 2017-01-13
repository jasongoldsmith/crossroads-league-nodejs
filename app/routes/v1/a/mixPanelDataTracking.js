var express = require('express')
var router = express.Router()
var routeUtils = require('./../../routeUtils')
var utils = require('../../../utils')
var service = require('../../../service')

function track(req, res) {
	utils.l.d("data track request: " + JSON.stringify(req.body))
	service.trackingService.trackData(req, function(err, result) {
		if (err) {
			routeUtils.handleAPIError(req, res, err, err,{utm_dnt:"track"})
		} else {
			routeUtils.handleAPISuccess(req, res, result,{utm_dnt:"track"})
		}
	})
}

routeUtils.rPost(router, '/track', 'track', track,track,{utm_dnt:"track"})
module.exports = router