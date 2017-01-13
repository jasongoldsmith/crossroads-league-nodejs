var express = require('express')
var router = express.Router()
var utils = require('../../utils')
var routeUtils = require('../routeUtils')
var models = require('../../models')

function listConfigs(req, res) {
  utils.l.d("listConfigs request: " + JSON.stringify(req.headers["config_token"]))
  if(!req.headers["config_token"]) {
    utils.l.i("config_token missing in headers")
    routeUtils.handleAPIUnauthorized(req, res)
    return
  }

  utils.async.waterfall([
    function(callback) {
      models.sysConfig.getSysConfig('CONFIG_TOKEN', callback)
    },
    function(configToken, callback) {
      if(utils._.isInvalidOrBlank(configToken)
        || req.headers["config_token"] != configToken.value.toString()) {
        utils.l.s("The config token key did not match or is not present in the db", configToken)
        return callback({error: "Something went wrong. Please try again later"}, null)
      }

      getBungieUrls(callback)
    },
    function(bungieUrls, callback) {
      var configs = {
        mixpanelToken: utils.config.mixpanelKey,
        playerDetailsURL: bungieUrls.value.playerDetailsURL,
        xboxLoginURL: bungieUrls.value.xboxLoginURL,
        psnLoginURL: bungieUrls.value.psnLoginURL
      }

      return callback(null, configs)
    }
  ],
  function(err, configs) {
    if(err) {
      routeUtils.handleAPIUnauthorized(req, res)
    } else {
      routeUtils.handleAPISuccess(req, res, configs)
    }
  })
}

function getBungieUrls(callback) {
  models.sysConfig.getSysConfig('bungieUrls', callback)
}

routeUtils.rGet(router, '/', 'listConfigs', listConfigs)

module.exports = router