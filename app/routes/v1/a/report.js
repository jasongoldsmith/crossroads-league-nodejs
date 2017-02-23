var express = require('express')
var router = express.Router()
var routeUtils = require('./../../routeUtils')
var service = require('../../../service/index')
var utils = require('../../../utils/index')

function createReport(req, res) {
    utils.l.i("Report create request: " + JSON.stringify(req.body))

    var email = req.isAuthenticated() ? req.user.userName : req.body.reporterEmail
    if(utils._.isInvalidOrEmpty(req.body.reportDetails) || utils._.isInvalidOrEmpty(email)) {
        var err = utils.errors.formErrorObject(utils.errors.errorTypes.report, utils.errors.errorCodes.missingFields)
        routeUtils.handleAPIError(req, res, err, err)
        return
    }
    var subject = "League of Legends Contact Us"

    service.reportService.createReport(email, subject, req.body.reportDetails, req.adata['$os'],
      req.adata['$os_version'], function(err, report) {
        if (err) {
            routeUtils.handleAPIError(req, res, err, err)
        } else {
            routeUtils.handleAPISuccess(req, res, report)
        }
    })
}

function resolveReport(req,res){
    service.reportService.resolveReport(req.body, function(err, report) {
        if (err) {
            routeUtils.handleAPIError(req, res, err, err)
        } else {
            routeUtils.handleAPISuccess(req, res, report)
        }
    })
}

function listReport(req,res){
    service.reportService.listReport(req.param("status"), function(err, reportList) {
        if (err) {
            routeUtils.handleAPIError(req, res, err, err)
        } else {
            routeUtils.handleAPISuccess(req, res, reportList)
        }
    })
}

routeUtils.rPost(router, '/create', 'createReport', createReport)
routeUtils.rPost(router, '/resolve', 'resolveReport', resolveReport)
routeUtils.rGet(router, '/list', 'listReport', listReport)
module.exports = router