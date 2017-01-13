var utils = require('../utils')
var mongoose = require('mongoose')
var helpers = require('../helpers')

// Review Prompt Card Schema
var reviewPromptCardSchema = require('./schema/reviewPromptCardSchema')

// Model initialization
var ReviewPromptCard = mongoose.model('ReviewPromptCard', reviewPromptCardSchema.schema)

function getByQuery(query, callback) {
  ReviewPromptCard
    .find(query)
    .exec(function (err, reviewPromptCards) {
      if (err) {
        utils.l.s("Something went wrong in getting reviewPromptCards from database", err)
        return callback({error: "Something went wrong. Please try again later."}, null)
      } else {
        return callback(err, reviewPromptCards)
      }
    })
}

function createReviewPromptCard(data, callback) {
  var reviewPromptCardObj = new ReviewPromptCard(data)
  utils.async.waterfall([
    function checkForExistingReviewPromptCard(callback) {
      getByQuery({name: data.name}, utils.firstInArrayCallback(callback))
    },
    function createNewPromptCardIfNotFound(reviewPromptCard, callback) {
      if (!reviewPromptCard) {
        utils.l.d("no ReviewPromptCard found, saving ReviewPromptCard")
        reviewPromptCardObj.save(callback)
      } else {
        utils.l.d("found ReviewPromptCard: " + reviewPromptCard)
        return callback(null, "Prompt Card with this name already exists. Modify the existing card")
      }
    }
  ],
    function (err, reviewPromptCard) {
      if(err) {
        utils.l.s("Something went wrong in saving reviewPromptCards to database", err)
        return callback({error: "Something went wrong. Please try again later."}, null)
      } else {
        return callback(err, reviewPromptCard)
      }
    })
}

function listReviewPromptCards(callback) {
  getByQuery({}, callback)
}

function updateReviewPromptCard(data, callback) {
  ReviewPromptCard.findOneAndUpdate({_id: data.id}, {$set: data}, {upsert: true, returnNewDocument: true},
    function (err, reviewPromptCard) {
      if(err) {
        utils.l.s("Something went wrong in updating reviewPromptCards to database", err)
        return callback({error: "Something went wrong. Please try again later."}, null)
      } else {
        return callback(err, reviewPromptCard)
      }
    })
}

function deleteReviewPromptCard(query, callback) {
  ReviewPromptCard.findOneAndRemove(query, function (err, deletedReviewPromptCard) {
    if(err) {
      return callback({error: "Something went wrong while deleting this ReviewPromptCard"}, null)
    } else if(utils._.isInvalidOrBlank(deletedReviewPromptCard)) {
      return callback({error: "ReviewPromptCard with this id does not exist"}, null)
    } else {
      return callback(null , deletedReviewPromptCard)
    }
  })
}

module.exports = {
  model: ReviewPromptCard,
  getByQuery: getByQuery,
  createReviewPromptCard: createReviewPromptCard,
  listReviewPromptCards: listReviewPromptCards,
  updateReviewPromptCard: updateReviewPromptCard,
  deleteReviewPromptCard: deleteReviewPromptCard
}