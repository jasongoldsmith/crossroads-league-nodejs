var utils = require('../utils')
var helpers = require('../helpers')
var models = require('../models')
var Converter = require("csvtojson").Converter;

function prepareActivities(activities, mods, adcards, callback){
 // utils.l.d("inside prepareActivities",activities)
  var activitiesResp=[]
  utils._.map(activities, function(a){
   // utils.l.d("activity being created",a)
    var ar = {}
    ar.aType=a.aType
    ar.aSubType=a.aSubType
    ar.aCheckpoint= a.aCheckpoint
    ar.aCheckpointOrder = a.aCheckpointOrder?a.aCheckpointOrder:0
    ar.aDifficulty = a.aDifficulty
    ar.aModifiers = []
    var modifierItems = a.aModifier.toString().split(',')
    var modResp = []
    //loop through modifiers for each modifier
    utils._.map(modifierItems,function(modifier){
      var m = utils._.find(mods,{Type:"aModifier",Name:modifier.trim()})
      if(m) {
        var mResp = {}
        mResp.aModifierName = m.Name
        mResp.aModifierInfo = m.Description
        mResp.aModifierIconURL = m.Icon
        mResp.isActive = true
        modResp.push(mResp)
      }
    })
    ar.aModifiers = modResp

    var bonusLst = a.aBonus.toString().split(',')
    var bonusLstResp = []
    //loop through bonusLst for each bonus
    utils._.map(bonusLst,function(bonus){
      var m = utils._.find(mods,{Type:"aBonus",Name:bonus.trim()})
      if(m) {
        var bResp = {}
        bResp.aBonusName = m.Name
        bResp.aBonusInfo = m.Description
        bResp.aBonusIconURL = m.Icon
        bResp.isActive = true
        bonusLstResp.push(bResp)
      }
    })
    ar.aBonus = bonusLstResp

    var location = {}
    location.aDirectorLocation= a.aDirectorLocation
    location.aSubLocation = a.aSubLocation
    ar.aLocation=location
    ar.aDescription = a.aDescription
    ar.aStory = a.aStory
    ar.aLight= a.aLight ? a.aLight:0
    ar.aLevel= a.aLevel? a.aLevel:0
    ar.aIconUrl= a.aIconURL
    ar.isActive= a.isActive?a.isActive:false
    ar.isFeatured= a.isFeatured?a.isFeatured:false
    var adCard = {}
    //adCard.isAdCard= a.adCard.isAdCard ? a.adCard.isAdCard :false
    adCard.isAdCard= false
    adCard.adCardBaseUrl= a.adCard.adCardBaseUrl
    adCard.adCardImagePath= a.adCard.adCardImagePath
    adCard.adCardHeader= a.adCard.adCardHeader
    adCard.adCardSubHeader= a.adCard.adCardSubHeader
    ar.adCard = adCard
    var img = {}
    img.aImageBaseUrl= a.aBackground.aBackgroundBaseUrl
    img.aImageImagePath= a.aBackground.aBackgroundImagePath
    ar.aImage= img
    ar.minPlayers= a.minPlayers
    ar.maxPlayers= a.maxPlayers
    ar.aCardOrder = a.aCardOrder?a.aCardOrder:0
    ar.aFeedMode= a.aFeedMode
    ar.aTypeDefault= a.aTypeDefault
    //loop through tags for aType
    ar.tag=""
    //var tagJson = utils._.find(tags,{aType: a.aType})
    var tagItems = a.tag.toString().split(',')
    tagItems.push("")
    utils._.map(tagItems, function(tagName){
    //  utils.l.d("tagName::"+tagName.trim())
      var arLocal = JSON.parse(JSON.stringify(ar));
      arLocal.tag = tagName.trim()
      activitiesResp.push(arLocal)
    })
  })
  //utils.l.d("activitiesResp",activitiesResp)
  setAdCards(activitiesResp,adcards)
  utils._.map(activitiesResp,function(activityData){
    models.activity.createActivity(activityData,callback)
  })
  return callback(null,activitiesResp)
}

function createActivities(activitiesResp,callback){
  utils._.map(activitiesResp,function(activityData){
    models.activity.createActivity(activityData,callback)
  })
}

function createActivitiesWithConverter(activityPath,modsPath,adcards,callback){
  var activities = null
  utils.async.waterfall([
    function(callback){
      utils.l.d("converting activities")
      var converter = new Converter({});
      converter.fromFile(activityPath,function(err,result){
        return callback(null,result)
      });
    },function(activitiesJSON,callback){
      activities = activitiesJSON
      utils.l.d("converting modifiers"+modsPath)
      //converter.fromFile(modsPath,callback)
      var converter = new Converter({});
      converter.fromFile(modsPath,function(err,modResult){
        utils.l.d('convertedmods',modResult)
        return callback(null,modResult)
      });

    },function(mods,callback){
      utils.l.d("creating activities with mods",mods)
      prepareActivities(activities,mods,adcards,callback)
    }, /*function(activityModel, callback){
      setAdCards(activityModel,adcards,callback)
    }, function (activityModelWithAdCard,callback){
      createActivities(activityModelWithAdCard,callback)
    }*/
  ],function(err,result){
    utils.l.d("created activites")
  })

}

function setAdCards(activityList,adcards){
  utils._.map(adcards,function(ad){
    var activity = utils._.find(activityList,ad)
    //utils.l.d('found activity',activity)
    utils._.set(activity,"adCard.isAdCard",true)
    //activity.adCard.isAdCard=true
  })
}

module.exports = {
  createActivities :createActivities,
  createActivitiesWithConverter:createActivitiesWithConverter
}