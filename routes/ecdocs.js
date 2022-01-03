const express = require('express');
const middleware = require('../middleware');
const wrapAsync = require('../utils/wrapAsync');
const ecdocs = require('../controllers/ecdocs'); //Controller
const router = express.Router(); //Router

router.get('/', wrapAsync(ecdocs.index)); //EC info
router.get('/edit', middleware.isLoggedIn, middleware.isAdmin, wrapAsync(ecdocs.edit)); //Edit EC info form
router.put('/', middleware.isLoggedIn, middleware.isAdmin, wrapAsync(ecdocs.update)); //Update EC info

module.exports = router;