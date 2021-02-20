//Cafe routes control the creation of orders, management of the cafe, and the creation an modification of items and categories
const express = require('express');
const middleware = require('../middleware');
const wrapAsync = require('../utils/wrapAsync');
const {singleUpload} = require('../middleware/multer');
const cafe = require('../controllers/cafe'); //Controller
const router = express.Router(); //Router

//GENERAL ROUTES
router.route('/')
    .get(middleware.isLoggedIn, wrapAsync(middleware.cafeOpen), wrapAsync(cafe.index)) //View homepage, view menu or view new order form
    .post(middleware.isLoggedIn, wrapAsync(middleware.cafeOpen), wrapAsync(cafe.order)); //Create new order

//SPECIFIC ORDER ROUTES
router.route('/order/:id')
    .put(middleware.isLoggedIn, middleware.isCashier, wrapAsync(cafe.processOrder)) //Confirm order
    .delete(middleware.isLoggedIn, wrapAsync(cafe.deleteOrder)); //Reject/cancel order

//EC MANAGEMENT ROUTES
router.route('/manage')
    .get(middleware.isLoggedIn, middleware.isCashier, wrapAsync(cafe.manage)) //Manage cafe, view orders or view data
    .put(middleware.isLoggedIn, middleware.isCashier, wrapAsync(cafe.changeStatus)); //Open/close cafe

//GENERAL ITEM ROUTES
router.route('/item')
    .get(middleware.isLoggedIn, middleware.isCashier, wrapAsync(cafe.newItem)) //Page to create item
    .post(middleware.isLoggedIn, middleware.isCashier, singleUpload, wrapAsync(cafe.createItem)); //Create item

//SPECIFIC ITEM ROUTES
router.route('/item/:id')
    .get(middleware.isLoggedIn, middleware.isCashier, wrapAsync(cafe.viewItem)) //View item
    .put(middleware.isLoggedIn, singleUpload, wrapAsync(cafe.updateItem)) //Update/upvote item
    .delete(middleware.isLoggedIn, middleware.isCashier, wrapAsync(cafe.deleteItem)); //Delete item

//GENERAL ITEM CATEGORY ROUTES
router.route('/category')
    .get(middleware.isLoggedIn, middleware.isCashier, wrapAsync(cafe.newCategory)) //Page to create category
    .post(middleware.isLoggedIn, middleware.isCashier, wrapAsync(cafe.createCategory)); //Create category

//SPECIFIC ITEM CATEGORY ROUTES
router.route('/category/:id')
    .get(middleware.isLoggedIn, middleware.isCashier, wrapAsync(cafe.viewCategory)) //View category
    .put(middleware.isLoggedIn, middleware.isCashier, wrapAsync(cafe.updateCategory)) //Update category
    .delete(middleware.isLoggedIn, middleware.isMod, wrapAsync(cafe.deleteCategory)); //Delete category

module.exports = router;