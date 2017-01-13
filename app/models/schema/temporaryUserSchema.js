var mongoose = require('mongoose')
var Schema = mongoose.Schema

var temporaryUserSchema = new Schema({
	mpDistinctId: String,
	source: String
})

temporaryUserSchema.index({'mpDistinctId': 1})

module.exports = {
	schema: temporaryUserSchema
}