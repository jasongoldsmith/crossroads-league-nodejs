var mongoose = require('mongoose')
var Schema = mongoose.Schema
var idValidator = require('mongoose-id-validator')

var reportSchema = new Schema({
	reportStatus: { type: String, enum: ['new', 'resolved', 'defered', 'open'], default:'new'},
	reporterEmail:String,
	reportDetails: { type : String, required : true },
	resolveReason: { type : String},
	reportType: { type: String, enum: ['issue', 'comment'], default: 'issue'},
	reporter: { type: Schema.Types.ObjectId, ref: 'User' },
	createdDate: { type: Date, default: Date.now },
	resolvedDate: { type: Date },
	reportAdditionalInfo:[{type: Schema.Types.Mixed}]
})

reportSchema.index({'reportStatus': 1})

reportSchema.pre('validate', function(next) {
	if (this.isNew) {
		this.createdDate = new Date()
	}else if(this.reportStatus == 'resolved') {
		this.resolvedDate = new Date()
	}
	next()
})

module.exports = {
	schema: reportSchema
}

reportSchema.plugin(idValidator)