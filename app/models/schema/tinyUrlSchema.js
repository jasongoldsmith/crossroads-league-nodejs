var mongoose = require('mongoose')
var Schema = mongoose.Schema

var tinyUrlSchema = new Schema({
	tinyUrlKey: {type: String, required: true},
	longUrlValue: {type: String, required: true}
})

tinyUrlSchema.index({'tinyUrlKey': 1}, {'unique': true})

module.exports = {
	schema: tinyUrlSchema
}