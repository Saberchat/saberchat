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
    return res.render("other/ecdocs", {platform});
}

controller.edit = async function(req, res) {
    const platform = await setup(Platform);
    if (!platform) {
        await req.flash("error", "An Error Occurred");
        return res.redirect("back");
    }
    return res.render("other/edit-ecdocs", {platform, objectArrIndex});
}

controller.update = async function(req, res) {
    const platform = await setup(Platform);
    if (!platform) {
        await req.flash("error", "An Error Occurred");
        return res.redirect("back");
    }

    platform.documents = [];
    let parsedText = [];
    for (let i = 0; i < req.body.infoHeading.length; i++) { //Update about information
        parsedText = [];
        for (let element of req.body.infoText[i].split('\n')) {
            if (await element.split('\r').join('').split(' ').join('') != "") {
                await parsedText.push(element);
            }
        }
        await platform.documents.push({
            heading: req.body.infoHeading[i],
            text: parsedText,
            image: req.body.infoImages[i]
        });
    }

    await platform.save();
    await req.flash("success", "Updated Early College Documents!");
    return res.redirect("/ecdocs");
}

module.exports = controller;