#!/usr/bin/env node

var express = require('express')
var router = express.Router()
var jobs = require('./jobs')
var utils = require('./app/utils')
var helpers = require('./app/helpers')
var models = require('./app/models')
var schedule = require('node-schedule');

var hashPassword = "hashPassword"
var deleteOldFullEvents = "deleteOldFullEvents"
var deleteOldStaleEvents = "deleteOldStaleEvents"
var upcomingEventsReminder = "upcomingEventsReminder"
var eventFullReminder = "eventFullReminder"
var eventStartReminder = "eventStartReminder"
var dailyOneTimeReminder = "dailyOneTimeReminder"
var eventUpcomingReminder = "eventUpcomingReminder"

var destinyService = require('./app/service/destinyInterface')
var authService = require('./app/service/authService')
var notifService = require('./app/service/eventNotificationService')

var command = process.argv[2]
var event ='{'+
  '"_id": "572ce86427efb203002ea3f6",'+
  '"status": "can_join",'+
  '"creator":'+
  '{ "_id": "572ce20e27efb203002ea3d9",'+
  '"date": "Fri May 06 2016 18:27:26 GMT+0000 (UTC)",'+
  '"uDate": "Fri May 06 2016 18:30:33 GMT+0000 (UTC)",'+
  '"userName": "unteins"'+
  '},'+
  '"eType":'+
  '{ "_id": "56c647568162210300101953",'+
  '"aType": "Raid"},'+
  '"maxPlayers": "6",'+
  '"updated": "Fri May 06 2016 19:13:11 GMT+0000 (UTC)",'+
  '"created": "Fri May 06 2016 18:54:28 GMT+0000 (UTC)",'+
  '"players":'+
  '[ { "_id": "572ce20e27efb203002ea3d9",'+
  '"date": "Fri May 06 2016 18:27:26 GMT+0000 (UTC)",'+
  '"uDate": "Fri May 06 2016 18:30:33 GMT+0000 (UTC)",'+
  '"userName": "unteins"'+
  '},'+
  '{ "_id": "572ce20e27efb20307745666",'+
  '"date": "Fri May 06 2016 18:27:26 GMT+0000 (UTC)",'+
  '"uDate": "Fri May 06 2016 18:30:33 GMT+0000 (UTC)",'+
  '"userName": "unteins"'+
  '}'+
  '],'+
  '"launchStatus": "now"'+
  '}'


