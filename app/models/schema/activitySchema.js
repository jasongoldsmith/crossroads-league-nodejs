var mongoose = require('mongoose')
var Schema = mongoose.Schema

var activitySchema = new Schema({
	aType: {type: String, required: true},
	aSubType: String,
	aCheckpoint: String,
	aCheckpointOrder: Number,
	aDifficulty: String,
	tag: String,
	aDisplayName: String,
	aDescription:String,
	aStory:String,
	aModifiers: [{
		aModifierName: String,
		aModifierInfo: String,
		aModifierIconUrl: String,
		isActive: Boolean
	}],
	aBonus:[{
		aBonusName: String,
		aBonusInfo: String,
		aBonusIconUrl: String,
		isActive: Boolean
	}],
	aLocation : {
		aDirectorLocation: String,
		aSubLocation: String,
	},
	aLight: Number,
	aLevel: Number,
	aIconUrl: String,
	isActive: {type: Boolean, default: true},
	isFeatured: {type: Boolean, default: false},
	adCard: {
		isAdCard: {type: Boolean, default: false},
		adCardBaseUrl: String,
		adCardImagePath: String,
		adCardHeader: String,
		adCardSubHeader: String
	},
	aImage: {
		aImageBaseUrl: String,
		aImageImagePath: String
	},
	aCardOrder:{type: Number},
	aFeedMode:String,
	minPlayers: {type : Number, required : true},
	maxPlayers: {type : Number, required : true},
	aTypeDefault:{type: Boolean, default: false}
})

activitySchema.index({'aType': 1})
activitySchema.index({'aType': 1,'tag':1,'isFeatured':1})
activitySchema.index({'adCard.isAdCard': 1})
activitySchema.index({'isActive':1,'adCard.isAdCard': 1})
activitySchema.index({'isActive':1,'aType': 1,'tag':1,'isFeatured':1})
module.exports = {
	schema: activitySchema
}