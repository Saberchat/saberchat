//LIBRARIES
const {objectArrIndex} = require("../utils/object-operations");
const setup = require("../utils/setup");

//SCHEMA
const Platform = require("../models/platform");
const controller = {};

controller.index = async function(req, res) {
    const platform = await setup(Platform);
    if (!platform) {
        await req.flash("error", "An Error Occurred");
        return res.redirect("back");
    }
    return res.render("ecdocs/index", {platform});
}

controller.edit = async function(req, res) {
    const platform = await setup(Platform);
    if (!platform) {
        await req.flash("error", "An Error Occurred");
        return res.redirect("back");
    }
    return res.render("ecdocs/edit", {platform, objectArrIndex});
}

controller.update = async function(req, res) {
    const platform = await setup(Platform);
    if (!platform) {
        await req.flash("error", "An Error Occurred");
        return res.redirect("back");
    }

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
            if (await element.split('\n').join('').split(' ').join('') != "") {
                await parsedText.push(element);
            }
        }

        if (!info.infoImages[i] || info.infoImages[i] == '') {
            info.infoImages[i] = platform.displayImages[Math.floor(Math.random() * platform.displayImages.length)];
        }

        await platform.documents.push({ //Add data to platform's info
            heading: info.infoHeading[i],
            text: parsedText,
            image: info.infoImages[i]
        });
    }

    await platform.save();
    await req.flash("success", "Updated Early College Documents!");
    return res.redirect("/ecdocs");
}

module.exports = controller;