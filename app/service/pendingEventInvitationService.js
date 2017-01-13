var models = require('../models')
var utils =require('../utils')
function createPendingInvitation(data, callback) {
  models.pendingEventInvitation.create(data, callback)
}

function removePendingEventInvitation(data, callback) {

  if(data.gatewayResponse.ErrorStatus && data.gatewayResponse.ErrorStatus.toLowerCase() == "success") {
    models.pendingEventInvitation.findOneAndRemove({_id: data.responseParams.pendingEventInvitationId}, callback)
  } else {
    utils.l.i("Unable to remove the pending Event Invitation", data)
    return callback(null, null)
  }

}

function listPendingEventInvitationsForInviter(inviterId, callback) {
  models.pendingEventInvitation.getByQueryLean({inviter: inviterId}, callback)
}

module.exports = {
  createPendingInvitation: createPendingInvitation,
  removePendingEventInvitation: removePendingEventInvitation,
  listPendingEventInvitationsForInviter: listPendingEventInvitationsForInviter
}