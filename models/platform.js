const mongoose = require("mongoose");

//Platform schema holds all data for individual platform's settings
var platformSchema = new mongoose.Schema({
    name: String,
    description: {type: String, default: ''},
    postText: String,
    url: String,
    icon: String,
    imageUrl: {type: String, default: "https://wallpaper.dog/large/11001671.jpg"},
    principal: String,
    indexPlatformInfo: {type: Boolean, default: false}, //Display Saberchat page vs platform info page
    displayVideo: { //Usage Instructions Video
        filename: String,
        url: String,
        originalName: String,
    },
    displayAvailability: {type: Boolean, default: true}, //Display item availability
    homepageInfo: {type: Boolean, default: true}, //Display information on homepage
    descriptionDisplay: {type: Boolean, default: false}, //Display description or platform name first on homepage
    contactPhotoDisplay: {type: Boolean, default: true}, //Display photos of platform administrators on contact page
    principalAuthenticate: {type: Boolean, default: false}, //Check if users have to be validated by principal first
    enableDarkmode: {type: Boolean, default: true}, //Check if users can enable darkmode
    restrictPosts: {type: Boolean, default: true}, //Restrictions for order and chat room creation
    emailExtension: {type: String, default: ''},
    officialEmail: {type: String, default: ''},
    balanceMessage: {type: String, default: ''},
    updateTime: {type: String, default: "0 0"},
    navDark: {type: Boolean, default: false},
    purchasable: {type: Boolean, default: true}, //Item purchases can be made
    dollarPayment: {type: Boolean, default: true}, //Item purchases are made through dollars
    postVerifiable: {type: Boolean, default: true}, //Posts need to be verified before being displayed
    colorScheme: [{type: String}],
    font: {type: String, default: "Helvetica"},
    permissionsProperty: [{type: String}],
    permissionsDisplay: [{type: String}],
    statusesProperty: [{type: String}],
    statusesSingular: [{type: String}],
    statusesPlural: [{type: String}],
    studentStatuses: [{type: String}],
    formerStudentStatus: String,
    teacherStatus: String,
    tags: [{type: String}],
    terms: [{type: String}],
    publicFeatures: [{route: String, name: String, icon: String, subroutes: [{type: String}]}],
    features: [{route: String, name: String, description: {type: String, default: ''}, icon: String}],
    displayImages: [{type: String}],
    info: [{heading: String, text: [{type: String}], image: String}],
    services: [{type: String}],
    community: [{type: String}],
    contact: {
        heading: String,
        description: [{type: String}]
    }
}, {timestamps: {createdAt: 'created_at'}});

module.exports = mongoose.model("Platform", platformSchema);