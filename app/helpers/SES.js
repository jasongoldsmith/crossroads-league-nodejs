var AWS = require('aws-sdk');
var utils = require('../utils')

AWS.config.update(utils.config.awsKey)
var ses = new AWS.SES()

function sendEmail(to, from, subject, body, callback) {
  ses.sendEmail({
    Source: from,
    Destination: {ToAddresses: to},
    Message: {
      Subject: {
        Data: subject
      },
      Body: {
        Text: {
          Data: body
        }
      }
    }
  },
    function(err, response) {
      if(err) {
        utils.l.s("Unable to send email", err)
        return callback({error: "Something went wrong. Please try again later"}, null)
      } else {
        utils.l.d('Email sent:', response)
        return callback(err, response)
      }
  })
}

module.exports = {
  sendEmail: sendEmail
}