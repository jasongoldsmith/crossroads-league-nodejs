var utils = require('../utils')
var mongoose = require('mongoose')
var helpers = require('../helpers')

// Temporary User Schema
var temporaryUserSchema = require('./schema/temporaryUserSchema')

// Model initialization
var TemporaryUser = mongoose.model('TemporaryUser', temporaryUserSchema.schema)

function create(data, callback) {
	var temporaryUserObj = new TemporaryUser(data)
	utils.async.waterfall([
		function (callback) {
			TemporaryUser.findOne({mpDistinctId: data.mpDistinctId}, callback)
		},
		function (temporaryUser, callback) {
			if (!temporaryUser) {
				utils.l.d("no temporaryUser found, saving temporaryUser")
				temporaryUserObj.save(callback)
			} else {
				utils.l.d("found temporaryUser: " + temporaryUser)
				return callback(null, temporaryUser)
			}
		}
	], callback)
}

function update(temporaryUser, callback) {
	TemporaryUser.findOneAndUpdate({mpDistinctId: temporaryUser.mpDistinctId}, {$set: temporaryUser}, callback)
}

function find(mpDistinctId, callback) {
	TemporaryUser.findOne({mpDistinctId: mpDistinctId}, callback)
}

module.exports = {
	model: TemporaryUser,
	create: create,
	update: update,
	find: find
}