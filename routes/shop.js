//Shop routes control the creation of orders, management of the shop, and the creation an modification of items and categories
const express = require('express');
const middleware = require('../middleware');
const wrapAsync = require('../utils/wrapAsync');
const {singleUpload} = require('../middleware/multer');
const shop = require('../controllers/shop'); //Controller
const router = express.Router(); //Router

//GENERAL ROUTES
router.route('/')
    .get(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(shop.index)) //View homepage
    .post(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(middleware.platformPurchasable), wrapAsync(middleware.shopOpen), wrapAsync(shop.order)) //Create new order
    .put(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), middleware.isCashier, wrapAsync(shop.updateSettings)); //Update Name/Description

//View menu or view new order form
router.post('/search-customers', wrapAsync(middleware.isLoggedIn), middleware.isCashier, wrapAsync(shop.searchCustomers)); //Search for cafe customers
router.get('/order', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(middleware.shopOpen), wrapAsync(shop.orderForm));
router.post('/sort', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(middleware.platformPurchasable), middleware.isCashier, wrapAsync(shop.sortItems));
router.put('/order/all', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(middleware.platformPurchasable), middleware.isCashier, wrapAsync(shop.processAll));

//SPECIFIC ORDER ROUTES
router.route('/order/:id')
    .put(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(middleware.platformPurchasable), middleware.isCashier, wrapAsync(shop.processOrder)) //Process order
    .delete(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(middleware.platformPurchasable), wrapAsync(shop.deleteOrder)); //Reject/cancel order

//EC MANAGEMENT ROUTES
router.route('/manage')
    .get(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), middleware.isCashier, wrapAsync(shop.manage)) //Manage shop, view orders or view data
    .put(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(middleware.platformPurchasable), middleware.isCashier, wrapAsync(shop.changeStatus)); //Open/close shop

//GENERAL ITEM ROUTES
router.route('/item')
    .get(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), middleware.isCashier, wrapAsync(shop.newItem)) //Page to create item
    .post(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), middleware.isCashier, singleUpload, wrapAsync(shop.createItem)); //Create item

//SPECIFIC ITEM ROUTES
router.route('/item/:id')
    .get(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), middleware.isCashier, wrapAsync(shop.viewItem)) //View item
    .put(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), singleUpload, wrapAsync(shop.updateItem)) //Update/upvote item
    .delete(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), middleware.isCashier, wrapAsync(shop.deleteItem)); //Delete item

//GENERAL ITEM CATEGORY ROUTES
router.route('/category')
    .get(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), middleware.isCashier, wrapAsync(shop.newCategory)) //Page to create category
    .post(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), middleware.isCashier, wrapAsync(shop.createCategory)); //Create category

//SPECIFIC ITEM CATEGORY ROUTES
router.route('/category/:id')
    .get(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), middleware.isCashier, wrapAsync(shop.viewCategory)) //View category
    .put(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), middleware.isCashier, wrapAsync(shop.updateCategory)) //Update category
    .delete(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(middleware.isMod), wrapAsync(shop.deleteCategory)); //Delete category

//EMAIL CONFIRMATION FOR ORDERS
router.put("/order/confirm/:id", wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(middleware.platformPurchasable), middleware.isCashier, wrapAsync(shop.confirmOrder)) //Confirm order

module.exports = router;