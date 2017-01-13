var mongoose = require('mongoose')
var Schema = mongoose.Schema

var reviewPromptCardSchema = new Schema({
  name: String,
  imageUrl: String,
  cardText: {type: String, required: true},
  buttonText: {type: String, required: true}
})

reviewPromptCardSchema.index({'name': 1})
reviewPromptCardSchema.index({'cardText': 1})
reviewPromptCardSchema.index({'buttonText': 1})

module.exports = {
  schema: reviewPromptCardSchema
}