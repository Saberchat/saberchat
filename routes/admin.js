const express = require('express');
//start express router
const router = express.Router();

const middlware = require('../middleware');

//Function to display user inbox
router.get('/', middlware.isLoggedIn, middlware.isAdmin, (req, res) => {
	res.render('admin/index');
});

module.exports = router;