const express = require('express');
//start express router
const router = express.Router();

//Function to display user inbox
router.get('/admin', (req, res) => {
	res.render('admin/index');
});

module.exports = router;