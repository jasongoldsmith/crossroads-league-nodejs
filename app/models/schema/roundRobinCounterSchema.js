var mongoose = require('mongoose')
var Schema = mongoose.Schema

var roundRobinCounterSchema = new Schema({
	name: {type: String, default: "RoundRobinCounter"},
	value: { type: Number, default: 0 }
})

module.exports = {
	schema: roundRobinCounterSchema
}

