var utils = require('../utils')
var mongoose = require('mongoose')
var helpers = require('../helpers')

// Activity Schema
var reportSchema = require('./schema/reportSchema')

// Model initialization
var Report = mongoose.model('Report', reportSchema.schema)


function getByQuery(query, callback) {
	Report
		.find(query)
		.populate("reporter", "-passWord")
		.exec(callback)
}

function getById(id, callback) {
	if (!id) return callback("Invalid id:" + id)
	getByQuery({'_id':id}, utils.firstInArrayCallback(callback))
}

function createReport(report, callback) {
	var reportObj = new Report(report)
	reportObj.save(function (err, data) {
		if (err) {
			utils.l.s("There was a problem in creating this report", err)
			return callback({error: "Something went wrong in creating this report. Please try again later"}, null)
		} else {
			return callback(null, data)
		}
	})
}

function resolveReport(reportData, callback){
	utils.async.waterfall([
				function(callback) {
					getById(reportData._id, callback)
				},
				function (report, callback) {
					if(!report){
						return callback("Report does not exist. It is either resolved or an invalid report is being updated.",null)
					}
					utils.l.d("Found Report: " + JSON.stringify(report))
					utils._.extend(report, {reportStatus:utils.constants.reportListStatus.resolved, resolveReason:"Resolved by admin"})
					save(report,callback)
				}
			],function(err, updatedReport) {
				if (err) {
					return callback(err, null)
				} else {
					return callback(null, updatedReport)
				}
			}
	)
}

function save(report, callback) {
	utils.async.waterfall([
		function(callback) {
			report.save(function(err, updatedReport, numAffected) {
				if (err) {
					utils.l.s("Got error on saving report", {err: err, offer: report})
				} else if (!updatedReport) {
					utils.l.s("Got null offer on saving chat", {report: report})
				}
				return callback(err, updatedReport);
			});
		}
	], callback)
}

module.exports = {
	model: Report,
	createReport: createReport,
	getById: getById,
	getByQuery: getByQuery,
	resolveReport: resolveReport
}