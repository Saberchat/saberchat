//LIBRARIES
const dateFormat = require("dateformat");
const path = require("path");
const {sendGridEmail} = require("../services/sendGrid");
const { sortByPopularity } = require("../utils/popularity");
const {convertToLink} = require("../utils/convert-to-link");
const getData = require("../utils/shop-data");
const {objectArrIndex, removeIfIncluded} = require("../utils/object-operations");
const {cloudUpload, cloudDelete} = require("../services/cloudinary");
const setup = require("../utils/setup");
const {autoCompress} = require("../utils/image-compress");

//SCHEMA
const Platform = require("../models/platform");
const Order = require("../models/shop/order");
const Item = require("../models/shop/orderItem");
const {InboxMessage} = require("../models/notification");
const {ItemCategory} = require("../models/category");
const {Market} = require("../models/group");

const controller = {};

//-----------GENERAL ROUTES-----------//

//SHOW CAFE HOMEPAGE
controller.index = async function(req, res) {
    const platform = await setup(Platform);
    const market = await setup(Market);
    const orders = await Order.find({customer: req.user._id}).populate("items.item"); //Find all of the orders that you have ordered, and populate info on their items
    if (!platform || !orders) {
        req.flash("error", "Unable to find orders");
        return res.redirect("back");
    }
    return res.render("shop/index", {market, platform, orders, data: platform.features[objectArrIndex(platform.features, "route", "shop")]});
}

controller.orderForm = async function(req, res) {
    const platform = await setup(Platform);
    const shop = await setup(Market);
    const categories = await ItemCategory.find({_id: {$in: shop.categories}}).populate("items");
    if (!platform || !shop || !categories) {
        req.flash("error", "Unable to find categories");
        return res.redirect("back");
    }

    const allOrders = await Order.find({customer: req.user._id}).populate("items.item"); //Find all of the orders that you have ordered, and populate info on their items
    if (!allOrders) {
        req.flash("error", "Unable to find orders");
        return res.redirect("back");
    }

    sortedCategories = [];
    let sortedCategory;
    for (let category of categories) {
        if (category.items.length > 0) {
            sortedCategory = category;
            sortedCategory.items = sortByPopularity(category.items, "upvotes", "created_at", null).popular.concat(sortByPopularity(category.items, "upvotes", "created_at", null).unpopular);
            for (let i = sortedCategory.items.length-1; i > 0; i--) {
                if (!sortedCategory.items[i].availableItems > 0) {
                    sortedCategory.items.splice(i, 1);
                }
            }
            sortedCategories.push(sortedCategory);
        }
    }

    orderedItems = []; //Array of ordered item objects to sort by popularity
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
    frequentItems = sortByPopularity(orderedItems, "totalOrdered", "created_at", ["item"]).popular;

    if (req.query.order) { //SHOW NEW ORDER FORM
        if (!platform.purchasable || !req.user) {
            req.flash('error', `This feature is not enabled on ${platform.name} Saberchat`);
            return res.redirect('back');        
        }
        
        const sentOrders = await Order.find({name: `${req.user.firstName} ${req.user.lastName}`, present: true}); //Find all of this user"s orders that are currently active
        if (!sentOrders) {
            req.flash("error", "Unable to find orders");
            return res.redirect("back");

        } else if (sentOrders.length > 2) {
            req.flash("error", "You have made the maximum number of orders for the day");
            return res.redirect("back");
        }
        return res.render("shop/newOrder", {platform, categories: sortedCategories, frequentItems, data: platform.features[objectArrIndex(platform.features, "route", "shop")]});
    }

    if (req.query.menu) { //SHOW MENU
        const categories = await ItemCategory.find({_id: {$in: shop.categories}}).populate("items"); //Collects info on every item category, to render (in frontend, the ejs checks each item inside category, and only shows it if it"s available)
        if (!categories) {
            req.flash("error", "An Error Occurred");
            return res.redirect("back");
        }

        let fileExtensions = new Map();
        let itemDescriptions = {}; //Object of items and their link-embedded descriptions
        let itemDescription = [];
        for (let category of categories) {
            for (let item of category.items) {
                itemDescription = [];
                for (let element of convertToLink(item.description).split('\n')) {
                    if (element.split('\r').join('').split(' ').join('') != '') {itemDescription.push(element);}
                }
                itemDescriptions[item._id] = itemDescription;
                if (item.mediaFile.filename) {
                    fileExtensions.set(item.mediaFile.url, path.extname(item.mediaFile.url.split("SaberChat/")[1]));
                }
            }
        }
        return res.render("shop/menu", {platform, categories: sortedCategories, itemDescriptions, frequentItems, fileExtensions, data: platform.features[objectArrIndex(platform.features, "route", "shop")]});
    }
}

