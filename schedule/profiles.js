// SCHEMA
const Platform = require('../models/platform');
const User = require("../models/user");

//Scheduler for schedule jobs
const setup = require('../utils/setup');
const profiles = {};

profiles.updateStatuses = async function() { // Update all students' statuses on update date, if required
    const platform = await setup(Platform);
    if (!platform) {return console.log("error")};
    if (platform.updateTime.split(' ')[0] != "0" && platform.updateTime.split(' ')[1] != "0") { //If there is an update time
        const statuses = platform.studentStatuses.concat(platform.formerStudentStatus);
        const users = await User.find({authenticated: true, status: {$in: platform.studentStatuses}});
        if (!users) {return console.log("error");}
        for (let user of users) {
            user.status = statuses[statuses.indexOf(user.status)+1];
            await user.save();
        }
    }
}

module.exports = profiles;