var utils = require('../utils')
var models = require('../models')

function resolveReport(data,callback){
  models.report.resolveReport(data,callback)
}

function createReport(data, callback) {
  models.report.createReport(data, callback)
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