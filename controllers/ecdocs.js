//LIBRARIES
const {objectArrIndex} = require("../utils/object-operations");
const setup = require("../utils/setup");

//SCHEMA
const Platform = require("../models/platform");
const controller = {};

//Index page - display all Early College documents
controller.index = async function(req, res) {
    const platform = await setup(Platform);
    if (!platform) {
        req.flash("error", "An Error Occurred");
        return res.redirect("back");
    }
    return res.render("ecdocs/index", {platform}); //Render ecdocs homepage
}

//Edit EC Documents
controller.edit = async function(req, res) {
    const platform = await setup(Platform);
    if (!platform) {
        req.flash("error", "An Error Occurred");
        return res.redirect("back");
    }
    return res.render("ecdocs/edit", {platform, objectArrIndex}); //Render editing page
}

//Update EC Documents Page
controller.update = async function(req, res) {
    const platform = await setup(Platform);
    if (!platform) {
        req.flash("error", "An Error Occurred");
        return res.redirect("back");
    }

    //Reset documents and rebuild based on form data
    platform.documents = [];
    let info = {
        infoHeading: [],
        infoText: [],
        infoImages: []
    };

    for (let attr of ["infoHeading", "infoText", "infoImages"]) {
        if (typeof req.body[attr] == "string") { //If there is only one element, read as array, not string
            info[attr] = [req.body[attr]];
        } else { //If multiple elements, read normally
            info[attr] = req.body[attr];
        }
    }

    for (let i = 0; i < info.infoHeading.length; i++) { //Update about information
        parsedText = [];
        for (let element of info.infoText[i].split('\n')) {
            if (element.split('\n').join('').split(' ').join('') != "") {
                parsedText.push(element);
            }
        }

        if (!info.infoImages[i] || info.infoImages[i] == '') { //If there is no provided image, choose a random image and display that
            info.infoImages[i] = platform.displayImages[Math.floor(Math.random() * platform.displayImages.length)];
        }

        platform.documents.push({ //Add data to platform's info
            heading: info.infoHeading[i],
            text: parsedText,
            image: info.infoImages[i]
        });
    }

    //Save and render newly updated page
    await platform.save();
    req.flash("success", "Updated Early College Documents!");
    return res.redirect("/ecdocs");
}

module.exports = controller;