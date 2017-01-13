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
  default:
    break;
}