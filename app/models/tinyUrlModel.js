var utils = require('../utils')
var mongoose = require('mongoose')
var crypto = require('crypto')

// tiny URL Schema
var TinyUrlSchema = require('./schema/tinyUrlSchema')

// Model initialization
var TinyUrl = mongoose.model('TinyUrl', TinyUrlSchema.schema)

function createTinyUrl(longUrlValue, callback) {
	utils.async.waterfall([
		function(callback) {
			TinyUrl.findOne({longUrlValue: longUrlValue}, callback)
		},
		function(doesUrlAlreadyExist, callback) {
			if(doesUrlAlreadyExist) {
				return callback({error: "tiny URL already exists for this long URL"}, null)
			}
			generateTinyUrl(longUrlValue, callback)
		},
		function(tinyUrlKey, callback) {
			var tinyUrlObj = new TinyUrl({
				tinyUrlKey: tinyUrlKey,
				longUrlValue: longUrlValue
			})
			tinyUrlObj.save(callback)
		}
	], function (err, tinyUrl) {
		if(err) {
			return callback(err, null)
		}
		if(!tinyUrl) {
			return callback({error: "There was some error while saving tiny URL"}, null)
		} else {
			return callback(null, tinyUrl.tinyUrlKey)
		}
	})
}

function getLongUrl(tinyUrlKey, callback) {
	TinyUrl.findOne({tinyUrlKey: tinyUrlKey}, function (err, tinyUrl) {
		if(err) {
			return callback(err, null)
		}
		if(!tinyUrl) {
			return callback({error: "This tiny URL is invalid"}, null)
		} else {
			return callback(null, tinyUrl.longUrlValue)
		}
	})
}

function generateTinyUrl(longUrl, callback) {
	var md5sum = crypto.createHash('md5')
	md5sum.update(Date.now().toString())
	var hash = md5sum.digest('hex').substring(0, 8)
	TinyUrl.findOne({tinyUrlKey: hash}, function (err, tinyUrl) {
		if(err) {
			return callback(err, null)
		}
		if(!tinyUrl) {
			return callback(null, hash)
		} else {
			generateTinyUrl(longUrl, callback)
		}
	})
}

module.exports = {
	model: TinyUrl,
	createTinyUrl: createTinyUrl,
	getLongUrl: getLongUrl
}