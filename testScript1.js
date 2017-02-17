var express = require('express')
var router = express.Router()
var utils = require('./app/utils')
var helpers = require('./app/helpers')
var fs = require('fs')

var command = process.argv[2]

switch(command) {
  case "dmaTest":
    var dmaJson = require('/Users/dasasr/projects/ketsci/docs/dmaByRegion.json')
    var dmaJsonByState = utils._.groupBy(dmaJson,"State")
    //utils.l.d('dmaJsonByState',dmaJsonByState)
    fs.writeFileSync('/Users/dasasr/projects/ketsci/docs/dmaByRegionState.json',JSON.stringify(dmaJsonByState,null,'  '))
    break;
  case 'htmlTest':
    var ejs = require('ejs')
    var htmlData = fs.readFileSync('app/views/account/welcomeEmail.ejs','utf8')

    var ejs_string = htmlData,
        template = ejs.compile(ejs_string),
        html = template({userName:"Crossroads"});
        utils.l.d("html",html)
    helpers.ses.sendEmail(['sreeharsha.dasa@forcecatalyst.com','suraj@forcecatalyst.com'], utils.constants.SES_EMAIL_SENDER, "test mail",
      html, function(err, response) {
        utils.l.d("response",response)
      })
    break;
  default:
    break;
}