//-----------GENERAL ORDER ROUTES-----------//

//CREATE ORDER
controller.order = async function(req, res) {
    const platform = await setup(Platform);
    if (!platform) {
        req.flash("error", "An Error Occurred");
        return res.redirect("back");
    }
    if (!req.body.check) { //If any items are selected
        req.flash("error", "Cannot send empty order"); //If no items were checked
        return res.redirect("back");
    }

    const sentOrders = await Order.find({name: `${req.user.firstName} ${req.user.lastName}`, present: true});
    if (!sentOrders) {
        req.flash("error", "Unable to find orders");
        return res.redirect("back");
    }

    if (sentOrders.length > 2) { //If more than two orders are already made, you cannot order again
        req.flash("error", "You have made the maximum number of orders for the day");
        return res.redirect("back");
    }

    const orderedItems = await Item.find({_id: {$in: Object.keys(req.body.check)}}); //Find all ordered items
    if (!orderedItems) {
        req.flash("error", "No items found");
        return res.redirect("back");
    }

    for (let item of orderedItems) { //Search for unavailable items
        if (item.availableItems < parseInt(req.body[item.name])) {
            req.flash("error", "Some items are unavailable in the quantities you requested. Please order again.");
            return res.redirect("back");
        }
    }

    let charge = 0; //Track order charge to compare with balance
    for (let item of orderedItems) {charge += (item.price * parseInt(req.body[item.name]));} //Increment charge

    if (!req.body.payingInPerson) {
        if (charge > req.user.balance) { //Check to see if you are ordering more than you can
            req.flash("error", `You do not have enough money in your account for this order. Contact a platform ${platform.permissionsDisplay[platform.permissionsDisplay.length-1].toLowerCase()} if there has been a mistake.`);
            return res.redirect("/shop");
        }
        req.user.balance -= charge;
        req.user.debt += charge;
        await req.user.save();
    }

    for (let item of orderedItems) { //Update items
        if (item.displayAvailability) {
            item.availableItems -= parseInt(req.body[item.name]);
            await item.save();
        }
    }

    req.flash("success", "Order Sent!");
    return res.redirect("/shop");
}

//-----------ROUTES FOR SPECIFIC ORDERS-------------//

//PROCESS AND CONFIRM ORDER
controller.confirmOrder = async function(req, res) {
    const platform = await setup(Platform);
    const order = await Order.findByIdAndUpdate(req.params.id, {confirmed: true}).populate("items.item").populate("customer"); //Find the order that is currently being handled based on id, and populate info about its items
    if (!platform || !order) {return res.json({error: "Could not find order"});}

    if (order.customer.receiving_emails) {
        let itemText = []; //This will have all the decoded info about the order
        for (let i = 0; i < order.items.length; i++) {
            itemText.push(` - ${order.items[i].item.name}: ${order.items[i].quantity} order(s)`);
        }

        let emailText = '';
        if (platform.dollarPayment) {
            emailText =  `<p>Your order has been confirmed! Please alert us if there are any problems, etc.<p><p>${itemText.join(", ")}</p><p>Extra Instructions: ${order.instructions}</p><p>Total Cost: $${(order.charge).toFixed(2)}</p>`;
        } else {
            emailText =  `<p>Your order has been confirmed! Please alert us if there are any problems, etc.<p><p>${itemText.join(", ")}</p><p>Extra Instructions: ${order.instructions}</p><p>Total Cost: ${(order.charge)} Credits</p>`;
        }
        if (order.customer.receiving_emails) {
            await sendGridEmail(order.customer.email, "Order Confirmed", `<p>Hello ${order.customer.firstName},</p>${emailText}`, false);
        }
    }
    return res.json({success: "Successfully confirmed email"});
}

