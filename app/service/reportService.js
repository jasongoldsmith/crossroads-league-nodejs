var utils = require('../utils')
var models = require('../models')
var helpers = require('../helpers')

function resolveReport(data,callback){
  models.report.resolveReport(data,callback)
}

function createReport(email, subject, description, platform, osVersion, callback) {
  models.report.createReport(email, description, function (err, response) {
    if(err) {
      utils.l.d("save report in db err", err)
    } else {
      utils.l.d("save report in db response", response)
    }
  })
  helpers.freshdesk.postTicket(email, subject, description, platform, osVersion, callback)
}

function listReport(status, callback){
  models.report.getByQuery({reportStatus: {$in : getStatusFilter(status)}},callback)
}

function getStatusFilter(status){

  if(status == null || !isValidStatus(status) || status.toLowerCase() == "all"){
    status="All"
  }else if(status != null && isValidStatus(status)){
    status = utils._.get(utils.constants.reportListStatus, status.toLowerCase())
  }
  return status
}

function isValidStatus(status){
  return utils._.has(utils.constants.reportListStatus,status.toLowerCase())
}

module.exports = {
  createReport: createReport,
  resolveReport: resolveReport,
  listReport: listReport

}