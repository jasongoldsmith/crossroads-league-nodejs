var express = require('express')
var router = express.Router()
var utils = require('../../utils')
var routeUtils = require('../routeUtils')

function android(req, res) {
	utils.l.d("android appVersion request")
	utils.l.d("android app version: " + utils.config.androidAppVersion)
	routeUtils.handleAPISuccess(req, res, { latestAndroidVersion: utils.config.androidAppVersion },{utm_dnt:"androidAppVersion"})
}

routeUtils.rGet(router, '/android', 'android', android,{utm_dnt:"androidAppVersion"})
module.exports = router