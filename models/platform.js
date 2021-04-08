const { boolean } = require("joi");
const mongoose = require("mongoose");

//Platform schema holds all data for individual platform's settings
var platformSchema = new mongoose.Schema({
    name: String,
    description: {type: String, default: ''},
    url: String,
    imageUrl: String,
    principal: String,
    principalAuthenticate: {type: Boolean, default: false}, //Check if users have to be validated by principal first
    emailExtension: {type: String, default: ''},
    updateTime: {type: String, default: "0 0"},
    navDark: {type: Boolean, default: false},
    colorScheme: [{type: String}],
    darkColorScheme: [{type: String}],
    font: {type: String, default: "Helvetica"},

    //TODO: Starts here
    permissionsProperty: [{type: String}],
    permissionsDisplay: [{type: String}],
    statusesProperty: [{type: String}],
    statusesSingular: [{type: String}],
    statusesPlural: [{type: String}],
    studentStatuses: [{type: String}],
    formerStudentStatus: String,
    teacherStatus: String,
    //ENDS HERE

    tags: [{type: String}],
    publicFeatures: [{route: String, name: String, icon: String, subroutes: [{type: String}]}],
    features: [{route: String, name: String, icon: String}],
    displayImages: [{type: String}],
    info: [{heading: String, text: [{type: String}], image: String}],
    services: [{type: String}],
    community: [{type: String}],
    contact: {heading: String, description: String}
}, {timestamps: {createdAt: 'created_at'}});

module.exports = mongoose.model("Platform", platformSchema);