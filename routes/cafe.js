//Cafe routes control the creation of orders, and the creation an modification of items and items types

//LIBRARIES
const express = require('express');
const middleware = require('../middleware');
const router = express.Router();
const dateFormat = require('dateformat');
const {transport, transport_mandatory} = require("../utils/transport");
const convertToLink = require("../utils/convert-to-link");
const {getPopularityCoefficiant, sortByPopularity} = require("../utils/popularity-algorithms");
const getData = require("../utils/cafe-data");

//SCHEMA
const User = require('../models/user');
const Order = require('../models/order');
const Item = require('../models/orderItem');
const Notification = require('../models/message');
const Type = require('../models/itemType');
const Cafe = require('../models/cafe')

//ROUTES
router.get('/', middleware.isLoggedIn, (req, res) => { //RESTful routing 'order/index' route
    (async () => {
        const orders = await Order.find({customer: req.user._id}).populate('items.item'); //Find all of the orders that you have ordered, and populate info on their items
        if (!orders) {
            req.flash('error', "Could not find your orders");
            return res.redirect('back');
        }

        return res.render('cafe/index', {orders});

    })().catch(err => {
        req.flash('error', "Could not find your orders");
        res.redirect('back');
    });
});

router.get('/menu', middleware.isLoggedIn, (req, res) => { //Renders the cafe menu with info on all the items
    (async () => {
        const types = await Type.find({}).populate('items'); //Collects info on every item type, to render (in frontend, the ejs checks each item inside type, and only shows it if it's available)
        if (!types) {
            req.flash('error', "An Error Occurred");
            return res.redirect('back');
        }

        let itemDescriptions = {}; //Object of items and their link-embedded descriptions
        for (let type of types) {
            for (let item of type.items) {
                itemDescriptions[item._id] = convertToLink(item.description);
            }
        }

        return res.render('cafe/menu', {types, itemDescriptions});

    })().catch(err => {
        req.flash('error', "An Error Occurred");
        res.redirect('back');
    });
});

router.put('/upvote', middleware.isLoggedIn, (req, res) => {
    (async () => {
        const item = await Item.findById(req.body.item);
        if (!item) {
            return res.json({error: "Error upvoting item"});
        }

        if (item.upvotes.includes(req.user._id)) {
            item.upvotes.splice(item.upvotes.indexOf(req.user._id), 1);
            await item.save();
            return res.json({success: `Downvoted ${item.name}`, upvoteCount: item.upvotes.length})
        }

        item.upvotes.push(req.user._id);
        await item.save();
        return res.json({success: `Upvoted ${item.name}`, upvoteCount: item.upvotes.length})

    })().catch(err => {
        res.json({error: "An error occurred"});
    });
});

//Track cafe statistics (Commented out for now)
// router.get('/data', middleware.isLoggedIn, middleware.isAdmin, (req, res) => {
//   getData().then(data => {
//     res.render("cafe/data", data);
//   }).catch(err => {
//     req.flash("error", "An Error Occurred");
//     res.redirect("back");
//   });
// });

router.get('/order/new', middleware.isLoggedIn, middleware.cafeOpen, (req, res) => { //RESTFUL routing 'order/new' route
    (async () => {
        const sentOrders = await Order.find({name: `${req.user.firstName} ${req.user.lastName}`, present: true}); //Find all of this user's orders that are currently active
        if (!sentOrders) {
            req.flash('error', "Unable to find orders");
            return res.redirect('back');

        } else if (sentOrders.length > 2) {
            req.flash('error', "You have made the maximum number of orders for the day");
            return res.redirect('back');
        }

        const types = await Type.find({}).populate('items');
        if (!types) {
            req.flash('error', "Unable to find categories");
            return res.redirect('back');
        }

        const allOrders = await Order.find({customer: req.user._id}).populate('items.item'); //Find all of the orders that you have ordered, and populate info on their items
        if (!allOrders) {
            req.flash('error', "Unable to find orders");
            return res.redirect('back');
        }

        let orderedItems = []; //Array of ordered item objects to sort by popularity
        let overlap = false;
        for (let order of allOrders) {
            for (let item of order.items) {
                overlap = false;
                for (let itemObject of orderedItems) {
                    if (itemObject.item.equals(item.item._id)) {
                        itemObject.totalOrdered += item.quantity;
                        overlap = true;
                        break;
                    }
                }
                if (!overlap) {
                    orderedItems.push({
                        item: item.item._id,
                        totalOrdered: item.quantity,
                        created_at: item.item.created_at
                    });
                }
            }
        }

        const frequentItems = sortByPopularity(orderedItems, "totalOrdered", "created_at", ["item"]).popular;
        return res.render('cafe/newOrder', {types, frequentItems});

    })().catch(err => {
        req.flash('error', "An Error Occurred");
        res.redirect('back');
    });
});

