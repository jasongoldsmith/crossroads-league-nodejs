var utils = require('../utils')
var mongoose = require('mongoose')
var helpers = require('../helpers')

// Activity Schema
var archiveEventSchema = require('./schema/archiveEventSchema')

// Model initialization
var archiveEvent = mongoose.model('ArchiveEvent', archiveEventSchema.schema)

function createArchiveEvent(data, callback) {
	var archiveEventObj = new archiveEvent(data)
	archiveEventObj.save(callback)
}

module.exports = {
	model: archiveEvent,
	createArchiveEvent: createArchiveEvent
}