switch(command) {
  case hashPassword:
    jobs.updatePassWord()
    break
  case deleteOldFullEvents:
    jobs.deleteOldFullEvents()
    break
  case deleteOldStaleEvents:
    jobs.deleteOldStaleEvents()
    break
  case upcomingEventsReminder:
    jobs.upcomingEventsReminder()
    break
  case eventFullReminder:
    jobs.eventFullReminder()
    break
  case eventStartReminder:
    jobs.eventStartReminder()
    break
  case dailyOneTimeReminder:
    jobs.dailyOneTimeReminder()
    break
  case eventUpcomingReminder:
    jobs.eventUpcomingReminder()
    break
  case "helmetsFinder":
    jobs.helmetsFinder()
    break
  case "eventExpiry":
    jobs.eventExpiry()
    break
  case "userTimeout":
    jobs.userTimeout()
    break
  case "preUserTimeout":
    jobs.preUserTimeout()
    break
  case "createLoadTestUsers":
    jobs.createLoadTestUsers()
    break
  case "eventBasedNotifications":
    jobs.eventBasedNotifications()
    break
  case "bulkHelmetUpdate":
    jobs.bulkHelmetUpdate()
    break
  case "mergeDuplicateEvents":
    jobs.mergeDuplicateEvents()
    break
  case "bulkUserGroupUpdate":
    jobs.bulkUserGroupUpdate()
    break
  case "groupStatsUpdate":
    jobs.groupStatsUpdate()
    break
  case "addSysConfig":
    models.sysConfig.createSysConfig({key:'eventExpiryTimeInMins',description:'Time to expire events. Use - value.',value:'-40'},function(err,sysconf){
      console.log('addSysConfig::err::'+err)
      console.log('addSysConfig::sysconf::'+JSON.stringify(sysconf))
    })
  case "momentTest":
    var date = new Date()
    date.setHours(0,0,0,0)
    var date1 =  utils.moment(date).utc().format()
    console.log("date1:"+date1)
    var date2 = utils.moment(date).utc().add(24,"hours").format()
    console.log("date2::"+date2)
    //console.log("date1::"+date1.year()+"-"+date1.month()+"-"+date1.day())
    console.log("time: "+utils.moment().add(-utils.config.triggerIntervalMinutes,"minutes").format())

    var now = utils.moment().utc()
    var then = utils.moment().utc().add(48 , "hours")
    console.log("time difference :"+utils.moment.duration(now.diff(then)).humanize())

    console.log("date of month::"+then.date())
    break;
  case "bugieMembership":
    var response = destinyService.getBungieMemberShip("kaeden2010")
    console.log("final response="+response) //13172709 //sreeharshadasa //12269331
    break;
  case "bungieMsg1":
    console.log(destinyService.sendBungieMessage("kaeden2010"))
    break;
  case "bungieGroups":
    destinyService.listBungieGroupsJoined(12269331,null,1,function(err,groups,callback){
      console.log("Got group::"+groups)
      console.log("ANy group error::"+err)
    })
  case "uuid":
    var listInt = [1,2,3,4,5,6,7,8,9,10]

    utils.async.map(listInt, function(item) {
      console.log("token::"+helpers.uuid.getRandomUUID())
    },function(){
    })
    break;
  case 'scheduleTst':
    var j = schedule.scheduleJob("test schedule123",'0 43 16 * * *',function(){
      console.log("executing job @"+new Date())
    })
    console.log("job name="+ j.name)
    break;
  case 'groupTest':
    var events = [{id:1,creator:{name:"h",msg:'hi'}},{id:2,creator:{name:"b",msg:'hi'}},{id:3,creator:{name:"h",msg:'hi'}},{id:4,creator:{name:"h",msg:'hi'}}]
    var eventsByName = utils._.countBy(events,'creator.name')
    for(var attributename in eventsByName){
      console.log(attributename+": "+eventsByName[attributename]);
    }
    break;
  case 'arrayTest':
    models.event.getByQuery({_id:"572ad94e2cc2139d75c6afd8"},null,function(err, event){
      if(event){
        console.log("event:"+event)
        var jsonEvt = JSON.parse(JSON.stringify(event))
        console.log("status::"+jsonEvt.launchDate)
        console.log("finding::"+utils._.has(event.notifStatus,"EventLf1mNotification"))
      }
    })
    break
  case "omitTest":
    var deleteKey = require('key-del')
    console.log("event"+event)
    var jsonEvent = JSON.parse(event)
    delete jsonEvent.creator.date
    utils._.map(jsonEvent.players,function(player){
      //console.log(utils._.omit(player,['date','uDate']))
      delete player.date
    })


    console.log("jsonEvent"+JSON.stringify(jsonEvent))
    var updatedEvent = deleteKey(jsonEvent,['creator.date','creator.uDate','creator.psnVerified','notifStatus','updated','created','players[date]','players[uDate]','players.psnVerified'])
    console.log("\n\nupdatedEvent"+JSON.stringify(updatedEvent))
    var updatedPlyers = utils._.map(updatedEvent.players,function(player){
      console.log(utils._.omit(player,['date','uDate']))
     return utils._.omit(player,['date','uDate'])
    })
    console.log("updatedPlyers::"+updatedPlyers)
    updatedEvent.players=updatedPlyers
    console.log("updatedEventAndPlayers"+JSON.stringify(updatedEvent))
/*
    utils._.remove(jsonEvent,function(o){
      if(utils._.has(jsonEvent.keys,['creator.date','creator.uDate','creator.psnVerified','notifStatus','updated','created','players[date]','players[uDate]','psnVerified'])) return true
    })
*/
    console.log("jsonEvent::removed"+JSON.stringify(jsonEvent))

    break
  case "pullTest":
    var jsonEvent = JSON.parse(event)
    var players = utils._.map(jsonEvent.players,function(player){
      return {"_id":player._id,"uDate":player.uDate}
    })
    console.log("event::"+JSON.stringify(players))

    console.log("players::get"+JSON.stringify(utils._.map(jsonEvent.players,{_id:'_id',uDate:'uDate'})))
  case "mergeTest":
    var data = {userName:"harsha",groups:[{groupId:123,name:"g123"},{groupId:456,name:"g456"}]}
    var data1 = [{groupId:123},{groupId:789}]
    var keys = utils._.map(data,'groupId')
    console.log("keys"+keys)
      console.log(utils._.unionWith(data,data1,function(dataVal,data1Val){
        return (dataVal.groupId == data1Val.groupId)
      }))

    var data2 = ["123","789"]
    utils._.map(data2,function(groupId){
      if(!utils._.find(data,{groupId:groupId})) data.groups.push({groupId:groupId,groupName:"g"+groupId})
    })

    utils.l.d("data::",data)
    break;
  case "groupPullTest":
    notifService.getClanMembers(null,"1184379",function(err,users){
      utils.l.d("users",users)
      utils.l.d("err",err)
    })
  default:
    break;
}