var utils = require('../utils')
var mongoose = require('mongoose')
var roundRobinCounterSchema = require('./schema/roundRobinCounterSchema')

// Model initialization
var RoundRobinCounter = mongoose.model('RoundRobinCounter', roundRobinCounterSchema.schema)

function getValue(callback) {
	RoundRobinCounter
		.findOne({name: "RoundRobinCounter"})
		.exec(function (err, roundRobinCounter) {
			if(err) {
				utils.l.s("unable to get roundRobinCounter", err)
				return callback(null, 0)
			} else if(utils._.isInvalidOrBlank(roundRobinCounter)) {
				utils.l.d("no value found for roundRobinCounter")
				return callback(err, 0)
			}
			else {
				return callback(err, roundRobinCounter.value)
			}
		})
}

function incrementCounter(callback) {
	RoundRobinCounter.findOneAndUpdate({name: "RoundRobinCounter"}, {$inc: {value: 1}, upsert: true}, function (err, roundRobinCounterValue) {
		return callback(null, roundRobinCounterValue)
	})
}

module.exports = {
	model: RoundRobinCounter,
	getValue: getValue,
	incrementCounter: incrementCounter
}