controller.processOrder = async function(req, res) {
    const platform = await setup(Platform);
    const order = await Order.findById(req.params.id).populate("items.item").populate("customer"); //Find the order that is currently being handled based on id, and populate info about its items
    if (!platform || !order) {return res.json({error: "Could not find order"});}

    const notif = await InboxMessage.create({
        subject: "Order Ready",
        author: req.user,
        noReply: true,
        recipients: [order.customer],
        read: [],
        images: []
    });

    if (!notif) {return res.json({error: "Unable to send notification"});}
    notif.date = dateFormat(notif.created_at, "h:MM TT | mmm d");

    let itemText = []; //This will have all the decoded info about the order
    for (var i = 0; i < order.items.length; i++) {
        itemText.push(` - ${order.items[i].item.name}: ${order.items[i].quantity} order(s)`);
    }

    //Formats the charge in money format
    let emailText = "";
    if (platform.dollarPayment) {
        notif.text = `Your order is on its way!\n ${itemText.join("\n")} \n\nExtra Instructions: ${order.instructions} \nTotal Cost: $${(order.charge).toFixed(2)}`;
        emailText =  `<p>Your order is on its way!<p><p>${itemText.join(", ")}</p><p>Extra Instructions: ${order.instructions}</p><p>Total Cost: $${(order.charge).toFixed(2)}</p>`;
    } else {
        notif.text = `Your order is on its way!\n ${itemText.join("\n")} \n\nExtra Instructions: ${order.instructions} \nTotal Cost: ${(order.charge)} Credits`;
        emailText =  `<p>Your order is on its way!<p><p>${itemText.join(", ")}</p><p>Extra Instructions: ${order.instructions}</p><p>Total Cost: ${(order.charge)} Credits</p>`;
    }
    await notif.save();
    if (order.customer.receiving_emails) {
        await sendGridEmail(order.customer.email, "Order Ready", `<p>Hello ${order.customer.firstName},</p>${emailText}`, false);
    }

    order.customer.inbox.push({message: notif, new: true}); //Add notif to user"s inbox
    await order.customer.save();
    order.present = false; //Order is not active anymore
    await order.save();

    const shop = await setup(Market);
    if (!shop) {return res.json({error: "Could not find shop info"});}

    shop.revenue += order.charge;
    await shop.save();
    return res.json({success: "Successfully confirmed order"});
}