router.post('/order', middleware.isLoggedIn, middleware.cafeOpen, (req, res) => { //RESTful routing 'order/create'
    (async () => {
        if (!req.body.check) { //If any items are selected
            req.flash('error', "Cannot send empty order"); //If no items were checked
            return res.redirect('back');
        }

        const sentOrders = await Order.find({name: `${req.user.firstName} ${req.user.lastName}`, present: true});
        if (!sentOrders) {
            req.flash('error', "Unable to find orders");
            return res.redirect('back');
        }

        if (sentOrders.length > 2) { //If more than two orders are already made, you cannot order again
            req.flash('error', "You have made the maximum number of orders for the day");
            return res.redirect('back');
        }

        const orderedItems = await Item.find({_id: {$in: Object.keys(req.body.check)}}); //Find all ordered items
        if (!orderedItems) {
            req.flash('error', 'No items found');
            return res.redirect('back');
        }

        for (let item of orderedItems) { //Search for unavailable items
            if (item.availableItems < parseInt(req.body[item.name])) {
                req.flash("error", "Some items are unavailable in the quantities you requested. Please order again.");
                return res.redirect('back');
            }
        }

        let charge = 0; //Track order charge to compare with balance
        for (let item of orderedItems) {
            item.availableItems -= parseInt(req.body[item.name]);
            charge += (item.price * parseInt(req.body[item.name])); //Increment charge
            item.isAvailable = (item.availableItems > 0);
            await item.save();
        }

        if (!req.body.payingInPerson) {
            if (charge > req.user.balance) { //Check to see if you are ordering more than you can
                req.flash("error", "You do not have enough money in your account to pay for this order. Contact the principal to update your balance.");
                return res.redirect('/cafe');
            }
            req.user.balance -= charge;
            req.user.debt += charge;
            await req.user.save();
        }

        req.flash("success", "Order Sent!");
        return res.redirect('/cafe');

    })().catch(err => {
        console.log(err);
        req.flash('error', "An Error Occurred");
        res.redirect('back');
    });
});

router.get('/orders', middleware.isLoggedIn, middleware.isMod, middleware.isCashier, (req, res) => { //This is for EC Cafe Workers to check all the available orders
    (async () => {
        const orders = await Order.find({present: true}).populate('items.item');
        if (!orders) {
            req.flash('error', 'Could not find orders');
            return res.redirect('back');
        }
        return res.render('cafe/orderDisplay', {orders});

    })().catch(err => {
        req.flash('error', 'An error occurred');
        res.redirect('back');
    });
});

router.delete('/order/:id', middleware.isLoggedIn, middleware.cafeOpen, (req, res) => { //RESTful routing 'order/destroy' (for users to delete an order they no longer want)
    (async () => {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.json({error: 'Could not find order'});
        }

        if (!order.customer.equals(req.user._id)) {
            return res.json({error: 'You can only delete your own orders'});
        }

        const deletedOrder = await Order.findByIdAndDelete(req.params.id).populate("items.item");
        if (!deletedOrder) {
            return res.json({error: 'Could not find order'});
        }

        if (!deletedOrder.payingInPerson) { //Refund balance
            req.user.balance += deletedOrder.charge;
            req.user.debt -= deletedOrder.charge;
            await req.user.save();
        }

        for (let item of deletedOrder.items) { //For each of the order's items, add the number ordered back to that item. (If there are 12 available quesadillas and the  user ordered 3, there are now 15)
            item.item.availableItems += item.quantity;
            item.item.isAvailable = true;
            await item.item.save();
        }

        return res.json({success: 'Successfully canceled'});

    })().catch(err => {
        res.json({error: "An error occurred"});
    });
});

