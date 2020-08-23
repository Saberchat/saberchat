const express = require('express');
//start express router
const router = express.Router();

const Notif = require('../models/notification');

//Function to display user inbox
router.get('/inbox', (req, res) => {
	res.render('inbox/index');
});

module.exports = router;