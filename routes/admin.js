const express = require('express');
const middleware = require('../middleware');
const wrapAsync = require('../utils/wrapAsync');
const admin = require("../controllers/admin"); //Controller
const router = express.Router(); //Router

router.get("/", middleware.isLoggedIn, middleware.isAdmin, admin.index);

router.route("/moderate")
    .get(middleware.isLoggedIn, middleware.isMod, wrapAsync(admin.moderateGet))
    .post(middleware.isLoggedIn, middleware.isMod, wrapAsync(admin.moderatePost))
    .put(middleware.isLoggedIn, middleware.isMod, wrapAsync(admin.moderatePut))
    .delete(middleware.isLoggedIn, middleware.isMod, wrapAsync(admin.moderateDelete));

router.route("/permissions")
    .get(middleware.isLoggedIn, middleware.isAdmin, wrapAsync(admin.permissionsGet))
    .put(middleware.isLoggedIn, middleware.isAdmin, wrapAsync(admin.permissionsPut));

router.route("/status")
    .get(middleware.isLoggedIn, middleware.isMod, wrapAsync(admin.statusGet))
    .put(middleware.isLoggedIn, middleware.isMod, wrapAsync(admin.statusPut));

router.route("/whitelist")
    .get(middleware.isLoggedIn, middleware.isMod, wrapAsync(admin.whitelistGet))
    .put(middleware.isLoggedIn, middleware.isMod, wrapAsync(admin.whitelistPut))
    .delete(middleware.isLoggedIn, middleware.isMod, wrapAsync(admin.whitelistId));

router.put('/tag', middleware.isLoggedIn, middleware.isMod, wrapAsync(admin.tag));

// router.post('/add-permission', middleware.isPrincipal, wrapAsync(admin.createPermission));
// router.post('/add-status', middleware.isPrincipal, wrapAsync(admin.createStatus));
// router.delete('/whitelist/:id', middleware.isLoggedIn, middleware.isPrincipal, wrapAsync(admin.permanentDelete));

module.exports = router;