router.post('/:id/ready', middleware.isLoggedIn, middleware.isMod, middleware.isCashier, (req, res) => {
    (async () => {
        const order = await Order.findById(req.params.id).populate('items.item').populate('customer'); //Find the order that is currently being handled based on id, and populate info about its items
        if (!order) {
            return res.json({error: 'Could not find order'});
        }

        const notif = await Notification.create({
            subject: "Cafe Order Ready",
            sender: req.user,
            noReply: true,
            recipients: [order.customer],
            read: [],
            images: []
        });

        if (!notif) {
            return res.json({error: 'Unable to send notification'});
        }

        notif.date = dateFormat(notif.created_at, "h:MM TT | mmm d");

        let itemText = []; //This will have all the decoded info about the order
        for (var i = 0; i < order.items.length; i++) {
            itemText.push(` - ${order.items[i].item.name}: ${order.items[i].quantity} order(s)`);
        }

        //Formats the charge in money format
        const formattedCharge = `$${(order.charge * 100).toString().slice(0, (order.charge * 100).toString().length - 2)}.${(order.charge * 100).toString().slice((order.charge * 100).toString().length - 2)}`;
        notif.text = `Your order is ready to pick up:\n ${itemText.join("\n")} \n\nExtra Instructions: ${order.instructions} \nTotal Cost: ${formattedCharge}`;
        await notif.save();
        transport(order.customer, 'Cafe Order Ready', `<p>Hello ${order.customer.firstName},</p><p>${notif.text}</p>`);

        order.customer.inbox.push(notif); //Add notif to user's inbox
        order.customer.msgCount++;
        await order.customer.save();

        order.present = false; //Order is not active anymore
        await order.save();

        const cafes = await Cafe.find({});
        if (!cafes) {
            return res.json({error: 'Could not find cafe info'});
        }

        cafes[0].revenue += order.charge;
        await cafes[0].save();
        return res.json({success: 'Successfully confirmed order'});

    })().catch(err => {
        console.log(err);
        res.json({error: "An Error Occurred"});
    });
});

router.post('/:id/reject', middleware.isLoggedIn, middleware.isMod, middleware.isCashier, (req, res) => {
    (async () => {
        const order = await Order.findById(req.params.id).populate('items.item').populate('customer');
        if (!order) {
            return res.json({error: 'Could not find order'});
        }

        for (let i of order.items) { //Iterate over each item/quantity object
            i.item.availableItems += i.quantity;
            i.item.isAvailable = true;
            await i.item.save();
        }

        const notif = await Notification.create({
            subject: "Cafe Order Rejected",
            sender: req.user,
            noReply: true,
            recipients: [order.customer],
            read: [],
            images: []
        });
        if (!notif) {
            return res.json({error: 'Could not send notification'});
        }

        notif.date = dateFormat(notif.created_at, "h:MM TT | mmm d");

        let itemText = []; //This will have all the decoded info about the order
        for (var i = 0; i < order.items.length; i++) {
            itemText.push(` - ${order.items[i].item.name}: ${order.items[i].quantity} order(s)`);
        }

        //Formats the charge in money format
        const formattedCharge = `$${(order.charge * 100).toString().slice(0, (order.charge * 100).toString().length - 2)}.${(order.charge * 100).toString().slice((order.charge * 100).toString().length - 2)}`;

        if (req.body.rejectionReason == "") {
            notif.text = `Your order was rejected. This is most likely because we suspect your order is not genuine. Contact us if you think there has been a mistake. No reason was provided for rejection.\n ${itemText.join("\n")} \n\nExtra Instructions: ${order.instructions} \nTotal Cost: ${formattedCharge}`;

        } else {
            notif.text = `Your order was rejected. This is most likely because we suspect your order is not genuine. Contact us if you think there has been a mistake. The reason was provided for rejection was the following: \"${req.body.rejectionReason}\"\n ${itemText.join("\n")} \n\nExtra Instructions: ${order.instructions} \nTotal Cost: ${formattedCharge}`;
        }

        await notif.save();
        transport(order.customer, 'Cafe Order Rejected', `<p>Hello ${order.customer.firstName},</p><p>${notif.text}</p>`);

        //Refund if the transaction is via online balance
        if (!order.payingInPerson) {
            order.customer.balance += order.charge;
            order.customer.debt -= order.charge;
        }

        order.customer.inbox.push(notif); //Add notif to user's inbox
        order.customer.msgCount++;
        await order.customer.save();

        const deletedOrder = await Order.findByIdAndDelete(order._id).populate('items.item').populate('customer');
        if (!deletedOrder) {
            return res.json({error: 'Could not delete order'});
        }

        return res.json({success: 'Successfully rejected order'});

    })().catch(err => {
        res.json({error: "An Error Occurred"});
    });
});

