var models = require('../models')
var utils = require('../utils')

function createUserGroup(user, groupId, consoleType, muteNotification, callback) {
  models.userGroup.createUserGroup(user, groupId, consoleType, muteNotification, callback)
}

module.exports = {
  createUserGroup: createUserGroup
}