//REJECT OR CANCEL ORDER
controller.deleteOrder = async function(req, res) {
    if (req.body.rejectionReason) {
        if (!req.user.tags.includes("Cashier")) {return res.json({error: "You do not have permission to do that"});}
        const platform = await setup(Platform);
        const order = await Order.findById(req.params.id).populate("items.item").populate("customer");
        if (!platform || !order) {return res.json({error: "Could not find order"});}

        for (let i of order.items) { //Iterate over each item/quantity object
            if (i.item.displayAvailability) {
                i.item.availableItems += i.quantity;
                await i.item.save();
            }
        }

        const notif = await InboxMessage.create({
            subject: "Order Rejected",
            author: req.user,
            noReply: true,
            recipients: [order.customer],
            read: [],
            images: []
        });
        if (!notif) {return res.json({error: "Could not send notification"});}
        notif.date = dateFormat(notif.created_at, "h:MM TT | mmm d");

        let itemText = []; //This will have all the decoded info about the order
        for (var i = 0; i < order.items.length; i++) {
            itemText.push(` - ${order.items[i].item.name}: ${order.items[i].quantity} order(s)`);
        }

        let emailText = "";
        if (platform.dollarPayment) {
            if (req.body.rejectionReason == '') {
                notif.text = `Your order was rejected. This is most likely because we suspect your order is not genuine. Contact us if you think there has been a mistake. No reason was provided for rejection.\n ${itemText.join("\n")} \n\nExtra Instructions: ${order.instructions} \nTotal Cost: $${(order.charge).toFixed(2)}`;
                emailText = `<p>Your order was rejected. This is most likely because we suspect your order is not genuine. Contact us if you think there has been a mistake. No reason was provided for rejection.</p><p>${itemText.join(", ")}</p><p>Extra Instructions: ${order.instructions}</p><p>Total Cost: $${(order.charge).toFixed(2)}</p>`;
            } else {
                notif.text = `Your order was rejected. This is most likely because we suspect your order is not genuine. Contact us if you think there has been a mistake. The reason was provided for rejection was the following: \"${req.body.rejectionReason}\"\n ${itemText.join("\n")} \n\nExtra Instructions: $${order.instructions} \nTotal Cost: ${(order.charge).toFixed(2)}`;
                emailText = `<p>Your order was rejected. This is most likely because we suspect your order is not genuine. Contact us if you think there has been a mistake. The reason was provided for rejection was the following: "${req.body.rejectionReason}"</p><p>${itemText.join(", ")}</p><p>Extra Instructions: ${order.instructions}</p><p>Total Cost: $${(order.charge).toFixed(2)}</p>`;
            }
        } else {
            if (req.body.rejectionReason == '') {
                notif.text = `Your order was rejected. This is most likely because we suspect your order is not genuine. Contact us if you think there has been a mistake. No reason was provided for rejection.\n ${itemText.join("\n")} \n\nExtra Instructions: ${order.instructions} \nTotal Cost: ${order.charge} Credits`;
                emailText = `<p>Your order was rejected. This is most likely because we suspect your order is not genuine. Contact us if you think there has been a mistake. No reason was provided for rejection.</p><p>${itemText.join(", ")}</p><p>Extra Instructions: ${order.instructions}</p><p>Total Cost: ${order.charge} Credits</p>`;
            } else {
                notif.text = `Your order was rejected. This is most likely because we suspect your order is not genuine. Contact us if you think there has been a mistake. The reason was provided for rejection was the following: \"${req.body.rejectionReason}\"\n ${itemText.join("\n")} \n\nExtra Instructions: ${order.instructions} \nTotal Cost: ${order.charge} Credits`;
                emailText = `<p>Your order was rejected. This is most likely because we suspect your order is not genuine. Contact us if you think there has been a mistake. The reason was provided for rejection was the following: "${req.body.rejectionReason}"</p><p>${itemText.join(", ")}</p><p>Extra Instructions: ${order.instructions}</p><p>Total Cost: ${order.charge} Credits</p>`;
            }
        }

        await notif.save();
        if (order.customer.receiving_emails) {
            await sendGridEmail(order.customer.email, "Order Rejected", `<p>Hello ${order.customer.firstName},</p><p>${notif.text}</p>`, false);
        }

        //Refund if the transaction is via online balance
        if (!order.payingInPerson) {
            order.customer.balance += order.charge;
            order.customer.debt -= order.charge;
        }

        order.customer.inbox.push({message: notif, new: true}); //Add notif to user"s inbox
        await order.customer.save();

        const deletedOrder = await Order.findByIdAndDelete(order._id).populate("items.item").populate("customer");
        if (!deletedOrder) {return res.json({error: "Could not delete order"});}
        return res.json({success: "Successfully rejected order"});
    }

    //Cancellation starts here

    const shop = await setup(Market);
    if (!shop) {return res.json({error: "Could not access shop"});}
    if (!shop.open) { return res.json({error: "We are currently not taking orders"});}

    const order = await Order.findById(req.params.id);
    if (!order) {return res.json({error: "Could not find order"});}
    if (!order.customer.equals(req.user._id)) {return res.json({error: "You can only delete your own orders"});}
    if (order.confirmed) {return res.json({error: "Order has been confirmed"});}

    const deletedOrder = await Order.findByIdAndDelete(req.params.id).populate("items.item");
    if (!deletedOrder) {return res.json({error: "Could not find order"});}

    if (!deletedOrder.payingInPerson) { //Refund balance
        req.user.balance += deletedOrder.charge;
        req.user.debt -= deletedOrder.charge;
        await req.user.save();
    }

    for (let item of deletedOrder.items) { //For each of the order"s items, add the number ordered back to that item. (If there are 12 available quesadillas and the  user ordered 3, there are now 15)
        if (item.item.displayAvailability) {
            item.item.availableItems += item.quantity;
            await item.item.save();
        }
    }
    return res.json({success: "Successfully canceled"});
}

//-----------ROUTES FOR GENERAL ITEMS-------------//

//FORM TO CREATE NEW ITEM
controller.newItem = async function(req, res) {
    const platform = await setup(Platform);
    const categories = await ItemCategory.find({});
    if (!platform || !categories) {
        req.flash("error", "An Error Occurred");
        return res.redirect("back");
    }

    return res.render("shop/newOrderItem", {platform, categories, data: platform.features[objectArrIndex(platform.features, "route", "shop")]});
}

