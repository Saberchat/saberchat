const express = require('express');
const middleware = require('../middleware');
const wrapAsync = require('../utils/wrapAsync');
const admin = require("../controllers/admin"); //Controller
const router = express.Router(); //Router

router.route("/moderate")
    .get(wrapAsync(middleware.isLoggedIn), middleware.isMod, wrapAsync(admin.moderateGet)) //View all reported comments
    .post(wrapAsync(middleware.isLoggedIn), middleware.isMod, wrapAsync(admin.getContext)) //Get context for reported comment
    .put(wrapAsync(middleware.isLoggedIn), middleware.isMod, wrapAsync(admin.ignoreComment)) //Ignore reported comment
    .delete(wrapAsync(middleware.isLoggedIn), middleware.isMod, wrapAsync(admin.deleteComment)); //Delete reported comment

router.route("/permissions")
    .get(wrapAsync(middleware.isLoggedIn), middleware.isAdmin, wrapAsync(admin.permissionsGet)) //Show list of users with permissions
    .put(wrapAsync(middleware.isLoggedIn), middleware.isAdmin, wrapAsync(admin.permissionsPut)); //Update user's permission

router.route("/status")
    .get(wrapAsync(middleware.isLoggedIn), middleware.isMod, wrapAsync(admin.statusGet)) //Show list of users with statuses
    .put(wrapAsync(middleware.isLoggedIn), middleware.isMod, wrapAsync(admin.statusPut)); //Update user's status

router.route("/accesslist")
    .get(wrapAsync(middleware.isLoggedIn), middleware.isMod, wrapAsync(admin.accesslistGet)) //Show either access list or blocked list
    .put(wrapAsync(middleware.isLoggedIn), middleware.isMod, wrapAsync(admin.addEmail)) //Update access/blocked list
    .delete(wrapAsync(middleware.isLoggedIn), middleware.isMod, wrapAsync(admin.deleteEmail)); //Remove email from access/blocked list

router.put('/tag', wrapAsync(middleware.isLoggedIn), middleware.isMod, wrapAsync(admin.tag));

router.route('/balances')
    .get(middleware.isLoggedIn, middleware.isCashier, wrapAsync(admin.viewBalances))
    .put(middleware.isLoggedIn, middleware.isCashier, wrapAsync(admin.updateBalances));

// router.post('/add-permission', middleware.isPrincipal, wrapAsync(admin.createPermission));
// router.post('/add-status', middleware.isPrincipal, wrapAsync(admin.createStatus));
// router.delete('/accesslist/:id', wrapAsync(middleware.isLoggedIn), middleware.isPrincipal, wrapAsync(admin.permanentDelete));

module.exports = router;