router.get('/manage', middleware.isLoggedIn, middleware.isMod, (req, res) => { //Route to manage cafe
    (async () => {
        const types = await Type.find({}).populate('items'); //Collect info on all the item types
        if (!types) {
            req.flash('error', 'An Error Occurred');
            return res.redirect('back');
        }

        const cafes = await Cafe.find({});
        if (!cafes) {
            req.flash('error', "An Error Occurred");
            return res.redirect('back');
        }

        return res.render('cafe/manage', {types, open: cafes[0].open});

    })().catch(err => {
        req.flash('error', 'An Error Occurred');
        res.redirect('back');
    });
});

router.put('/change-cafe-status', middleware.isLoggedIn, middleware.isMod, (req, res) => { //Open/close cafe
    (async () => {
        const cafes = await Cafe.find({});
        if (!cafes) {
            return res.json({error: "An error occurred"});
        }

        if (cafes[0].open) {
            cafes[0].open = false;
        } else {
            cafes[0].open = true;
        }
        await cafes[0].save();
        return res.json({success: "Succesfully updated cafe", open: cafes[0].open});

    })().catch(err => {
        res.json({error: "An error occurred"});
    });
});

router.get('/item/new', middleware.isLoggedIn, middleware.isMod, (req, res) => { //RESTFUL routing 'item/new'
    (async () => {
        const types = await Type.find({});
        if (!types) {
            req.flash('error', "An Error Occurred");
            return res.redirect("back");
        }

        return res.render('cafe/newOrderItem', {types});

    })().catch(err => {
        req.flash('error', "An Error Occurred");
        res.redirect("back");
    });
});

router.post('/item', middleware.isLoggedIn, middleware.isMod, (req, res) => { //RESTFUL routing 'item/create'
    (async () => {
        const overlap = await Item.find({name: req.body.name});
        if (!overlap) {
            req.flash('error', "Unable to find items");
            return res.redirect('back');
        }

        if (overlap.length > 0) {
            req.flash('error', "Item already exists");
            return res.redirect('back');
        }

        const item = await Item.create({
            name: req.body.name,
            availableItems: parseInt(req.body.available),
            description: req.body.description,
            imgUrl: req.body.image
        });
        if (!item) {
            req.flash('error', "Unable to create item");
            return res.redirect('back');
        }

        //Create charge; once created, add to item's info
        if (parseFloat(req.body.price)) {
            item.price = parseFloat(req.body.price);

        } else {
            item.price = 0.00;
        }

        if (parseInt(req.body.available) > 0) { //Determine is type is available based on whether or not its availability more than 0
            item.isAvailable = true;
        }

        const type = await Type.findOne({name: req.body.type}); //Find the type specified in the form
        if (!type) {
            req.flash('error', "Unable to find correct item type");
            return res.redirect('back');
        }

        await item.save();
        type.items.push(item); //Push this item to that type's item list
        await type.save();
        return res.redirect('/cafe/manage');

    })().catch(err => {
        req.flash('error', "An Error Occurred");
        res.redirect('back');
    });
});

router.get('/item/:id', middleware.isLoggedIn, middleware.isMod, (req, res) => { //View an item's profile
    (async () => {
        const item = await Item.findById(req.params.id);
        if (!item) {
            req.flash('error', "Unable to find item");
            return res.redirect('back')
        }

        const types = await Type.find({});
        if (!types) {
            req.flash('error', "Unable to find item categories");
            return res.redirect('back');
        }

        return res.render('cafe/show', {types, item});

    })().catch(err => {
        req.flash('error', "An Error Occurred");
        res.redirect('back');
    });
});

