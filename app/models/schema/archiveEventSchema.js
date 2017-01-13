var mongoose = require('mongoose')
var Schema = mongoose.Schema
var idValidator = require('mongoose-id-validator')

var archiveEventSchema = new Schema({
	eType: { type: Schema.Types.ObjectId, ref: 'Activity', required: true },
	status: { type: String, enum: ['new', 'open', 'full', 'can_join']},
	minPlayers: { type : Number, required : true },
	maxPlayers: { type : Number, required : true },
	creator: { type: Schema.Types.ObjectId, ref: 'User', required: true },
	players: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
	created: { type: Date, default: Date.now },
	updated: { type: Date, default: Date.now },
	launchDate: { type: Date, default: Date.now }
})

archiveEventSchema.index({'eType': 1})

module.exports = {
	schema: archiveEventSchema
}

archiveEventSchema.plugin(idValidator)