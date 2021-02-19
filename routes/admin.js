const express = require('express');
const middleware = require('../middleware');
const wrapAsync = require('../utils/wrapAsync');
const admin = require("../controllers/admin"); //Controller
module.exports = express.Router(); //Router

module.exports.get("/", middleware.isLoggedIn, middleware.isAdmin, admin.index);

module.exports.route("/moderate")
    .get(middleware.isLoggedIn, middleware.isMod, wrapAsync(admin.moderateGet))
    .post(middleware.isLoggedIn, middleware.isMod, wrapAsync(admin.moderatePost))
    .put(middleware.isLoggedIn, middleware.isMod, wrapAsync(admin.moderatePut))
    .delete(middleware.isLoggedIn, middleware.isMod, wrapAsync(admin.moderateDelete));

module.exports.route("/permissions")
    .get(middleware.isLoggedIn, middleware.isAdmin, wrapAsync(admin.permissionsGet))
    .put(middleware.isLoggedIn, middleware.isAdmin, wrapAsync(admin.permissionsPut));

module.exports.route("/status")
    .get(middleware.isLoggedIn, middleware.isMod, wrapAsync(admin.statusGet))
    .put(middleware.isLoggedIn, middleware.isMod, wrapAsync(admin.statusPut));

module.exports.route("/whitelist")
    .get(middleware.isLoggedIn, middleware.isMod, wrapAsync(admin.whitelistGet))
    .put(middleware.isLoggedIn, middleware.isMod, wrapAsync(admin.whitelistPut))
    .delete(middleware.isLoggedIn, middleware.isMod, wrapAsync(admin.whitelistId));

module.exports.put('/tag', middleware.isLoggedIn, middleware.isMod, wrapAsync(admin.tag));

// module.exports.post('/add-permission', middleware.isPrincipal, wrapAsync(admin.createPermission));
// module.exports.post('/add-status', middleware.isPrincipal, wrapAsync(admin.createStatus));
// module.exports.delete('/whitelist/:id', middleware.isLoggedIn, middleware.isPrincipal, wrapAsync(admin.permanentDelete));