router.put('/item/:id', middleware.isLoggedIn, middleware.isMod, (req, res) => { //Update an item
    (async () => {
        const overlap = await Item.find({_id: {$ne: req.params.id}, name: req.body.name});
        if (!overlap) {
            req.flash('error', 'Item Not Found');
            return res.redirect('back');
        }

        if (overlap.length > 0) {
            req.flash('error', 'Item With This Name Exists');
            return res.redirect('back');
        }

        const item = await Item.findByIdAndUpdate(req.params.id, {
            name: req.body.name,
            price: parseFloat(req.body.price),
            availableItems: parseInt(req.body.available),
            isAvailable: (parseInt(req.body.available) > 0),
            description: req.body.description,
            imgUrl: req.body.image
        });
        if (!item) {
            req.flash('error', 'item not found');
            return res.redirect('back');
        }

        const activeOrders = await Order.find({present: true}).populate('items.item'); //Any orders that are active will need to change, to accomodate the item changes.
        if (!activeOrders) {
            req.flash('error', "Unable to find active orders");
            return res.redirect('back');
        }

        for (let order of activeOrders) {
            order.charge = 0; //Reset the order's charge, we will have to recalculate

            for (let i = 0; i < order.items.length; i++) { //Iterate over each order, and change its price to match the new item prices
                order.charge += order.items[i].item.price * order.items[i].quantity;
                order.items[i].price = item.price;
            }
            await order.save();
        }

        const types = await Type.find({name: {$ne: req.body.type}}); //Collect all item types
        if (!types) {
            req.flash('error', "Unable to find item categories");
            return res.redirect('back');
        }

        for (let t of types) { //Remove this item from its old item type (if the type has not changed, it's fine because we' add it back in a moment anyway)
            if (t.items.includes(item._id)) {
                t.items.splice(t.items.indexOf(item._id), 1);
            }
            await t.save();
        }

        const type = await Type.findOne({name: req.body.type});  //Add the item to the type which is now specified
        if (!type) {
            req.flash('error', 'Unable to find item category');
            return res.redirect("back");
        }

        if (type.items.includes(item._id)) { //If item is already in type, remove it so you can put the updated type back (we don't know whether the type will be there or not, so it's better to just cover all bases)
            type.items.splice(type.items.indexOf(item._id), 1);
        }

        type.items.push(item);
        await type.save();

        req.flash('success', "Item updated!");
        return res.redirect('/cafe/manage');

    })().catch(err => {
        req.flash('error', "An Error Occurred");
        res.redirect('back');
    });
});

router.delete('/item/:id', middleware.isLoggedIn, middleware.isMod, (req, res) => { //Delete order item
    (async () => {
        const item = await Item.findByIdAndDelete(req.params.id); //Delete item based on specified ID
        if (!item) {
            req.flash('error', 'Could not delete item');
            return res.redirect('back');
        }

        const types = await Type.find({}); //Find all possible types
        if (!types) {
            req.flash('error', "Could not remove item from list of item categories");
            return res.redirect('back');
        }

        for (let type of types) { //If the type includes this item, remove the item from that type's item list
            if (type.items.includes(item._id)) {
                type.items.splice(type.items.indexOf(item._id), 1);
                await type.save();
            }
        }

        const orders = await Order.find({}).populate('items.item');
        if (!orders) {
            req.flash('error', 'Could not find orders');
            return res.redirect('back');
        }

        for (let order of orders) { //If the order includes this item, remove the item from that order's item list
            for (let i of order.items) {
                if (!i.item) {
                    order.items.splice(i, 1);
                }
            }

            order.charge = 0;
            for (let i of order.items) {
                order.charge += (i.item.price * i.quantity);
            }
            await order.save();
        }

        req.flash('success', 'Deleted Item!');
        return res.redirect('/cafe/manage');

    })().catch(err => {
        req.flash('error', "An Error Occurred");
        res.redirect('back');
    });
});

router.get('/type/new', middleware.isLoggedIn, middleware.isMod, (req, res) => { // RESTful route "New" for type
    (async () => {
        const types = await Type.find({}).populate('items'); //Collect info on all the items, so that we can give the user the option to add them to that type
        if (!types) {
            req.flash('error', "Unable to find categories");
            return res.redirect('back');
        }

        return res.render('cafe/newItemType', {types});

    })().catch(err => {
        req.flash('error', "An error occurred");
        res.redirect('back');
    });
});

router.post('/type', middleware.isLoggedIn, middleware.isMod, (req, res) => { // RESTful route "Create" for type
    (async () => {
        const overlap = await Type.find({name: req.body.name}); //Find all item types with this name that already exist
        if (!overlap) {
            req.flash('error', "Unable to find item categories");
            return res.redirect('back');
        }

        if (overlap.length > 0) { //If there are overlapping items
            req.flash('error', "Item Category Already Exists.");
            return res.redirect('back');
        }

        const type = await Type.create({name: req.body.name, items: []});
        if (!type) {
            req.flash('error', "Item Category could not be created");
            return res.redirect('back');
        }

        const types = await Type.find({}); //Found types, but represents all item types
        if (!types) {
            req.flash('error', "Could not find item categories");
            return res.redirect('back');
        }

        for (let t of types) { //Now that we've created the type, we have to remove the newly selected items from all other types
            for (let i = 0; i < t.items.length; i++) {
                if (req.body[t.items[i].toString()]) {
                    t.items.splice(i, 1);
                }
            }
            await t.save();
        }

        const items = await Item.find({}); //Find all items
        if (!items) {
            req.flash('error', 'Could not find items');
            return res.redirect('back');
        }

        for (let item of items) { //If the item is selected, add it to this type (now that we've removed it from all other types)
            if (req.body[item._id.toString()]) {
                type.items.push(item);
            }
        }

        await type.save();
        req.flash('success', "Item Category Created!");
        return res.redirect('/cafe/manage');

    })().catch(err => {
        req.flash('error', "An Error Occurred");
        res.redirect('back');
    });
});

