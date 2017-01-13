var mongoose = require('mongoose');
var utils = require('../utils');

var HelmetTrackerSchema = require('./schema/helmetTrackerSchema');
var HelmetTracker = mongoose.model('HelmetTracker', HelmetTrackerSchema.schema);

function getByQuery(query, callback) {
  HelmetTracker
    .find(query)
    .exec(callback);
}

// Public functions
function createUser(user, error, callback) {
  var helmetTracker = new HelmetTracker({user:user._id,consoles:user.consoles,bungieMembershipId:user.bungieMembershipId,err:error})
  helmetTracker.save(callback)
}

module.exports = {
  model: HelmetTracker,
  createUser:createUser
}
