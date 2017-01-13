var utils = require('../utils')
var mongoose = require('mongoose')
var roundRobinCounterSchema = require('./schema/roundRobinCounterSchema')

// Model initialization
var RoundRobinCounter = mongoose.model('RoundRobinCounter', roundRobinCounterSchema.schema)

function getByQuery(callback) {
	RoundRobinCounter
		.findOne({name: "RoundRobinCounter"})
		.exec(callback)
}

function updateCounter(value, callback) {
	utils.async.waterfall([
			function (callback) {
				getByQuery(callback)
			},
			function(roundRobinCounter, callback) {
				if (!roundRobinCounter) {
					utils.l.i("no value found for roundRobinCounter")
					var roundRobinCounterObj = new RoundRobinCounter({ name: "RoundRobinCounter", value: 0 })
					roundRobinCounterObj.save(callback)
				} else {
					utils.l.i("found roundRobinCounter: " + JSON.stringify(roundRobinCounter))
					roundRobinCounter.value = value
					roundRobinCounter.save(callback)
				}
			}
		], callback)
}

module.exports = {
	model: RoundRobinCounter,
	getByQuery: getByQuery,
	updateCounter: updateCounter
}