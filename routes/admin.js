const express = require('express');
const middleware = require('../middleware');
const wrapAsync = require('../utils/wrapAsync');
const admin = require("../controllers/admin"); //Controller
const router = express.Router(); //Router

router.route("/moderate")
    .get(middleware.isLoggedIn, middleware.isMod, wrapAsync(admin.moderateGet)) //View all reported comments
    .post(middleware.isLoggedIn, middleware.isMod, wrapAsync(admin.getContext)) //Get context for reported comment
    .put(middleware.isLoggedIn, middleware.isMod, wrapAsync(admin.ignoreComment)) //Ignore reported comment
    .delete(middleware.isLoggedIn, middleware.isMod, wrapAsync(admin.deleteComment)); //Delete reported comment

router.route("/permissions")
    .get(middleware.isLoggedIn, middleware.isAdmin, wrapAsync(admin.permissionsGet)) //Show list of users with permissions
    .put(middleware.isLoggedIn, middleware.isAdmin, wrapAsync(admin.permissionsPut)); //Update user's permission

router.route("/status")
    .get(middleware.isLoggedIn, middleware.isMod, wrapAsync(admin.statusGet)) //Show list of users with statuses
    .put(middleware.isLoggedIn, middleware.isMod, wrapAsync(admin.statusPut)); //Update user's status

router.route("/accesslist")
    .get(middleware.isLoggedIn, middleware.isMod, wrapAsync(admin.accesslistGet)) //Show either access list or blocked list
    .put(middleware.isLoggedIn, middleware.isMod, wrapAsync(admin.addEmail)) //Update access/blocked list
    .delete(middleware.isLoggedIn, middleware.isMod, wrapAsync(admin.deleteEmail)); //Remove email from access/blocked list

router.put('/tag', middleware.isLoggedIn, middleware.isMod, wrapAsync(admin.tag));

// router.post('/add-permission', middleware.isPrincipal, wrapAsync(admin.createPermission));
// router.post('/add-status', middleware.isPrincipal, wrapAsync(admin.createStatus));
// router.delete('/accesslist/:id', middleware.isLoggedIn, middleware.isPrincipal, wrapAsync(admin.permanentDelete));

module.exports = router;