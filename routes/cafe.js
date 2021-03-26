//Cafe routes control the creation of orders, management of the cafe, and the creation an modification of items and categories
const express = require('express');
const middleware = require('../middleware');
const wrapAsync = require('../utils/wrapAsync');
const {singleUpload} = require('../middleware/multer');
const cafe = require('../controllers/cafe'); //Controller
const router = express.Router(); //Router

//GENERAL ROUTES
router.route('/')
    .get(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(cafe.index)) //View homepage
    .post(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(middleware.cafeOpen), wrapAsync(cafe.order)); //Create new order

//View menu or view new order form
router.get('/order', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(middleware.cafeOpen), wrapAsync(cafe.orderForm));

//SPECIFIC ORDER ROUTES
router.route('/order/:id')
    .put(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), middleware.isCashier, wrapAsync(cafe.processOrder)) //Confirm order
    .delete(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(cafe.deleteOrder)); //Reject/cancel order

//EC MANAGEMENT ROUTES
router.route('/manage')
    .get(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), middleware.isCashier, wrapAsync(cafe.manage)) //Manage cafe, view orders or view data
    .put(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), middleware.isCashier, wrapAsync(cafe.changeStatus)); //Open/close cafe

//GENERAL ITEM ROUTES
router.route('/item')
    .get(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), middleware.isCashier, wrapAsync(cafe.newItem)) //Page to create item
    .post(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), middleware.isCashier, singleUpload, wrapAsync(cafe.createItem)); //Create item

//SPECIFIC ITEM ROUTES
router.route('/item/:id')
    .get(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), middleware.isCashier, wrapAsync(cafe.viewItem)) //View item
    .put(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), singleUpload, wrapAsync(cafe.updateItem)) //Update/upvote item
    .delete(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), middleware.isCashier, wrapAsync(cafe.deleteItem)); //Delete item

//GENERAL ITEM CATEGORY ROUTES
router.route('/category')
    .get(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), middleware.isCashier, wrapAsync(cafe.newCategory)) //Page to create category
    .post(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), middleware.isCashier, wrapAsync(cafe.createCategory)); //Create category

//SPECIFIC ITEM CATEGORY ROUTES
router.route('/category/:id')
    .get(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), middleware.isCashier, wrapAsync(cafe.viewCategory)) //View category
    .put(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), middleware.isCashier, wrapAsync(cafe.updateCategory)) //Update category
    .delete(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(middleware.isMod), wrapAsync(cafe.deleteCategory)); //Delete category

module.exports = router;