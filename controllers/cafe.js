//LIBRARIES
const dateFormat = require('dateformat');
const path = require('path');
const {sendGridEmail} = require("../services/sendGrid");
const { sortByPopularity } = require("../utils/popularity-algorithms");
const {convertToLink} = require("../utils/convert-to-link");
const getData = require("../utils/cafe-data");
const {cloudUpload, cloudDelete} = require('../services/cloudinary');

//SCHEMA
const User = require('../models/user');
const Order = require('../models/cafe/order');
const Item = require('../models/cafe/orderItem');
const Notification = require('../models/inbox/message');
const Category = require('../models/cafe/itemType');
const Cafe = require('../models/cafe/cafe')

//-----------GENERAL ROUTES-----------//

//SHOW CAFE HOMEPAGE
module.exports.index = async function(req, res) {
    const categories = await Category.find({}).populate('items');
    if (!categories) {
        req.flash('error', "Unable to find categories");
        return res.redirect('back');
    }

    const allOrders = await Order.find({customer: req.user._id}).populate('items.item'); //Find all of the orders that you have ordered, and populate info on their items
    if (!allOrders) {
        req.flash('error', "Unable to find orders");
        return res.redirect('back');
    }

    let sortedCategories = [];
    let sortedCategory;
    for (let category of categories) {
        if (category.items.length > 0) {
            sortedCategory = category;
            sortedCategory.items = sortByPopularity(category.items, "upvotes", "created_at", null).popular.concat(sortByPopularity(category.items, "upvotes", "created_at", null).unpopular);
            for (let i = sortedCategory.items.length-1; i > 0; i--) {
                if (!sortedCategory.items[i].isAvailable) {
                    sortedCategory.items.splice(i, 1);
                }
            }
            sortedCategories.push(sortedCategory);
        }
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

    if (req.query.order) { //SHOW NEW ORDER FORM
        const sentOrders = await Order.find({name: `${req.user.firstName} ${req.user.lastName}`, present: true}); //Find all of this user's orders that are currently active
        if (!sentOrders) {
            req.flash('error', "Unable to find orders");
            return res.redirect('back');

        } else if (sentOrders.length > 2) {
            req.flash('error', "You have made the maximum number of orders for the day");
            return res.redirect('back');
        }

        return res.render('cafe/newOrder', {categories: sortedCategories, frequentItems});
    }

    if (req.query.menu) { //SHOW MENU
        const categories = await Category.find({}).populate('items'); //Collects info on every item category, to render (in frontend, the ejs checks each item inside category, and only shows it if it's available)
        if (!categories) {
            req.flash('error', "An Error Occurred");
            return res.redirect('back');
        }

        let fileExtensions = new Map();
        let itemDescriptions = {}; //Object of items and their link-embedded descriptions
        for (let category of categories) {
            for (let item of category.items) {
                itemDescriptions[item._id] = convertToLink(item.description);
                if (item.imageFile.filename) {
                    fileExtensions.set(item.imageFile.url, path.extname(item.imageFile.url.split("SaberChat/")[1]));
                }
            }
        }
        return res.render('cafe/menu', {categories: sortedCategories, itemDescriptions, frequentItems, fileExtensions});
    }
    return res.render('cafe/index', {orders: allOrders});
}

//-----------GENERAL ORDER ROUTES-----------//

//CREATE ORDER
module.exports.order = async function(req, res) {
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
}

//-----------ROUTES FOR SPECIFIC ORDERS-------------//

//PROCESS AND CONFIRM ORDER
module.exports.processOrder = async function(req, res) {
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
    if (order.customer.receiving_emails) {
        await sendGridEmail(order.customer.email, 'Cafe Order Ready', `<p>Hello ${order.customer.firstName},</p><p>${notif.text}</p>`, false);
    }

    order.customer.inbox.push(notif); //Add notif to user's inbox
    order.customer.msgCount++;
    await order.customer.save();

    order.present = false; //Order is not active anymore
    await order.save();

    const cafe = await Cafe.findOne({});
    if (!cafe) {
        return res.json({error: 'Could not find cafe info'});
    }

    cafe.revenue += order.charge;
    await cafe.save();
    return res.json({success: 'Successfully confirmed order'});
}

//REJECT OR CANCEL ORDER
module.exports.deleteOrder = async function(req, res) {
    if (req.body.rejectionReason) {
        if (!req.user.tags.includes("Cashier")) {
            req.flash('error', 'You do not have permission to do that');
            return res.redirect('back');
        }

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
        if (order.customer.receiving_emails) {
            await sendGridEmail(order.customer.email, 'Cafe Order Rejected', `<p>Hello ${order.customer.firstName},</p><p>${notif.text}</p>`, false);
        }

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
    }

    //Cancellation starts here

    const cafe = await Cafe.findOne({});
    if (!cafe) {
        return res.json({error: 'Could not access cafe'});
    }

    if (!cafe.open) {
        return res.json({error: 'The cafe is currently not taking orders'});
    }

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
}

//-----------ROUTES FOR GENERAL ITEMS-------------//

//FORM TO CREATE NEW ITEM
module.exports.newItem = async function(req, res) {
    const categories = await Category.find({});
    if (!categories) {
        req.flash('error', "An Error Occurred");
        return res.redirect("back");
    }

    return res.render('cafe/newOrderItem', {categories});
}

//CREATE NEW ITEM
module.exports.createItem = async function(req, res) {
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
        imgUrl: {url: req.body.image, display: req.body.showImage == "url"}
    });

    if (!item) {
        req.flash('error', "Unable to create item");
        return res.redirect('back');
    }

    item.imageFile.display = req.body.showImage == "upload";

    if (req.files) {
        if (req.files.imageFile) {
            const [cloudErr, cloudResult] = await cloudUpload(req.files.imageFile[0]);
            if (cloudErr || !cloudResult) {
                req.flash('error', 'Upload failed');
                return res.redirect('back');
            }

            // Add info to image file
            item.imageFile = {
                filename: cloudResult.public_id,
                url: cloudResult.secure_url,
                originalName: req.files.imageFile[0].originalname,
                display: req.body.showImage == "upload"
            };
        }
    }

    //Create charge; once created, add to item's info
    if (parseFloat(req.body.price)) {
        item.price = parseFloat(req.body.price);

    } else {
        item.price = 0.00;
    }

    if (parseInt(req.body.available) > 0) { //Determine is category is available based on whether or not its availability more than 0
        item.isAvailable = true;
    }

    const category = await Category.findOne({name: req.body.category}); //Find the category specified in the form
    if (!category) {
        req.flash('error', "Unable to find correct item category");
        return res.redirect('back');
    }

    await item.save();
    category.items.push(item); //Push this item to that category's item list
    await category.save();
    return res.redirect('/cafe/manage');
}

