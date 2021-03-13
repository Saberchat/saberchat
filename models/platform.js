const mongoose = require("mongoose");

//Superclass group schema, to be implemented with chat rooms, courses, etc.
var platformSchema = new mongoose.Schema({
    name: String,
    emailExtension: String,
    statusesProperty: [{type: String}],
    statusesSingular: [{type: String}],
    statusesPlural: [{type: String}],
    studentStatuses: [{type: String}],
    formerStudentStatus: String,
    teacherStatus: String,
    updateTime: String,
    permissionsProperty: [{type: String}],
    permissionsDisplay: [{type: String}],
    tags: [{type: String}],
    publicFeatures: [{
        route: String,
        name: String,
        icon: String,
        subroutes: [{type: String}]
    }],
    features: [{
        route: String,
        name: String,
        icon: String,
    }],
    imageUrl: String,
    displayImages: [{type: String}],
    info: [{
        heading: String,
        text: [{type: String}],
        image: String
    }],
    services: [{type: String}],
    community: [{type: String}],
    contact: {heading: String, description: String}
}, {timestamps: {createdAt: 'created_at'}});

module.exports = mongoose.model("Platform", platformSchema);
