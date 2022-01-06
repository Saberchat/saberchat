const setup = require("../utils/setup");

const dateFormat = require('dateformat');

//SCHEMA
const Platform = require("../models/platform");
const User = require('../models/user');
const {Poll} = require('../models/post');

const controller = {}

controller.index = async function(req, res) {
    const platform = await setup(Platform);
    const featureIndex = platform.features.findIndex(i => i.route === 'polls');

    const polls = await Poll.find({}).sort({created_at: -1}).populate({
        path: 'sender',
        select: 'username'
    });

    const openPolls = polls.filter(poll => !poll.closed);
    const closedPolls = polls.filter(poll => poll.closed);

    res.render('polls/index', {
        platform, 
        openPolls,
        closedPolls,
        data: platform.features[featureIndex]
    });
}

controller.show = async function(req, res) {
    const platform = await setup(Platform);
    const featureIndex = platform.features.findIndex(i => i.route === 'polls');

    const poll = await Poll.findById(req.params.id).populate({
        path: 'sender',
        select: 'username'
    });

    if(!poll) {
        req.flash('error', 'Cannot find poll.');
        return res.redirect('/polls');
    }

    if(poll.closed && !poll.sender._id.equals(req.user._id)) {
        req.flash('error', 'Poll has been closed.');
        return res.redirect('/polls');
    }

    res.render('polls/show', {
        platform, 
        poll,
        data: platform.features[featureIndex]
    });
}

controller.instructions = async function(req, res) {
    const platform = await setup(Platform);
    const featureIndex = platform.features.findIndex(i => i.route === 'polls');

    res.render('polls/instructions', { platform, data: platform.features[featureIndex]});
}

controller.form = async function(req, res) {
    const platform = await setup(Platform);
    const featureIndex = platform.features.findIndex(i => i.route === 'polls');

    res.render('polls/new', { platform, data: platform.features[featureIndex]});
}

controller.toggleClosed = async function(req, res) {
    const poll = await Poll.findById(req.params.id);
    if(!poll) {
        req.flash('error', 'Cannot find poll.');
        return res.redirect('/back');
    }
    if(!poll.sender._id.equals(req.user._id)) {
        req.flash('error', 'You do not own this poll.');
        return res.redirect('/back');
    }
    let state;
    if(poll.closed) {
        poll.closed = false;
        state = 'open';
    } else {
        poll.closed = true;
        state = 'closed';
    }

    await poll.save();
    req.flash('success', `Form is now ${state}.`)
    res.redirect('back');
}

controller.create = async function(req, res) {
    const title = req.body.formTitle;
    const googleFormUrl = req.body.googleFormUrl;
    const width = parseInt(req.body.formWidth);
    const height = parseInt(req.body.formHeight);

    if(typeof title !== 'string' || typeof googleFormUrl !=='string') {
        req.flash("error", "Invalid inputs.");
        return res.redirect("back");
    }
    let parsedUrl;
    try {
        parsedUrl = new URL(googleFormUrl);
    } catch (error) {
        req.flash('error', 'Invalid form url.');
        return res.redirect('back');
    }

    parsedUrl.search = '?embedded=true';

    const now = new Date();

    const pollObj = {
        subject: title,
        googleFormUrl: parsedUrl,
        date: dateFormat(now, "mmm d"),
        sender: req.user._id
    }

    if(!isNaN(width) || !isNaN(height)) {
        pollObj.width = width;
        pollObj.height = height;
    }

    const newPoll = await Poll.create(pollObj);
    if(!newPoll) {
        req.flash('error', 'Poll could not be created');
        return res.redirect('back');
    }

    req.flash('success', 'Form Created')
    res.redirect('/polls');
}

module.exports = controller;