//CREATE NEW ITEM
controller.createItem = async function(req, res) {
    const platform = await setup(Platform);
    const shop = await setup(Market);
    const overlap = await Item.find({name: req.body.name});
    if (!platform || !shop || !overlap) {
        req.flash("error", "Unable to find items");
        return res.redirect("back");
    }

    if (overlap.length > 0) {
        req.flash("error", "Item already exists");
        return res.redirect("back");
    }

    const item = await Item.create({
        name: req.body.name,
        availableItems: parseInt(req.body.available),
        description: req.body.description,
        imgUrl: {url: req.body.image, display: req.body.showImage == "url"},
        imageLink: (req.body.imageLink != undefined),
        displayAvailability: (req.body.displayAvailability != undefined)
    });

    if (!item) {
        req.flash("error", "Unable to create item");
        return res.redirect("back");
    }
    if (!item.displayAvailability) {item.availableItems = 10;}

    item.mediaFile.display = req.body.showImage == "upload";
    if (!platform.purchasable) {item.link = req.body.url;}

    if (req.files) {
        if (req.files.mediaFile) {
            const file = req.files.mediaFile[0];
            const processedBuffer = await autoCompress(file.originalname, file.buffer);
            const [cloudErr, cloudResult] = await cloudUpload(file.originalname, processedBuffer);
            if (cloudErr || !cloudResult) {
                req.flash("error", "Upload failed");
                return res.redirect("back");
            }

            // Add info to image file
            item.mediaFile = {
                filename: cloudResult.public_id,
                url: cloudResult.secure_url,
                originalName: file.originalname,
                display: req.body.showImage == "upload"
            };
        }
    }

    //Create charge; once created, add to item"s info
    if (parseFloat(req.body.price)) {item.price = parseFloat(req.body.price);
    } else {item.price = 0;}

    let category = await ItemCategory.findOne({_id: {$in: shop.categories}, name: req.body.category}); //Find the category specified in the form
    if (!category) {
        category = await ItemCategory.findOne({name: "Other"});
        if (!category) {
            category = await ItemCategory.create({name: "Other"});
            if (!category) {
                req.flash("error", "Unable to find item category");
                return res.redirect("back");
            }
        }
    }

    await item.save();
    category.items.push(item); //Push this item to that category"s item list
    await category.save();
    return res.redirect("/shop/manage");
}

//-----------ROUTES FOR SPECIFIC ITEMS-------------//

//VIEW/EDIT ITEM
controller.viewItem = async function(req, res) {
    const platform = await setup(Platform);
    const item = await Item.findById(req.params.id);
    if (!platform || !item) {
        req.flash("error", "Unable to find item");
        return res.redirect("back")
    }

    const categories = await ItemCategory.find({});
    if (!categories) {
        req.flash("error", "Unable to find item categories");
        return res.redirect("back");
    }

    let fileExtensions = new Map();
    if (item.mediaFile.filename) {
        fileExtensions.set(item.mediaFile.url, path.extname(item.mediaFile.url.split("SaberChat/")[1]));
    }

    return res.render("shop/show", {platform, categories, item, fileExtensions, data: platform.features[objectArrIndex(platform.features, "route", "shop")]});
}

//UPDATE/UPVOTE ITEM
controller.updateItem = async function(req, res) {
    if (req.body.name) {await controller.updateItemInfo(req, res);
    } else {await controller.upvoteItem(req, res);}
}

