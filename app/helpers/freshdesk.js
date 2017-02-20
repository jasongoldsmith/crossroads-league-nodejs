// Internal modules
var utils = require('../utils')

// External modules
var config = require("config")
var freshdeskAPI = require('node-freshdesk')


var API_KEY = utils.config.freshdeskAPIKey
var freshdesk = new freshdeskAPI(
  'https://crossroadsapp.freshdesk.com',
  API_KEY)

function postTicket(email, subject, description, platform, osVersion, callback) {
  var ticket = {
    'helpdesk_ticket': {
      'description': description,
      'subject': subject,
      'email': email,
      "custom_field": {
        "game_389511": "League of Legends",
        "platform_389511": platform,
        "operating_system_version_389511": osVersion
      },
    }
  }
  freshdesk.postTicket(
    ticket,
    function(err, res, body) {
      if (err) {
        utils.l.s('Freshdesk postTicket err: ', err)
        var error = utils.errors.formErrorObject(utils.errors.errorTypes.report, utils.errors.errorCodes.internalServerError)
        return callback(error, null)
      }
      else {
        utils.l.d('Freshdesk postTicket success response: ', body)
        return callback(null, body)
      }
    }
  )
}


module.exports = {
  postTicket: postTicket
}