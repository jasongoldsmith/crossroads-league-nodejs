var express = require('express')
var router = express.Router()
var utils = require('../../utils')
var routeUtils = require('../routeUtils')
var service = require('../../service')

function create(req, res) {
  utils.l.d("ReviewPromptCard create request: " + JSON.stringify(req.body))
  service.reviewPromptCardService.createReviewPromptCard(req.body, function(err, reviewPromptCard) {
    if (err) {
      routeUtils.handleAPIError(req, res, err, err)
    } else {
      routeUtils.handleAPISuccess(req, res, reviewPromptCard)
    }
  })
}

function list(req, res) {
  utils.l.d("ReviewPromptCard create request: ")
  service.reviewPromptCardService.listReviewPromptCards(function(err, reviewPromptCards) {
    if (err) {
      routeUtils.handleAPIError(req, res, err, err)
    } else {
      routeUtils.handleAPISuccess(req, res, reviewPromptCards)
    }
  })
}

function update(req, res) {
  utils.l.d("ReviewPromptCard update request: " + JSON.stringify(req.body))
  service.reviewPromptCardService.updateReviewPromptCard(req.body, function(err, reviewPromptCard) {
    if (err) {
      routeUtils.handleAPIError(req, res, err, err)
    } else {
      routeUtils.handleAPISuccess(req, res, reviewPromptCard)
    }
  })
}

function remove(req, res) {
  utils.l.d("ReviewPromptCard delete request: " + JSON.stringify(req.body))
  service.reviewPromptCardService.deleteReviewPromptCard(req.body, function(err, reviewPromptCard) {
    if (err) {
      routeUtils.handleAPIError(req, res, err, err)
    } else {
      routeUtils.handleAPISuccess(req, res, reviewPromptCard)
    }
  })
}

routeUtils.rPost(router, '/create', 'createReviewPromptCard', create)
routeUtils.rGet(router, '/list', 'listReviewPromptCard', list)
routeUtils.rPost(router, '/update', 'updateReviewPromptCard', update)
routeUtils.rPost(router, '/delete', 'deleteReviewPromptCard', remove)
module.exports = router