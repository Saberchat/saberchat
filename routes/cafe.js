//Cafe routes control the creation of orders, management of the cafe, and the creation an modification of items and item categories

const express = require('express');
const middleware = require('../middleware');
const router = express.Router();
const wrapAsync = require('../utils/wrapAsync');
const {singleUpload} = require('../middleware/multer');
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
    .post(middleware.isLoggedIn, middleware.isCashier, singleUpload, wrapAsync(cafeController.createItem)); //Create item

//SPECIFIC ITEM ROUTES
router.route('/item/:id')
    .get(middleware.isLoggedIn, middleware.isCashier, wrapAsync(cafeController.viewItem)) //View item
    .put(middleware.isLoggedIn, singleUpload, wrapAsync(cafeController.updateItem)) //Update/upvote item
    .delete(middleware.isLoggedIn, middleware.isCashier, wrapAsync(cafeController.deleteItem)); //Delete item

//GENERAL ITEM CATEGORY ROUTES
router.route('/category')
    .get(middleware.isLoggedIn, middleware.isCashier, wrapAsync(cafeController.newCategory)) //Page to create category
    .post(middleware.isLoggedIn, middleware.isCashier, wrapAsync(cafeController.createCategory)); //Create category

//SPECIFIC ITEM CATEGORY ROUTES
router.route('/category/:id')
    .get(middleware.isLoggedIn, middleware.isCashier, wrapAsync(cafeController.viewCategory)) //View category
    .put(middleware.isLoggedIn, middleware.isCashier, wrapAsync(cafeController.updateCategory)) //Update category
    .delete(middleware.isLoggedIn, middleware.isMod, wrapAsync(cafeController.deleteCategory)); //Delete category

module.exports = router;
