var utils = require('../utils')
var mongoose = require('mongoose')
var helpers = require('../helpers')

// Activity Schema
var activitySchema = require('./schema/activitySchema')

// Model initialization
var Activity = mongoose.model('Activity', activitySchema.schema)

function getByQuery(query, callback) {
	Activity
		.find(query)
		.exec(callback)
}

function getByQueryAndSort(query, sort, callback) {
	Activity
			.find(query)
			.sort(sort)
			.exec(callback)
}

function createActivity(data, callback) {
	var activityObj = new Activity(data)
	utils.async.waterfall([
		function (callback) {
			Activity.findOne({ aType: data.aType, aSubType: data.aSubType, aCheckpoint: data.aCheckpoint,
				aDifficulty: data.aDifficulty, aLevel: data.aLevel, tag: data.tag}, callback)
		},
		function (activity, callback) {
			if (!activity) {
				utils.l.d("no activity found, saving activity")
				activityObj.save(callback)
			} else {
				utils.l.d("found activity: " + activity)
				return callback(null, activity)
			}
		}
	], callback)
}

function listActivities(activityType, includeTags, callback) {
	getByQueryAndSort(constructFindActivityQuery(activityType,includeTags),{tag:"ascending"}, callback)
}

function listAdActivities(callback) {
	getByQuery({isActive: {$ne: false}, "adCard.isAdCard": true}, callback)
}

function listAllActivities(callback) {
	getByQuery({}, callback)
}

function listActivityById(data, callback) {
	utils.async.waterfall([
		function (callback) {
			Activity.findOne({_id: data.id}, callback)
		},
		function(activity, callback) {
			if (!activity) {
				utils.l.d("no activity found")
				return callback({error: "activity with this id does not exist"}, null)
			} else {
				utils.l.d("found activity: " + JSON.stringify(activity))
				return callback(null, activity)
			}
		}
	], callback)
}

function updateActivity(data, callback) {
	utils.async.waterfall([
		function (callback) {
			Activity.findOne({_id: data.id}, callback)
		},
		function(activity, callback) {
			if (!activity) {
				utils.l.d("no activity found")
				return callback({ error: "activity with this id does not exist" }, null)
			} else {
				utils.l.d("found activity: " + JSON.stringify(activity))
				utils._.extend(activity, data)
				activity.save(callback)
			}
		}
	], callback)
}

function deleteActivity(query, callback) {
	Activity.findOneAndRemove(query, function (err, deletedActivity) {
		if(err) {
			return callback({error: "Something went wrong while deleting this activity"}, null)
		} else if(utils._.isInvalidOrBlank(deletedActivity)) {
			return callback({error: "Activity with this id does not exist"}, null)
		} else {
			return callback(null , deletedActivity)
		}
	})
}

function constructFindActivityQuery(activityType,includeTags) {
	var query = {
		isActive : {$ne: false}
	}
	if(activityType) {
		if(activityType == "Featured")
			query.isFeatured = true
		else
			query.aType = activityType
	}

	includeTags = includeTags && (includeTags==true || includeTags=="true") ?true:false
	if(!includeTags){
		query.tag=""
	}
	return query
}

module.exports = {
	model: Activity,
	getByQuery: getByQuery,
	createActivity: createActivity,
	listActivities: listActivities,
	listAdActivities: listAdActivities,
	listAllActivities: listAllActivities,
	listActivityById: listActivityById,
	updateActivity: updateActivity,
	deleteActivity: deleteActivity
}