//-----------ROUTES FOR SPECIFIC ITEMS-------------//

//VIEW/EDIT ITEM
module.exports.viewItem = async function(req, res) {
    const item = await Item.findById(req.params.id);
    if (!item) {
        req.flash('error', "Unable to find item");
        return res.redirect('back')
    }

    const categories = await Category.find({});
    if (!categories) {
        req.flash('error', "Unable to find item categories");
        return res.redirect('back');
    }

    let fileExtensions = new Map();
    if (item.imageFile.filename) {
        fileExtensions.set(item.imageFile.url, path.extname(item.imageFile.url.split("SaberChat/")[1]));
    }

    return res.render('cafe/show', {categories, item, fileExtensions});
}

//UPDATE ITEM
module.exports.updateItem = async function(req, res) {
    if (req.body.name) {
        if (!req.user.tags.includes("Cashier")) {
            req.flash('error', 'You do not have permission to do that');
            return res.redirect('back');
        }

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
            imgUrl: {url: req.body.image, display: req.body.showImage == "url"},
        });
        if (!item) {
            req.flash('error', 'item not found');
            return res.redirect('back');
        }

        item.imageFile.display = req.body.showImage == "upload";

        if (req.files) {
            if (req.files.imageFile) {
                let cloudErr;
                let cloudResult;
                if (item.imageFile && item.imageFile.filename) {
                    [cloudErr, cloudResult] = await cloudDelete(item.imageFile.filename, "image");
                    // check for failure
                    if (cloudErr || !cloudResult || cloudResult.result !== 'ok') {
                        req.flash('error', 'Error deleting uploaded image');
                        return res.redirect('back');
                    }
                }

                [cloudErr, cloudResult] = await cloudUpload(req.files.imageFile[0]);
                if (cloudErr || !cloudResult) {
                    req.flash('error', 'Upload failed');
                    return res.redirect('back');
                }

                item.imageFile = {
                    filename: cloudResult.public_id,
                    url: cloudResult.secure_url,
                    originalName: req.files.imageFile[0].originalname,
                    display: false
                };
            }
            await item.save();
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

        const categories = await Category.find({name: {$ne: req.body.category}}); //Collect all item categories
        if (!categories) {
            req.flash('error', "Unable to find item categories");
            return res.redirect('back');
        }

        for (let t of categories) { //Remove this item from its old item category (if the category has not changed, it's fine because we' add it back in a moment anyway)
            if (t.items.includes(item._id)) {
                t.items.splice(t.items.indexOf(item._id), 1);
            }
            await t.save();
        }

        const category = await Category.findOne({name: req.body.category});  //Add the item to the category which is now specified
        if (!category) {
            req.flash('error', 'Unable to find item category');
            return res.redirect("back");
        }

        if (category.items.includes(item._id)) { //If item is already in category, remove it so you can put the updated category back (we don't know whether the category will be there or not, so it's better to just cover all bases)
            category.items.splice(category.items.indexOf(item._id), 1);
        }

        category.items.push(item);
        await category.save();

        req.flash('success', "Item updated!");
        return res.redirect('/cafe/manage');
    }

    const item = await Item.findById(req.params.id);
    if (!item) {
        return res.json({error: "Error upvoting item"});
    }

    if (item.upvotes.includes(req.user._id)) {
        item.upvotes.splice(item.upvotes.indexOf(req.user._id), 1);
        await item.save();
        return res.json({success: `Downvoted ${item.name}`, upvoteCount: item.upvotes.length});
    }

    item.upvotes.push(req.user._id);
    await item.save();
    return res.json({success: `Upvoted ${item.name}`, upvoteCount: item.upvotes.length});
}

