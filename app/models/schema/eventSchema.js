var mongoose = require('mongoose')
var Schema = mongoose.Schema
var idValidator = require('mongoose-id-validator')
var utils = require('../../utils')

var consoleTypeEnum = {
	type: String,
	enum: utils._.values(utils.constants.consoleTypes),
	default: utils.constants.consoleTypes.PC
}

var statusTypeEnum = {
	type: String,
	enum: utils._.values(utils.constants.eventStatusTypes)
}

var launchStatusTypeEnum = {
	type: String,
	enum: utils._.values(utils.constants.eventLaunchStatusTypes),
	default: utils.constants.eventLaunchStatusTypes.now
}

var eventSchema = new Schema({
	eType: { type: Schema.Types.ObjectId, ref: 'Activity', required: true },
	status: statusTypeEnum,
	launchStatus: launchStatusTypeEnum,
	minPlayers: { type : Number, required : true },
	maxPlayers: { type : Number, required : true },
	creator: { type: Schema.Types.ObjectId, ref: 'User', required: true },
	players: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
	created: { type: Date, default: Date.now },
	updated: { type: Date, default: Date.now },
	launchDate: { type: Date, default: Date.now },
	notifStatus:[{type: String}],
	clanId: {type: String},
	clanName: {type: String},
	clanImageUrl: {type: String},
	consoleType: consoleTypeEnum,
	comments: [
		{
			user: {type: Schema.Types.ObjectId, ref: 'User', required: true },
			text: {type: String, required : true},
			created: {type: Date, default: Date.now},
			isReported: {type: Boolean, default: false}
		}
	]
})

eventSchema.index({'eType': 1})
eventSchema.index({'clanId': 1,"consoleType":1})
eventSchema.index({'launchStatus': 1,'launchDate':1})
eventSchema.index({'clanId': 1,"consoleType":1,'launchDate':1})

eventSchema.pre('validate', function(next) {
	if (this.isNew) {
		this.created = new Date()
	}
	this.updated = new Date()

	var size = this.players.length
	if ( size == 1 ) {
		this.status="new"
	} else if ( size < this.minPlayers ) {
		this.status="open"
	} else if ( size >= this.minPlayers && size < this.maxPlayers ) {
		this.status="can_join"
	} else {
		this.status="full"
	}
	next()
})

module.exports = {
	schema: eventSchema
}

eventSchema.plugin(idValidator)