//DELETE ITEM
controller.deleteItem = async function(req, res) {
    const shop = await setup(Market);
    const item = await Item.findByIdAndDelete(req.params.id); //Delete item based on specified ID
    if (!item) {
        req.flash("error", "Could not delete item");
        return res.redirect("back");
    }

    // delete any uploads
    if (item.mediaFile && item.mediaFile.filename) {
        [cloudErr, cloudResult] = await cloudDelete(item.mediaFile.filename, "image");
        if (cloudErr || !cloudResult || cloudResult.result !== "ok") {
            req.flash("error", "Error deleting uploaded image");
            return res.redirect("back");
        }
    }

    const categories = await ItemCategory.find({_id: {$in: shop.categories}});
    if (!categories) {
        req.flash("error", "Could not remove item from list of item categories");
        return res.redirect("back");
    }

    for (let category of categories) { //If the category includes this item, remove the item from that category"s item list
        removeIfIncluded(category.items, item._id);
        await category.save();
    }

    const orders = await Order.find({}).populate("items.item");
    if (!orders) {
        req.flash("error", "Could not find orders");
        return res.redirect("back");
    }

    for (let order of orders) { //If the order includes this item, remove the item from that order"s item list
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

    req.flash("success", "Deleted Item!");
    return res.redirect("/shop/manage");
}

//-----------ROUTES TO MANAGE CAFE -------------//

//MANAGE CAFE/VIEW ORDERS
controller.manage = async function(req, res) {
    if (req.query.orders) { //If route calls to display orders
        await controller.manageOrders(req, res);

    } else if (req.query.data) { //If route calls to display data
        const platform = await setup(Platform);
        if (!platform.purchasable) {
            req.flash('error', `This feature is not enabled on ${platform.name} Saberchat`);
            return res.redirect('back');        
        }

        const market = await setup(Market);
        const customers = await User.find({authenticated: true}); if (!customers) {return false;}
        const items = await Item.find({}); if (!items) {return false;}
        const allOrders = await Order.find({}); if (!allOrders) {return false;}

        const data = await getData(customers, items, allOrders);
        if (!data) {
            req.flash("error", "An Error Occurred");
            return res.redirect("back")
        }
        data.platform = platform;
        data.market = market;
        data.data = platform.features[objectArrIndex(platform.features, "route", "shop")];
        return res.render("shop/data", data);

    } else { //If route calls to display regular management
        await controller.manageShop(req, res);
    }
}

//OPEN/CLOSE CAFE
controller.changeStatus = async function(req, res) {
    const shop = await setup(Market);
    if (!shop) {return res.json({error: "An error occurred"});}
    shop.open = !shop.open;
    await shop.save();
    return res.json({success: "Succesfully updated shop", open: shop.open});
}

controller.updateSettings = async function(req, res) {
    const platform = await setup(Platform);
    if (!platform) {
        req.flash("error", "Could not access platform");
        return res.redirect("back");
    }

    for (let attr of ["name", "description"]) {
        platform.features[objectArrIndex(platform.features, "route", "shop")][attr] = req.body[attr];
    }
    await platform.save();
    req.flash("success", "Updated Settings!");
    return res.redirect("/shop/manage");
}

//-----------ROUTES FOR GENERAL ITEM CATEGORIES-------------//

//FORM TO CREATE NEW ITEM CATEGORY
controller.newCategory = async function(req, res) {
    const platform = await setup(Platform);
    const shop = await setup(Market);
    const categories = await ItemCategory.find({_id: {$in: shop.categories}}).populate("items"); //Collect info on all the items, so that we can give the user the option to add them to that category
    if (!platform || !shop || !categories) {
        req.flash("error", "Unable to find categories");
        return res.redirect("back");
    }
    return res.render("shop/newItemCategory", {platform, categories, data: platform.features[objectArrIndex(platform.features, "route", "shop")]});
}

//CREATE NEW ITEM CATEGORY
controller.createCategory = async function(req, res) {
    const shop = await setup(Market);
    const overlap = await ItemCategory.find({_id: {$in: shop.categories}, name: req.body.name}); //Find all item categories with this name that already exist
    if (!overlap) {
        req.flash("error", "Unable to find item categories");
        return res.redirect("back");
    }

    if (overlap.length > 0) { //If there are overlapping items
        req.flash("error", "Item Category Already Exists.");
        return res.redirect("back");
    }

    const category = await ItemCategory.create({name: req.body.name, items: []});
    if (!category) {
        req.flash("error", "Item Category could not be created");
        return res.redirect("back");
    }

    shop.categories.push(category); //Add category to shop's settings
    await shop.save();

    const categories = await ItemCategory.find({_id: {$in: shop.categories}}); //Found categories, but represents all item categories
    if (!categories) {
        req.flash("error", "Could not find item categories");
        return res.redirect("back");
    }

    for (let t of categories) { //Now that we"ve created the category, we have to remove the newly selected items from all other categories
        for (let i = 0; i < t.items.length; i++) {
            if (req.body[t.items[i].toString()]) {
                t.items.splice(i, 1);
            }
        }
        await t.save();
    }

    const items = await Item.find({}); //Find all items
    if (!items) {
        req.flash("error", "Could not find items");
        return res.redirect("back");
    }

    for (let item of items) { //If the item is selected, add it to this category (now that we"ve removed it from all other categories)
        if (req.body[item._id.toString()]) {
            category.items.push(item);
        }
    }

    await category.save();
    req.flash("success", "Item Category Created!");
    return res.redirect("/shop/manage");
}

//-----------ROUTES FOR SPECIFIC ITEM CATEGORIES-------------//

//VIEW/EDIT ITEM CATEGORY
controller.viewCategory = async function(req, res) {
    const platform = await setup(Platform);
    const category = await ItemCategory.findById(req.params.id).populate("items"); //Find the specified category
    if (!platform || !category) {
        req.flash("error", "An Error Occurred");
        return res.redirect("back");
    }

    if (category.name == "Other") {
        req.flash("error", "You cannot modify that category");
        return res.redirect("/shop/manage");
    }

    const categories = await ItemCategory.find({_id: {$ne: category._id}}).populate("items"); //Find all items
    if (!categories) {
        req.flash("error", "An Error Occurred");
        return res.redirect("back");
    }
    return res.render("shop/editItemCategory", {platform, category, categories, data: platform.features[objectArrIndex(platform.features, "route", "shop")]});
}

//UPDATE ITEM CATEGORY
controller.updateCategory = async function(req, res) {
    const shop = await setup(Market);
    const overlap = await ItemCategory.find({_id: {$in: shop.categories, $ne: req.params.id}, name: req.body.name}); //Find all categories besides the one we are editing with the same name
    if (!overlap) {
        req.flash("error", "An Error Occurred");
        return res.redirect("back");
    }

    if (overlap.length > 0) { //If there is overlap
        req.flash("error", "Item category already in database");
        return res.redirect("back");
    }

    const category = await ItemCategory.findByIdAndUpdate(req.params.id, {name: req.body.name}); //Update this item category based on the id
    if (!category) {
        req.flash("error", "Unable to update item category");
        return res.redirect("back");
    }

    const otherCategories = await ItemCategory.find({_id: {$in: shop.categories, $ne: category._id}}); //Find all other categories
    if (!otherCategories) {
        req.flash("error", "Unable to find item categories");
        return res.redirect("back");
    }

    const items = await Item.find({}); //Find all items
    if (!items) {
        req.flash("error", "Unable to find items");
        return res.redirect("back");
    }

    for (let otherCategory of otherCategories) { //Iterate over other categories
        for (let item of items) {
            if (otherCategory.items.includes(item._id) && req.body[item._id.toString()] == "on") {
                otherCategory.items.splice(otherCategory.items.indexOf(item._id), 1);
            }
        }
        await otherCategory.save();
    }

    let other = await ItemCategory.findOne({_id: {$in: shop.categories}, name: "Other"}); //Find category "other"
    if (!other) {
        other = await ItemCategory.create({name: "Other"}); //If it does not exist, create it category "other"
        if (!other) {
            req.flash("error", "Item Category could not be created");
            return res.redirect("back");
        }
    }

    for (let item of category.items) {
        if (!req.body[item._id.toString()]) { //Item is no longer checked
            other.items.push(item); //Move that item to "Other"
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
    req.flash("success", "Item category updated!");
    return res.redirect("/shop/manage");
}

//DELETE ITEM CATEGORY
controller.deleteCategory = async function(req, res) {
    const shop = await setup(Market);
    let other = await ItemCategory.findOne({_id: {$in: shop.categories}, name: "Other"}); //Find the category with name "Other" - all unselected items go there
    if (!other) {
        other = await ItemCategory.create({name: "Other"}); //If it does not exist, create it category "other"
        if (!other) {
            req.flash("error", "Item category could not be created");
            return res.redirect("back");
        }
    }

    const category = await ItemCategory.findByIdAndDelete(req.params.id); //Delete category based on specified ID
    if (!category) {
        req.flash("error", "Unable to find item category");
        return res.redirect("back");
    }

    removeIfIncluded(shop.categories, category._id);
    await shop.save();

    for (let item of category.items) {
        other.items.push(item);
    }

    await other.save();
    req.flash("success", "Item category deleted!");
    return res.redirect("/shop/manage");
}

controller.upvoteItem = async function(req, res) {
    const item = await Item.findById(req.params.id);
    if (!item) {
        return res.json({error: "Error upvoting item"});
    }

    if (removeIfIncluded(item.upvotes, req.user._id)) {
        await item.save();
        return res.json({success: `Downvoted ${item.name}`, upvoteCount: item.upvotes.length});
    }

    item.upvotes.push(req.user._id);
    await item.save();
    return res.json({success: `Upvoted ${item.name}`, upvoteCount: item.upvotes.length});
}

controller.updateItemInfo = async function(req, res) {
    if (!req.user.tags.includes("Cashier")) {
        req.flash("error", "You do not have permission to do that");
        return res.redirect("back");
    }

    const platform = await setup(Platform);
    const shop = await setup(Market);
    const overlap = await Item.find({_id: {$ne: req.params.id}, name: req.body.name});
    if (!platform || !shop || !overlap) {
        req.flash("error", "Item Not Found");
        return res.redirect("back");
    }

    if (overlap.length > 0) {
        req.flash("error", "Item With This Name Exists");
        return res.redirect("back");
    }
    const item = await Item.findByIdAndUpdate(req.params.id, {
        name: req.body.name,
        price: parseFloat(req.body.price),
        availableItems: parseInt(req.body.available),
        description: req.body.description,
        imgUrl: {url: req.body.image, display: req.body.showImage == "url"},
        imageLink: (req.body.imageLink != undefined),
        displayAvailability: (req.body.displayAvailability != undefined)
    });
    if (!item) {
        req.flash("error", "item not found");
        return res.redirect("back");
    }

    if (!item.displayAvailability) {item.availableItems = 10;}
    if (!platform.purchasable) {item.link = req.body.url;}
    item.mediaFile.display = req.body.showImage == "upload";
    if (req.files) {
        if (req.files.mediaFile) {
            let cloudErr;
            let cloudResult;
            if (item.mediaFile && item.mediaFile.filename) {
                [cloudErr, cloudResult] = await cloudDelete(item.mediaFile.filename, "image");
                // check for failure
                if (cloudErr || !cloudResult || cloudResult.result !== "ok") {
                    req.flash("error", "Error deleting uploaded image");
                    return res.redirect("back");
                }
            }
            
            const file = req.files.mediaFile[0];
            const processedBuffer = await autoCompress(file.originalname, file.buffer);
            [cloudErr, cloudResult] = await cloudUpload(file.originalname, processedBuffer);

            if (cloudErr || !cloudResult) {
                req.flash("error", "Upload failed");
                return res.redirect("back");
            }

            item.mediaFile = {
                filename: cloudResult.public_id,
                url: cloudResult.secure_url,
                originalName: file.originalname,
                display: false
            };
        }
        await item.save();
    }

    const activeOrders = await Order.find({present: true}).populate("items.item"); //Any orders that are active will need to change, to accomodate the item changes.
    if (!activeOrders) {
        req.flash("error", "Unable to find active orders");
        return res.redirect("back");
    }

    for (let order of activeOrders) {
        order.charge = 0; //Reset the order"s charge, we will have to recalculate

        for (let i = 0; i < order.items.length; i++) { //Iterate over each order, and change its price to match the new item prices
            order.charge += order.items[i].item.price * order.items[i].quantity;
            order.items[i].price = item.price;
        }
        await order.save();
    }

    const categories = await ItemCategory.find({_id: {$in: shop.categories}, name: {$ne: req.body.category}}); //Collect all item categories
    if (!categories) {
        req.flash("error", "Unable to find item categories");
        return res.redirect("back");
    }

    for (let t of categories) { //Remove this item from its old item category (if the category has not changed, it"s fine because we" add it back in a moment anyway)
        removeIfIncluded(t.items, item._id);
        await t.save();
    }

    let category = await ItemCategory.findOne({_id: {$in: shop.categories}, name: req.body.category}); //Find the category specified in the form
    if (!category) {
        category = await ItemCategory.findOne({name: "Other"});
        if (!category) {
            category = await ItemCategory.create({name: "Other"});
            if (!category) {
                req.flash("error", "Unable to find item category");
                return res.redirect("back");
            }
        }
    }

    removeIfIncluded(category.items, item._id); //If item is already in category, remove it so you can put the updated category back (we don"t know whether the category will be there or not, so it"s better to just cover all bases)
    category.items.push(item);
    await category.save();

    req.flash("success", "Item updated!");
    return res.redirect("/shop/manage");
}

controller.manageShop = async function(req, res) {
    const platform = await setup(Platform);
    const shop = await setup(Market);
    const categories = await ItemCategory.find({_id: {$in: shop.categories}}).populate("items"); //Collect info on all the item categories
    if (!platform || !shop || !categories) {
        req.flash("error", "An Error Occurred");
        return res.redirect("back");
    }

    let sortedCategories = [];
    let sortedCategory;
    for (let category of categories) {
        sortedCategory = category;
        sortedCategory.items = sortByPopularity(category.items, "upvotes", "created_at", null).popular.concat(sortByPopularity(category.items, "upvotes", "created_at", null).unpopular);
        sortedCategories.push(sortedCategory);
    }

    return res.render("shop/manage", {platform, categories: sortedCategories, open: shop.open, data: platform.features[objectArrIndex(platform.features, "route", "shop")]});
}

controller.manageOrders = async function(req, res) {
    const platform = await setup(Platform);
    if (!platform.purchasable) {
        req.flash('error', `This feature is not enabled on ${platform.name} Saberchat`);
        return res.redirect('back');        
    }

    const orders = await Order.find({present: true}).populate("items.item");
    if (!platform || !orders) {
        req.flash("error", "Could not find orders");
        return res.redirect("back");
    }
    return res.render("shop/orderDisplay", {platform, orders, data: platform.features[objectArrIndex(platform.features, "route", "shop")]});
}

module.exports = controller;