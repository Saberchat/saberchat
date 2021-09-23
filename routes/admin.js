const express = require('express');
const middleware = require('../middleware');
const wrapAsync = require('../utils/wrapAsync');
const {singleUpload} = require('../middleware/multer')
const admin = require("../controllers/admin"); //Controller
const router = express.Router(); //Router

router.route("/moderate")
    .get(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.isMod), wrapAsync(admin.moderateGet)) //View all reported comments
    .post(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.isMod), wrapAsync(admin.getContext)) //Get context for reported comment
    .put(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.isMod), wrapAsync(admin.ignoreComment)) //Ignore reported comment
    .delete(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.isMod), wrapAsync(admin.deleteComment)); //Delete reported comment

router.route("/permissions")
    .get(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.isAdmin), wrapAsync(admin.permissionsGet)) //Show list of users with permissions
    .put(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.isAdmin), wrapAsync(admin.permissionsPut)); //Update user's permission

router.route("/status")
    .get(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.isMod), wrapAsync(admin.statusGet)) //Show list of users with statuses
    .put(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.isMod), wrapAsync(admin.statusPut)); //Update user's status

router.route("/accesslist")
    .get(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.isPrincipal), wrapAsync(admin.accesslistGet)) //Show either access list or blocked list
    .put(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.isPrincipal), wrapAsync(admin.addEmail)) //Update access/blocked list
    .delete(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.isPrincipal), wrapAsync(admin.deleteEmail)); //Remove email from access/blocked list

router.route("/settings")
    .get(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.isPrincipal), wrapAsync(admin.updatePlatformForm))
    .put(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.isPrincipal), singleUpload, wrapAsync(admin.updatePlatform));

router.put('/tag', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.isMod), wrapAsync(admin.tag));

router.route('/balances')
    .get(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.isPrincipal), wrapAsync(admin.viewBalances))
    .put(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.isPrincipal), wrapAsync(admin.updateBalances));

router.route('/authenticate')
    .get(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.isPrincipal), wrapAsync(admin.authenticateGet))
    .put(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.isPrincipal), wrapAsync(admin.authenticatePut))
    .delete(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.isPrincipal), wrapAsync(admin.authenticateDelete));

// router.delete('/accesslist/:id', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.isPrincipal), wrapAsync(admin.permanentDelete));

module.exports = router;