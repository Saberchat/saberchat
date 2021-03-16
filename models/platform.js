const mongoose = require("mongoose");

//Platform schema holds all data for individual platform's settings
var platformSchema = new mongoose.Schema({
    name: String, //Done
    imageUrl: String, //Done
    emailExtension: String, //Done

    statusesProperty: [{type: String}],
    statusesSingular: [{type: String}],
    statusesPlural: [{type: String}],
    studentStatuses: [{type: String}],
    formerStudentStatus: String,
    teacherStatus: String,
    updateTime: String, //Done
    permissionsProperty: [{type: String}],
    permissionsDisplay: [{type: String}],
    tags: [{type: String}],

    //DO NOT DO
    publicFeatures: [{route: String, name: String, icon: String, subroutes: [{type: String}]}],
    features: [{route: String, name: String, icon: String}],

    displayImages: [{type: String}], //Done
    info: [{heading: String, text: [{type: String}], image: String}], //Done

    services: [{type: String}], //Done
    community: [{type: String}], //Done
    contact: {heading: String, description: String} //Done
}, {timestamps: {createdAt: 'created_at'}});

module.exports = mongoose.model("Platform", platformSchema);