//DELETE ITEM
module.exports.deleteItem = async function(req, res) {
    const item = await Item.findByIdAndDelete(req.params.id); //Delete item based on specified ID
    if (!item) {
        req.flash('error', 'Could not delete item');
        return res.redirect('back');
    }

    // delete any uploads
    if (item.imageFile && item.imageFile.filename) {
        if (path.extname(item.imageFile.url.split("SaberChat/")[1]).toLowerCase() == ".mp4") {
            [cloudErr, cloudResult] = await cloudDelete(item.imageFile.filename, "image");
        }
        // check for failure
        if (cloudErr || !cloudResult || cloudResult.result !== 'ok') {
            req.flash('error', 'Error deleting uploaded image');
            return res.redirect('back');
        }
    }

    const categories = await Category.find({}); //Find all possible categories
    if (!categories) {
        req.flash('error', "Could not remove item from list of item categories");
        return res.redirect('back');
    }

    for (let category of categories) { //If the category includes this item, remove the item from that category's item list
        if (category.items.includes(item._id)) {
            category.items.splice(category.items.indexOf(item._id), 1);
            await category.save();
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
}

//-----------ROUTES TO MANAGE CAFE -------------//

//MANAGE CAFE/VIEW ORDERS
module.exports.manage = async function(req, res) {
    if (req.query.orders) { //If route calls to display orders
        const orders = await Order.find({present: true}).populate('items.item');
        if (!orders) {
            req.flash('error', 'Could not find orders');
            return res.redirect('back');
        }
        return res.render('cafe/orderDisplay', {orders});
    }

    if (req.query.data) { //If page calls to display data, commented out for now
        const customers = await User.find({authenticated: true}); if (!customers) {return false;}
        const items = await Item.find({}); if (!items) {return false;}
        const allOrders = await Order.find({}); if (!allOrders) {return false;}

        const data = await getData(customers, items, allOrders);
        if (!data) {
            req.flash("error", "An Error Occurred");
            return res.redirect("back")
        }

        return res.render("cafe/data", data);
    }

    const categories = await Category.find({}).populate('items'); //Collect info on all the item categories
    if (!categories) {
        req.flash('error', 'An Error Occurred');
        return res.redirect('back');
    }

    let sortedCategories = [];
    let sortedCategory;
    for (let category of categories) {
        sortedCategory = category;
        sortedCategory.items = sortByPopularity(category.items, "upvotes", "created_at", null).popular.concat(sortByPopularity(category.items, "upvotes", "created_at", null).unpopular);
        sortedCategories.push(sortedCategory);
    }

    const cafe = await Cafe.findOne({});
    if (!cafe) {
        req.flash('error', "An Error Occurred");
        return res.redirect('back');
    }

    return res.render('cafe/manage', {categories: sortedCategories, open: cafe.open});
}

//OPEN/CLOSE CAFE
module.exports.changeStatus = async function(req, res) {
    const cafe = await Cafe.findOne({});
    if (!cafe) {
        return res.json({error: "An error occurred"});
    }
    cafe.open = (cafe.open == false);
    await cafe.save();
    return res.json({success: "Succesfully updated cafe", open: cafe.open});
}

//-----------ROUTES FOR GENERAL ITEM CATEGORIES-------------//

//FORM TO CREATE NEW ITEM CATEGORY
module.exports.newCategory = async function(req, res) {
    const categories = await Category.find({}).populate('items'); //Collect info on all the items, so that we can give the user the option to add them to that category
    if (!categories) {
        req.flash('error', "Unable to find categories");
        return res.redirect('back');
    }
    return res.render('cafe/newItemCategory', {categories});
}

//CREATE NEW ITEM CATEGORY
module.exports.createCategory = async function(req, res) {
    const overlap = await Category.find({name: req.body.name}); //Find all item categories with this name that already exist
    if (!overlap) {
        req.flash('error', "Unable to find item categories");
        return res.redirect('back');
    }

    if (overlap.length > 0) { //If there are overlapping items
        req.flash('error', "Item Category Already Exists.");
        return res.redirect('back');
    }

    const category = await Category.create({name: req.body.name, items: []});
    if (!category) {
        req.flash('error', "Item Category could not be created");
        return res.redirect('back');
    }

    const categories = await Category.find({}); //Found categories, but represents all item categories
    if (!categories) {
        req.flash('error', "Could not find item categories");
        return res.redirect('back');
    }

    for (let t of categories) { //Now that we've created the category, we have to remove the newly selected items from all other categories
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

    for (let item of items) { //If the item is selected, add it to this category (now that we've removed it from all other categories)
        if (req.body[item._id.toString()]) {
            category.items.push(item);
        }
    }

    await category.save();
    req.flash('success', "Item Category Created!");
    return res.redirect('/cafe/manage');
}

//-----------ROUTES FOR SPECIFIC ITEM CATEGORIES-------------//

//VIEW/EDIT ITEM CATEGORY
module.exports.viewCategory = async function(req, res) {
    const category = await Category.findById(req.params.id).populate('items'); //Find the specified category
    if (!category) {
        req.flash('error', "An Error Occurred");
        return res.redirect('back');
    }

    if (category.name == "Other") {
        req.flash('error', "You cannot modify that category");
        return res.redirect('/cafe/manage');
    }

    const categories = await Category.find({_id: {$ne: category._id}}).populate('items'); //Find all items
    if (!categories) {
        req.flash('error', "An Error Occurred");
        return res.redirect('back');
    }
    return res.render('cafe/editItemCategory', {category, categories});
}

//UPDATE ITEM CATEGORY
module.exports.updateCategory = async function(req, res) {
    const overlap = await Category.find({_id: {$ne: req.params.id}, name: req.body.name}); //Find all categories besides the one we are editing with the same name
    if (!overlap) {
        req.flash('error', "An Error Occurred");
        return res.redirect('back');
    }

    if (overlap.length > 0) { //If there is overlap
        req.flash('error', "Item category already in database");
        return res.redirect('back');
    }

    const category = await Category.findByIdAndUpdate(req.params.id, {name: req.body.name}); //Update this item category based on the id
    if (!category) {
        req.flash('error', "Unable to update item category");
        return res.redirect('back');
    }

    const otherCategories = await Category.find({_id: {$ne: category._id}}); //Find all other categories
    if (!otherCategories) {
        req.flash('error', "Unable to find item categories");
        return res.redirect('back');
    }

    const items = await Item.find({}); //Find all items
    if (!items) {
        req.flash('error', 'Unable to find items');
        return res.redirect('back');
    }

    for (let otherCategory of otherCategories) { //Iterate over other categories
        for (let item of items) {
            if (otherCategory.items.includes(item._id) && req.body[item._id.toString()] == "on") {
                otherCategory.items.splice(otherCategory.items.indexOf(item._id), 1);
            }
        }
        await otherCategory.save();
    }

    const other = await Category.findOne({name: "Other"}); //Find category 'other'
    if (!other) {
        req.flash('error', "Unable to find item category 'Other', please add it'");
        return res.redirect('back'); //There's nowhere for the category-less items to go unless 'Other' exists
    }

    for (let item of category.items) {
        if (!req.body[item._id.toString()]) { //Item is no longer checked
            other.items.push(item); //Move that item to 'Other'
        }
    }
    await other.save();

    category.items = []; //Empty category and push new items to its items[] array, based on the latest changes
    for (let item of items) {
        if (req.body[item._id.toString()]) {
            category.items.push(item);
        }
    }

    await category.save();
    req.flash('success', "Item category updated!");
    return res.redirect('/cafe/manage');
}

//DELETE ITEM CATEGORY
module.exports.deleteCategory = async function(req, res) {
    const other = await Category.findOne({name: "Other"}); //Find the category with name 'Other' - we've created this category so that any unselected items go here
    if (!other) {
        req.flash('error', "Unable to find item category 'Other', please add it");
        return res.redirect('back');
    }

    const category = await Category.findByIdAndDelete(req.params.id); //Delete category based on specified ID
    if (!category) {
        req.flash('error', "Unable to find item category");
        return res.redirect('back');
    }

    for (let item of category.items) {
        other.items.push(item);
    }

    await other.save();
    req.flash('success', "Item category deleted!");
    return res.redirect('/cafe/manage');
}
