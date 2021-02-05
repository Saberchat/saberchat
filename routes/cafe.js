//Cafe routes control the creation of orders, management of the cafe, and the creation an modification of items and items types

const express = require('express');
const middleware = require('../middleware');
const router = express.Router();
const cafeController = require('../controllers/cafe');

//GENERAL ROUTES
router.route('/')
    .get(middleware.isLoggedIn, middleware.cafeOpen, cafeController.index) //View homepage, view menu or view new order form
    .post(middleware.isLoggedIn, middleware.cafeOpen, cafeController.order); //Create new order

//SPECIFIC ORDER ROUTES
router.route('/order/:id')
    .put(middleware.isLoggedIn, middleware.isCashier, cafeController.processOrder) //Confirm order
    .delete(middleware.isLoggedIn, cafeController.deleteOrder); //Reject/cancel order

//EC MANAGEMENT ROUTES
router.route('/manage')
    .get(middleware.isLoggedIn, middleware.isCashier, cafeController.manage) //Manage cafe, view orders or view data
    .put(middleware.isLoggedIn, middleware.isCashier, cafeController.changeStatus); //Open/close cafe

//GENERAL ITEM ROUTES
router.route('/item')
    .get(middleware.isLoggedIn, middleware.isCashier, cafeController.newItem) //Page to create item
    .post(middleware.isLoggedIn, middleware.isCashier, cafeController.createItem); //Create item

//SPECIFIC ITEM ROUTES
router.route('/item/:id')
    .get(middleware.isLoggedIn, middleware.isCashier, cafeController.viewItem) //View item
    .put(middleware.isLoggedIn, cafeController.updateItem) //Update/upvote item
    .delete(middleware.isLoggedIn, middleware.isCashier, cafeController.deleteItem); //Delete item

//GENERAL ITEM CATEGORY ROUTES
router.route('/type')
    .get(middleware.isLoggedIn, middleware.isCashier, cafeController.newType) //Page to create category
    .post(middleware.isLoggedIn, middleware.isCashier, cafeController.createType); //Create category

//SPECIFIC ITEM CATEGORY ROUTES
router.route('/type/:id')
    .get(middleware.isLoggedIn, middleware.isCashier, cafeController.viewType) //View category
    .put(middleware.isLoggedIn, middleware.isCashier, cafeController.updateType) //Update category
    .delete(middleware.isLoggedIn, middleware.isMod, cafeController.deleteType); //Delete category

module.exports = router;