router.get('/type/:id', middleware.isLoggedIn, middleware.isMod, (req, res) => { // RESTful route "Show/Edit" for type
    (async () => {
        const type = await Type.findById(req.params.id).populate('items'); //Find the specified type
        if (!type) {
            req.flash('error', "An Error Occurred");
            return res.redirect('back');
        }

        if (type.name == "Other") {
            req.flash('error', "You cannot modify that category");
            return res.redirect('/cafe/manage');
        }

        const types = await Type.find({_id: {$ne: type._id}}).populate('items'); //Find all items
        if (!types) {
            req.flash('error', "An Error Occurred");
            return res.redirect('back');
        }

        return res.render('cafe/editItemType', {type, types});

    })().catch(err => {
        req.flash('error', "An Error Occurred");
        res.redirect('back');
    });
});

router.put('/type/:id', middleware.isLoggedIn, middleware.isMod, (req, res) => { // RESTful route "Update" for type
    (async () => {
        const overlap = await Type.find({_id: {$ne: req.params.id}, name: req.body.name}); //Find all types besides the one we are editing with the same name
        if (!overlap) {
            req.flash('error', "An Error Occurred");
            return res.redirect('back');
        }

        if (overlap.length > 0) { //If there is overlap
            req.flash('error', "Item category already in database");
            return res.redirect('back');
        }

        const type = await Type.findByIdAndUpdate(req.params.id, {name: req.body.name}); //Update this item type based on the id
        if (!type) {
            req.flash('error', "Unable to update item category");
            return res.redirect('back');
        }

        const otherTypes = await Type.find({_id: {$ne: type._id}}); //Find all other types
        if (!otherTypes) {
            req.flash('error', "Unable to find item categories");
            return res.redirect('back');
        }

        const items = await Item.find({}); //Find all items
        if (!items) {
            req.flash('error', 'Unable to find items');
            return res.redirect('back');
        }

        for (let otherType of otherTypes) { //Iterate over other types
            for (let item of items) {
                if (otherType.items.includes(item._id) && req.body[item._id.toString()] == "on") {
                    otherType.items.splice(otherType.items.indexOf(item._id), 1);
                }
            }
            await otherType.save();
        }

        const other = await Type.findOne({name: "Other"}); //Find type 'other'
        if (!other) {
            req.flash('error', "Unable to find item category 'Other', please add it'");
            res.redirect('back'); //There's nowhere for the type-less items to go unless 'Other' exists
        }

        for (let item of type.items) {
            if (!req.body[item._id.toString()]) { //Item is no longer checked
                other.items.push(item); //Move that item to 'Other'
            }
        }
        await other.save();

        type.items = []; //Empty type and push new items to its items[] array, based on the latest changes
        for (let item of items) {
            if (req.body[item._id.toString()]) {
                type.items.push(item);
            }
        }

        await type.save();
        req.flash('success', "Item category updated!");
        return res.redirect('/cafe/manage');

    })().catch(err => {
        req.flash('error', "An Error Occurred");
        res.redirect('back');
    });
});

router.delete('/type/:id', middleware.isLoggedIn, middleware.isMod, (req, res) => { // RESTful route "Destroy" for type
    (async () => {
        const other = await Type.findOne({name: "Other"}); //Find the type with name 'Other' - we've created this type so that any unselected items go here
        if (!other) {
            req.flash('error', "Unable to find item category 'Other', please add it");
            return res.redirect('back');
        }

        const type = await Type.findByIdAndDelete(req.params.id); //Delete type based on specified ID
        if (!type) {
            req.flash('error', "Unable to find item category");
            return res.redirect('back');
        }

        for (let item of type.items) {
            other.items.push(item);
        }

        await other.save();
        req.flash('success', "Item category deleted!");
        return res.redirect('/cafe/manage');

    })().catch(err => {
        req.flash('error', "An Error Occurred");
        res.redirect('back');
    });
});

module.exports = router;
