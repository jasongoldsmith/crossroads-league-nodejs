var express = require('express')
var router = express.Router()
var utils = require('../../utils')
var routeUtils = require('../routeUtils')
var service = require('../../service')

function handleGatewayResponse(req, res) {
  utils.l.d("handleGatewayResponse request: " + JSON.stringify(req.body))
  var body = req.body

  if(!body.responseType || !body.gatewayResponse || !body.responseParams) {
    utils.l.i("Bad handleGatewayResponse request")
    var err = {error: "Something went wrong."}
    routeUtils.handleAPIError(req, res, err, err)
    return
  }

  service.pendingEventInvitationService.removePendingEventInvitation(body, function (err, deletedPendingEventInvitation) {})
  routeUtils.handleAPISuccess(req, res, {success: "true"})
}

routeUtils.rPost(router, '/', 'handleGatewayResponse', handleGatewayResponse)
module.exports = router