var mongoose = require('mongoose')
var Schema = mongoose.Schema

var notificationSchema = new Schema({
	name: {type : String, required : true},
	messageTemplate: {type : String, required : true},
	recipientType: {type : String, required : true,
		enum: ['creator', 'eventMembers', 'eventMembersNotCreator', 'clanNotEventMembers', 'clan', 'knownUsers']},
	isActive: { type: Boolean, default: true}
})

module.exports = {
	schema: notificationSchema
}
