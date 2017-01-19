var express = require('express')
var router = express.Router()
var config = require('config')
var utils = require('../../utils')
var helpers = require('../../helpers')
var routeUtils = require('../routeUtils')
var models = require('../../models')

function create(req, res) {
  var body = req.body
  utils.l.d("Group create request: " + JSON.stringify(body))
  createGroup(body.groupId, utils.constants.LoLRegions[body.groupId],
    utils.constants.serviceTypes.PUSHNOTIFICATION, utils.constants.consoleTypes.PC, function(err, group) {
    if (err) {
      routeUtils.handleAPIError(req, res, err, err)
    } else {
      routeUtils.handleAPISuccess(req, res, group)
    }
  })
}

function list(req, res) {
  utils.l.d("Groups list request")
  listGroups(function(err, groups) {
    if (err) {
      routeUtils.handleAPIError(req, res, err, err)
    } else {
      routeUtils.handleAPISuccess(req, res, groups)
    }
  })
}

function createGroup(groupId, groupName, serviceType, consoleType, callback) {
  models.groups.createGroup(groupId, groupName, serviceType, consoleType, callback)
}

function listGroups(callback) {
  models.groups.listGroups(callback)
}

routeUtils.rPost(router, '/create', 'createGroup', create)
routeUtils.rGet(router, '/list', 'listGroups', list)
module.exports = router