const express = require('express');
const middleware = require('../middleware');
const router = express.Router(); //start express router
const dateFormat = require('dateformat');
const {transport, transport_mandatory} = require("../utils/transport");
const convertToLink = require("../utils/convert-to-link");
const {validateCourse} = require('../middleware/validation');

const User = require('../models/user');
const Notification = require('../models/message');
const Course = require('../models/course');
const PostComment = require('../models/postComment');
const Room = require('../models/room');

module.exports.index = async function(req, res) {
    try {
        const courses = await Course.find({});
        if (!courses) {
            req.flash('error', "Unable to find courses");
            return res.redirect('back');
        }

        let courseList = [];
        let userIncluded;
        for (let course of courses) {
            if ((course.teacher.equals(req.user._id)) || (course.students.includes(req.user._id))) {
                courseList.push(course);

            } else {
                for (let tutor of course.tutors) {
                    if (tutor.tutor.equals(req.user._id)) {
                        courseList.push(course);
                    }
                }
            }
        }

        return res.render('homework/index', {courses: courseList});

    } catch (err) {
        req.flash('error', "An error occurred");
        res.redirect('back');
    }
}

module.exports.createCourse = async function(req, res) {
    try {
        let charSetMatrix = [];
        charSetMatrix.push('qwertyuiopasdfghjklzxcvbnm'.split(''));
        charSetMatrix.push('QWERTYUIOPASDFGHJKLZXCVBNM'.split(''));
        charSetMatrix.push('1234567890'.split(''));

        let code_length = Math.round((Math.random() * 15)) + 10;
        let joinCode = "";

        let charSet; //Which character set to choose from
        for (let i = 0; i < code_length; i++) {
            charSet = charSetMatrix[Math.floor(Math.random() * 3)];
            joinCode += charSet[Math.floor((Math.random() * charSet.length))];
        }

        const course = await Course.create({ //Create course with specified information
            name: req.body.title,
            thumbnail: req.body.thumbnail,
            joinCode,
            description: req.body.description,
            active: true,
            teacher: req.user
        });

        if (!course) {
            req.flash('error', "Unable to create course");
            return res.redirect('back');
        }

        req.flash('success', "Successfully created course");
        return res.redirect('/homework');

    } catch (err) {
        req.flash('error', "An error occurred");
        res.redirect('back');
    }
}
