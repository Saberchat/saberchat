//Project routes dictate the posting, viewing, and editing of the Saberchat Student Projects Board

//LIBRARIES
const express = require('express');
const middleware = require('../middleware');
const router = express.Router(); //start express router
const dateFormat = require('dateformat');
const nodemailer = require('nodemailer');

//SCHEMA
const User = require('../models/user');
const Notification = require('../models/message');
const Course = require('../models/course');

let transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'noreply.saberchat@gmail.com',
    pass: 'Tgy8erwIYtxRZrJHvKwkWbrkbUhv1Zr9'
  }
});

module.exports = router;
