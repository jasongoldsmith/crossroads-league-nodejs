var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.Types.ObjectId;
var utils = require('../../utils');

var LoginSchema = new Schema({
  date: {type: Date, required: true},
  uDate: Date,
  userAgent: String,
  userIp: String,
  reason: String
});

LoginSchema.pre('validate', function(next) {
  this.uDate = new Date();
  if (this.isNew) {
    this.date = new Date();
  }
  next();
});


module.exports = {
  schema: LoginSchema
};