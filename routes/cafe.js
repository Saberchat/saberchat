//Cafe routes control the creation of orders, management of the cafe, and the creation an modification of items and item categories

const express = require('express');
const middleware = require('../middleware');
const router = express.Router();
const wrapAsync = require('../utils/wrapAsync');
const cafeController = require('../controllers/cafe');

//GENERAL ROUTES
router.route('/')
    .get(middleware.isLoggedIn, middleware.cafeOpen, wrapAsync(cafeController.index)) //View homepage, view menu or view new order form
    .post(middleware.isLoggedIn, middleware.cafeOpen, wrapAsync(cafeController.order)); //Create new order

//SPECIFIC ORDER ROUTES
router.route('/order/:id')
    .put(middleware.isLoggedIn, middleware.isCashier, wrapAsync(cafeController.processOrder)) //Confirm order
    .delete(middleware.isLoggedIn, wrapAsync(cafeController.deleteOrder)); //Reject/cancel order

//EC MANAGEMENT ROUTES
router.route('/manage')
    .get(middleware.isLoggedIn, middleware.isCashier, wrapAsync(cafeController.manage)) //Manage cafe, view orders or view data
    .put(middleware.isLoggedIn, middleware.isCashier, wrapAsync(cafeController.changeStatus)); //Open/close cafe

//GENERAL ITEM ROUTES
router.route('/item')
    .get(middleware.isLoggedIn, middleware.isCashier, wrapAsync(cafeController.newItem)) //Page to create item
    .post(middleware.isLoggedIn, middleware.isCashier, wrapAsync(cafeController.createItem)); //Create item

//SPECIFIC ITEM ROUTES
router.route('/item/:id')
    .get(middleware.isLoggedIn, middleware.isCashier, wrapAsync(cafeController.viewItem)) //View item
    .put(middleware.isLoggedIn, wrapAsync(cafeController.updateItem)) //Update/upvote item
    .delete(middleware.isLoggedIn, middleware.isCashier, wrapAsync(cafeController.deleteItem)); //Delete item

//GENERAL ITEM CATEGORY ROUTES
router.route('/type')
    .get(middleware.isLoggedIn, middleware.isCashier, wrapAsync(cafeController.newType)) //Page to create category
    .post(middleware.isLoggedIn, middleware.isCashier, wrapAsync(cafeController.createType)); //Create category

//SPECIFIC ITEM CATEGORY ROUTES
router.route('/type/:id')
    .get(middleware.isLoggedIn, middleware.isCashier, wrapAsync(cafeController.viewType)) //View category
    .put(middleware.isLoggedIn, middleware.isCashier, wrapAsync(cafeController.updateType)) //Update category
    .delete(middleware.isLoggedIn, middleware.isMod, wrapAsync(cafeController.deleteType)); //Delete category

module.exports = router;
