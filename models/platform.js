const mongoose = require("mongoose");

//Platform schema holds all data for individual platform's settings
var platformSchema = new mongoose.Schema({
    name: String,
    imageUrl: String,
    emailExtension: {type: String, default: ''},
    updateTime: {type: String, default: "0 0"},

    //TODO: Starts here
    permissionsProperty: [{type: String}],
    permissionsDisplay: [{type: String}],
    statusesProperty: [{type: String}],
    statusesSingular: [{type: String}],
    statusesPlural: [{type: String}],
    studentStatuses: [{type: String}],
    formerStudentStatus: String,
    teacherStatus: String,
    tags: [{type: String}],
    //ENDS HERE

    publicFeatures: [{route: String, name: String, icon: String, subroutes: [{type: String}]}],
    features: [{route: String, name: String, icon: String}],
    displayImages: [{type: String}],
    info: [{heading: String, text: [{type: String}], image: String}],
    services: [{type: String}],
    community: [{type: String}],
    contact: {heading: String, description: String}
}, {timestamps: {createdAt: 'created_at'}});

module.exports = mongoose.model("Platform", platformSchema);