//LIBRARIES
const dateFormat = require("dateformat");
const path = require("path");
const {sendGridEmail} = require("../services/sendGrid");
const { sortByPopularity } = require("../utils/popularity");
const {convertToLink} = require("../utils/convert-to-link");
const getData = require("../utils/shop-data");
const {objectArrIndex, removeIfIncluded, parsePropertyArray} = require("../utils/object-operations");
const {cloudUpload, cloudDelete} = require("../services/cloudinary");
const setup = require("../utils/setup");
const {autoCompress} = require("../utils/image-compress");
const {quicksort} = require("../utils/sort");

//SCHEMA
const Platform = require("../models/platform");
const User = require("../models/user");
const Order = require("../models/shop/order");
const Item = require("../models/shop/orderItem");
const {InboxMessage} = require("../models/notification");
const {ItemCategory} = require("../models/category");
const {Market} = require("../models/group");

const controller = {};

//-----------GENERAL ROUTES-----------//

//Display shop homepage
controller.index = async function(req, res) {
    if (req.user.tags.includes("Cashier")) {return controller.manage(req, res);} //Redirect to cashier control panel

    //Find all of the current user's have ordered, and populate info on their items
    const platform = await setup(Platform);
    const market = await setup(Market);
    const orders = await Order.find({customer: req.user._id}).populate("items.item");
    if (!platform || !orders) {
        await req.flash("error", "Unable to find orders");
        return res.redirect("back");
    }
    
    //Display shop homepage form (with current orders and option to navigate to menu/new orders)
    return res.render("shop/index", {market, platform, orders, data: platform.features[await objectArrIndex(platform.features, "route", "shop")]});
}

//Display item ordering form
controller.orderForm = async function(req, res) {
    //Access item categories and populate info on ordering items
    const platform = await setup(Platform);
    const shop = await setup(Market);
    const categories = await ItemCategory.find({_id: {$in: shop.categories}}).populate("items");
    if (!platform || !shop || !categories) {
        await req.flash("error", "Unable to find categories");
        return res.redirect("back");
    }

    //Find all of the user's current orders, and populate info on their items
    const allOrders = await Order.find({customer: req.user._id}).populate("items.item");
    if (!allOrders) {
        await req.flash("error", "Unable to find orders");
        return res.redirect("back");
    }

    //Iterate through each category's items and sort them alphabetically
    let sortedCategories = [];
    let sortedCategory;
    for (let category of categories) {
        if (category.items.length > 0) {
            sortedCategory = category;
            await quicksort(sortedCategory.items, 0, sortedCategory.items.length-1, "name"); //Call quicksort with item 'name' property
            for (let i = sortedCategory.items.length-1; i > 0; i--) {
                if (!sortedCategory.items[i].availableItems > 0) { //Remove all unavailable items from display
                    await sortedCategory.items.splice(i, 1);
                }
            }
            await sortedCategories.push(sortedCategory); //Add all sorted items to category list
        }
    }

    //Calculate which items are the most frequently ordered
    const orderedItems = new Map();
    let overlap = false;
    for (let order of allOrders) { //Iterate through each order's items and add their data to the map
        for (let item of order.items) { 
            overlap = false;
            if (await orderedItems.has(item.item._id)) { //If the map includes the item, update quantity
                overlap = true;
                orderedItems.get(item.item._id).totalOrdered += item.quantity;
            }
            if (!overlap) { //If the item is not in the map, set it
                orderedItems.set(item.item._id, {
                    item: item.item._id,
                    totalOrdered: item.quantity,
                    created_at: item.item.created_at
                });
            }
        }
    }
    //Sort items and find the most popular ones
    const frequentItems = await sortByPopularity(Array.from(orderedItems.values()), "totalOrdered", "created_at", ["item"]).popular;

    if (req.query.order) { //Display ordering form
        if (req.user.tags.includes("Cashier")) { //At the moment, only cashiers may place orders
            if (!platform.purchasable || !req.user) {
                await req.flash('error', `This feature is not enabled on ${platform.name} Saberchat`); //If ordering is not enabled
                return res.redirect('back');        
            }
            
            const sentOrders = await Order.find({name: `${req.user.firstName} ${req.user.lastName}`, present: true}); //Find all of this user"s orders that are currently active
            if (!sentOrders) {
                await req.flash("error", "Unable to find orders");
                return res.redirect("back");

            } else if (sentOrders.length > 3) { //If user has made maximum number of orders for the day
                await req.flash("error", "You have made the maximum number of orders for the day");
                return res.redirect("back");
            }
            //Order form display
            return res.render("shop/newOrder", {platform, categories: sortedCategories, frequentItems, data: platform.features[await objectArrIndex(platform.features, "route", "shop")]});
        }
        await req.flash("error", "You do not have permission to do that");
        return res.redirect("back");
    }

    if (req.query.menu) { //Display menu
        //Collects info on every item category, to render (in frontend, the ejs checks each item inside category, and only shows it if it"s available)
        const categories = await ItemCategory.find({_id: {$in: shop.categories}}).populate("items");
        if (!categories) {
            await req.flash("error", "An Error Occurred");
            return res.redirect("back");
        }

        let fileExtensions = new Map(); //Store each item and its image's filetype
        let itemDescriptions = {}; //Object of items and their link-embedded descriptions
        let itemDescription = [];
        for (let category of categories) {
            for (let item of category.items) {
                itemDescription = [];
                for (let element of await convertToLink(item.description).split('\n')) { //Add description elements
                    if ((await element.split('\r').join('').split(' ').join('')) != '') {await itemDescription.push(element);}
                }
                itemDescriptions[item._id] = itemDescription;
                if (item.mediaFile.filename) { //Set each URL to its corresponding filetype (inverse bucket sort mapping)
                    await fileExtensions.set(item.mediaFile.url, await path.extname(await item.mediaFile.url.split("SaberChat/")[1]));
                }
            }
        }
        //Display menu with item 
        return res.render("shop/menu", {platform, categories: sortedCategories, itemDescriptions, frequentItems, fileExtensions, data: platform.features[await objectArrIndex(platform.features, "route", "shop")]});
    }
}

//Sort items based on specific parameter setting
controller.sortItems = async function(req, res) {
    let items = await Item.find({});
    if (!items) {return res.json({error: "An error occurred"});}
     
    for (let setting of [ //Iterate through each setting combination and sort accordingly
        ["Alphabetic Order", "name", false], //Sort by alphabetical order of name
        ["Ordering Frequency", "orderCount", true], //Sort by frequency of orders
        ["Item Availability", "availableItems", true], //Sort by number available (most to least)
        ["Price", "price", false], //Sort by cost (least to most)
        ["Upvotes", "upvotes", true], //Sort by upvotest (most to least)
        ["Date Created", "created_at", true] //Sort by date created (most recent to earliest)
    ]) {
        if (req.body.setting == setting[0]) { //Iterate through each setting 
            await quicksort(items, 0, items.length-1, setting[1]); //Sort based on provided setting
            if (setting[2]) {await items.reverse();} //Reverse if display requires most->least
            return res.json({success: "Successfully sorted", sorted: parsePropertyArray(items, "_id", true)}); //Send the newly sorted data to frontend
        }
    }
    return res.json({error: "Unable to find setting"});
}

//Shop customer search
controller.searchCustomers = async function(req, res) {
    const platform = await setup(Platform);
    if (!platform) {return res.json({error: "An error occurred"});}

    //Collect user data based on form
    let users = await User.find({authenticated: true});
    if (!users) {return res.json({error: "An error occurred"});}

    let customers = []; //Store customers with their respective balance data
    for (let user of users) { //Iterate through usernames and search for matches
        if (await `${user.firstName} ${user.lastName} ${user.username}`.toLowerCase().includes(await req.body.text.toLowerCase())) {
            await customers.push({ //Add user to array, using username as display, and id as id value
                displayValue: `${user.firstName} ${user.lastName} (${user.username})`, 
                idValue: user._id,
                balance: user.balance
            });
        }
    }

    return res.json({success: "Successfully collected data", customers}); //Send data to frontend
}

//-----------GENERAL ORDER ROUTES-----------//

//Create order (separate from socket)
controller.order = async function(req, res) {
    const platform = await setup(Platform); //Configure platform schema
    if (!platform) {
        await req.flash("error", "An Error Occurred");
        return res.redirect("back");
    }

    let user; //Access user profile
    if (req.body.customer_id) {
        user = await User.findById(req.body.customer_id.split(' ')[0]);
        if (!user) {
            req.flash("error", "An Error Occurred");
            return res.redirect("back");
        }
    } else {user = req.user};

    if (!req.body.check) { //If any items are selected
        await req.flash("error", "Cannot send empty order"); //If no items were checked
        return res.redirect("back");
    }

    const sentOrders = await Order.find({customer: user._id, present: true}); //Access current active orders
    if (!sentOrders) {
        await req.flash("error", "Unable to find orders");
        return res.redirect("back");
    }

    if (sentOrders.length >= 3) { //If three orders are already made, you cannot order again
        await req.flash("error", "You have made the maximum number of orders for the day");
        return res.redirect("back");
    }

    const orderedItems = await Item.find({_id: {$in: Object.keys(req.body.check)}}); //Find all ordered items
    if (!orderedItems) {
        await req.flash("error", "No items found");
        return res.redirect("back");
    }

    for (let item of orderedItems) { //Search for unavailable items
        if (item.availableItems < await parseInt(req.body[item.name])) {
            await req.flash("error", "Some items are unavailable in the quantities you requested. Please order again.");
            return res.redirect("back");
        }
    }

    let charge = 0; //Track order charge to compare with balance
    for (let item of orderedItems) {charge += (item.price * await parseInt(req.body[item.name]));} //Increment charge

    if (!req.body.payingInPerson) {
        if (charge > user.balance) { //Check to see if user is ordering more than they can
            await req.flash("error", `You do not have enough money in your account for this order. Contact a platform ${await platform.permissionsDisplay[platform.permissionsDisplay.length-1].toLowerCase()} if there has been a mistake.`);
            return res.redirect("/shop");
        }
        user.balance -= charge; //Decrement balance
        user.debt += charge;
        await user.save();
    }

    for (let item of orderedItems) { //Update items' availability and order count
        if (platform.displayAvailability && item.displayAvailability) { //If availability is supposed to be displayed
            item.availableItems -= await parseInt(req.body[item.name]);
            item.orderCount += await parseInt(req.body[item.name]);
            await item.save();
        }
    }

    //Frontend display message
    await req.flash("success", "Order Sent!");
    if (req.user.tags.includes("Cashier")) {
        return res.redirect("/shop/manage?orders=true");
    }
    return res.redirect("/shop");
}

//-----------ROUTES FOR SPECIFIC ORDERS-------------//

//Process and confirm order
controller.confirmOrder = async function(req, res) {
    const platform = await setup(Platform);
    const order = await Order.findByIdAndUpdate(req.params.id, {confirmed: true}).populate("items.item").populate("customer"); //Find the order that is currently being handled based on id, and populate info about its items
    if (!platform || !order) {return res.json({error: "Could not find order"});}

    if (order.customer.receiving_emails) {
        let itemText = []; //This will have all the decoded info about the order
        for (let i = 0; i < order.items.length; i++) {
            await itemText.push(` - ${order.items[i].item.name}: ${order.items[i].quantity} order(s)`);
        }

        let emailText = '';
        if (platform.dollarPayment) {
            emailText =  `<p>Your order has been confirmed! Please alert us if there are any problems, etc.<p><p>${await itemText.join(", ")}</p><p>Extra Instructions: ${order.instructions}</p><p>Total Cost: $${await (order.charge).toFixed(2)}</p>`;
        } else {
            emailText =  `<p>Your order has been confirmed! Please alert us if there are any problems, etc.<p><p>${await itemText.join(", ")}</p><p>Extra Instructions: ${order.instructions}</p><p>Total Cost: ${(order.charge)} Credits</p>`;
        }
        if (order.customer.receiving_emails) {
            // TEMPORARY EMAIL MUTE - Nov 11 Dmitry
            //await sendGridEmail(order.customer.email, "Order Confirmed", `<p>Hello ${order.customer.firstName},</p>${emailText}`, false);
        }
    }
    return res.json({success: "Successfully confirmed email"});
}

//Process all currently active orders
controller.processAll = async function(req, res) {
    const platform = await setup(Platform);
    const shop = await setup(Market);
    const orders = await Order.find({present: true}).populate("items.item").populate("customer"); //Find all active orders
    if (!platform || !shop || !orders) {
        await req.flash("error", "Unable to find orders");
        return res.redirect("back");
    }
    
    //Temporary message variables that get changed throughout loop
    let notif;
    let itemText;
    let emailText;

    for (let order of orders) { //Iterate through orders, update their data, and send messages to their customers
        notif = await InboxMessage.create({
            subject: "Order Ready", author: req.user, noReply: true,
            recipients: [order.customer], read: [], images: []
        });
        if (!notif) {
            await req.flash("error", "Unable to create notification");
            return res.redirect("back");
        }
        notif.date = await dateFormat(notif.created_at, "h:MM TT | mmm d");

        itemText = []; //This will have all the decoded info about the order
        for (let i = 0; i < order.items.length; i++) {
            await itemText.push(` - ${order.items[i].item.name}: ${order.items[i].quantity} order(s)`);
        }

        emailText = ""; //Formats the charge in money format
        if (platform.dollarPayment) {
            notif.text = `Your order is on its way!\n ${await itemText.join("\n")} \n\nExtra Instructions: ${order.instructions} \nTotal Cost: $${await (order.charge).toFixed(2)}`;
            emailText =  `<p>Your order is on its way!<p><p>${await itemText.join(", ")}</p><p>Extra Instructions: ${order.instructions}</p><p>Total Cost: $${await (order.charge).toFixed(2)}</p>`;
        } else {
            notif.text = `Your order is on its way!\n ${await itemText.join("\n")} \n\nExtra Instructions: ${order.instructions} \nTotal Cost: ${(order.charge)} Credits`;
            emailText =  `<p>Your order is on its way!<p><p>${await itemText.join(", ")}</p><p>Extra Instructions: ${order.instructions}</p><p>Total Cost: ${(order.charge)} Credits</p>`;
        }
        await notif.save();
        if (order.customer.receiving_emails) {
            // TEMPORARY EMAIL MUTE - Nov 11 Dmitry
            //await sendGridEmail(order.customer.email, "Order Ready", `<p>Hello ${order.customer.firstName},</p>${emailText}`, false);
        }

        //await order.customer.inbox.push({message: notif, new: true}); //Add notif to user"s inbox
        await order.customer.save();
        order.present = false; //Order is not active anymore
        await order.save();
        shop.revenue += order.charge;
        await shop.save();
    }
    await req.flash("success", "Successfully processed all orders!")
    return res.redirect("/shop/manage?orders=true");
}

//Process order
controller.processOrder = async function(req, res) {
    const platform = await setup(Platform);
    //Find the order that is currently being handled based on id, and populate info about its items
    const order = await Order.findById(req.params.id).populate("items.item").populate("customer");
    if (!platform || !order) {return res.json({error: "Could not find order"});}

    const notif = await InboxMessage.create({
        subject: "Order Ready", author: req.user, noReply: true,
        recipients: [order.customer], read: [], images: []
    });
    if (!notif) {return res.json({error: "Unable to send notification"});}
    notif.date = await dateFormat(notif.created_at, "h:MM TT | mmm d");

    let itemText = []; //This will have all the decoded info about the order
    for (let i = 0; i < order.items.length; i++) {
        await itemText.push(` - ${order.items[i].item.name}: ${order.items[i].quantity} order(s)`);
    }

    //Formats the charge in money format
    let emailText = "";
    if (platform.dollarPayment) {
        notif.text = `Your order is on its way!\n ${await itemText.join("\n")} \n\nExtra Instructions: ${order.instructions} \nTotal Cost: $${await (order.charge).toFixed(2)}`;
        emailText =  `<p>Your order is on its way!<p><p>${await itemText.join(", ")}</p><p>Extra Instructions: ${order.instructions}</p><p>Total Cost: $${await (order.charge).toFixed(2)}</p>`;
    } else {
        notif.text = `Your order is on its way!\n ${await itemText.join("\n")} \n\nExtra Instructions: ${order.instructions} \nTotal Cost: ${(order.charge)} Credits`;
        emailText =  `<p>Your order is on its way!<p><p>${await itemText.join(", ")}</p><p>Extra Instructions: ${order.instructions}</p><p>Total Cost: ${(order.charge)} Credits</p>`;
    }
    await notif.save();
    if (order.customer.receiving_emails) {
        // TEMPORARY EMAIL MUTE - Nov 11 Dmitry
        //await sendGridEmail(order.customer.email, "Order Ready", `<p>Hello ${order.customer.firstName},</p>${emailText}`, false);
    }

    //await order.customer.inbox.push({message: notif, new: true}); //Add notif to user"s inbox
    await order.customer.save();
    order.present = false; //Order is not active anymore
    await order.save();

    const shop = await setup(Market);
    if (!shop) {return res.json({error: "Could not find shop info"});}

    shop.revenue += order.charge;
    await shop.save();
    return res.json({success: "Successfully confirmed order"});
}

//Reject or Cancel Order
controller.deleteOrder = async function(req, res) {
    if (req.body.hasOwnProperty('rejectionReason')) { //If the order is rejected, not cancelled

        if (!(await req.user.tags.includes("Cashier"))) {return res.json({error: "You do not have permission to do that"});}
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
        notif.date = await dateFormat(notif.created_at, "h:MM TT | mmm d");

        let itemText = []; //This will have all the decoded info about the order
        for (var i = 0; i < order.items.length; i++) {
            await itemText.push(` - ${order.items[i].item.name}: ${order.items[i].quantity} order(s)`);
        }

        //Build message depending on context
        let emailText = "";
        if (platform.dollarPayment) {
            if (req.body.rejectionReason == '') {
                notif.text = `Your order was rejected. This is most likely because we suspect your order is not genuine. Contact us if you think there has been a mistake. No reason was provided for rejection.\n ${await itemText.join("\n")} \n\nExtra Instructions: ${order.instructions} \nTotal Cost: $${await (order.charge).toFixed(2)}`;
                emailText = `<p>Your order was rejected. This is most likely because we suspect your order is not genuine. Contact us if you think there has been a mistake. No reason was provided for rejection.</p><p>${await itemText.join(", ")}</p><p>Extra Instructions: ${order.instructions}</p><p>Total Cost: $${await (order.charge).toFixed(2)}</p>`;
            } else {
                notif.text = `Your order was rejected. This is most likely because we suspect your order is not genuine. Contact us if you think there has been a mistake. The reason was provided for rejection was the following: \"${req.body.rejectionReason}\"\n ${await itemText.join("\n")} \n\nExtra Instructions: $${order.instructions} \nTotal Cost: ${await (order.charge).toFixed(2)}`;
                emailText = `<p>Your order was rejected. This is most likely because we suspect your order is not genuine. Contact us if you think there has been a mistake. The reason was provided for rejection was the following: "${req.body.rejectionReason}"</p><p>${await itemText.join(", ")}</p><p>Extra Instructions: ${order.instructions}</p><p>Total Cost: $${await (order.charge).toFixed(2)}</p>`;
            }
        } else {
            if (req.body.rejectionReason == '') {
                notif.text = `Your order was rejected. This is most likely because we suspect your order is not genuine. Contact us if you think there has been a mistake. No reason was provided for rejection.\n ${await itemText.join("\n")} \n\nExtra Instructions: ${order.instructions} \nTotal Cost: ${order.charge} Credits`;
                emailText = `<p>Your order was rejected. This is most likely because we suspect your order is not genuine. Contact us if you think there has been a mistake. No reason was provided for rejection.</p><p>${await itemText.join(", ")}</p><p>Extra Instructions: ${order.instructions}</p><p>Total Cost: ${order.charge} Credits</p>`;
            } else {
                notif.text = `Your order was rejected. This is most likely because we suspect your order is not genuine. Contact us if you think there has been a mistake. The reason was provided for rejection was the following: \"${req.body.rejectionReason}\"\n ${await itemText.join("\n")} \n\nExtra Instructions: ${order.instructions} \nTotal Cost: ${order.charge} Credits`;
                emailText = `<p>Your order was rejected. This is most likely because we suspect your order is not genuine. Contact us if you think there has been a mistake. The reason was provided for rejection was the following: "${req.body.rejectionReason}"</p><p>${await itemText.join(", ")}</p><p>Extra Instructions: ${order.instructions}</p><p>Total Cost: ${order.charge} Credits</p>`;
            }
        }

        await notif.save();
        if (order.customer.receiving_emails) {
            // TEMPORARY EMAIL MUTE - Nov 11 Dmitry
            // await sendGridEmail(order.customer.email, "Order Rejected", `<p>Hello ${order.customer.firstName},</p><p>${notif.text}</p>`, false);
        }

        //Refund if the transaction is via online balance
        if (!order.payingInPerson) {
            order.customer.balance += order.charge;
            order.customer.debt -= order.charge;
        }

        //await order.customer.inbox.push({message: notif, new: true}); //Add notif to user"s inbox
        await order.customer.save();

        const deletedOrder = await Order.findByIdAndDelete(order._id).populate("items.item").populate("customer");
        if (!deletedOrder) {return res.json({error: "Could not delete order"});}
        return res.json({success: "Successfully rejected order"});
    }

    //Cancellation starts here
    const shop = await setup(Market);
    if (!shop) {return res.json({error: "Could not access shop"});}
    if (!shop.open) { return res.json({error: "We are currently not taking orders"});}

    //If order has been confirmed, it has already been started. It now cannot be deleted
    const order = await Order.findById(req.params.id);
    if (!order) {return res.json({error: "Could not find order"});}
    if (!(await order.customer.equals(req.user._id))) {return res.json({error: "You can only delete your own orders"});}
    if (order.confirmed) {return res.json({error: "Order has been confirmed"});}

    //Officially delete order
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

//Form to Create New Item
controller.newItem = async function(req, res) {
    const platform = await setup(Platform);
    const shop = await setup(Market);
    const categories = await ItemCategory.find({});
    if (!platform || !categories) {
        await req.flash("error", "An Error Occurred");
        return res.redirect("back");
    }

    //Render form to display new item, populated with shop data
    return res.render("shop/newOrderItem", {platform, shop, categories, data: platform.features[await objectArrIndex(platform.features, "route", "shop")]});
}

//Create New Item
controller.createItem = async function(req, res) {
    const platform = await setup(Platform);
    const shop = await setup(Market);
    const overlap = await Item.find({name: req.body.name}); //Search for overlapping shop items
    if (!platform || !shop || !overlap) {
        await req.flash("error", "Unable to find items");
        return res.redirect("back");
    }

    if (overlap.length > 0) { //If there are no overlapping items
        await req.flash("error", "Item already exists");
        return res.redirect("back");
    }

    const item = await Item.create({ //Create item through form data
        name: req.body.name,
        availableItems: await parseInt(req.body.available),
        description: req.body.description,
        imgUrl: {url: req.body.image, display: req.body.showImage == "url"},
        imageLink: (req.body.imageLink != undefined),
        displayAvailability: (req.body.displayAvailability != undefined)
    });

    if (!item) {
        await req.flash("error", "Unable to create item");
        return res.redirect("back");
    }

    if (!item.displayAvailability) {item.availableItems = 10;} //Default is 0, but if admin opts not to display, set to 10 so it can still be ordered

    for (let tag of shop.itemTags) { //Iterate through shop tags and add tag if listed for item
        if (req.body[tag]) {item.tags.push(tag);}
    }

    item.mediaFile.display = req.body.showImage == "upload";
    if (!platform.purchasable) {item.link = req.body.url;}

    if (req.files) { //Process file compression and upload through cloudinary
        if (req.files.mediaFile) {
            const file = req.files.mediaFile[0];
            const processedBuffer = await autoCompress(file.originalname, file.buffer);
            const [cloudErr, cloudResult] = await cloudUpload(file.originalname, processedBuffer);
            if (cloudErr || !cloudResult) {
                await req.flash("error", "Upload failed");
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
    if (await parseFloat(req.body.price)) {item.price = await parseFloat(req.body.price);
    } else {item.price = 0;}

    //Find the category specified in the form
    let category = await ItemCategory.findOne({_id: {$in: shop.categories}, name: req.body.category});
    if (!category) { //If category does not exist, search for default - "other"
        category = await ItemCategory.findOne({name: "Other"});
        if (!category) { //If other does not exist, create it
            category = await ItemCategory.create({name: "Other"});
            if (!category) {
                await req.flash("error", "Unable to find item category");
                return res.redirect("back");
            }
        }
    }

    await item.save();
    await category.items.push(item); //Push this item to that category"s item list
    await category.save();
    return res.redirect("/shop/manage");
}

//-----------ROUTES FOR SPECIFIC ITEMS-------------//

//View/Edit Item
controller.viewItem = async function(req, res) {
    const platform = await setup(Platform);
    const shop = await setup(Market);
    const item = await Item.findById(req.params.id);
    if (!platform || !item) {
        await req.flash("error", "Unable to find item");
        return res.redirect("back")
    }

    const categories = await ItemCategory.find({}); //Access all item categories
    if (!categories) {
        await req.flash("error", "Unable to find item categories");
        return res.redirect("back");
    }

    let fileExtensions = new Map(); //Build map of all file extension types (JPEG vs PNG) for different items
    if (item.mediaFile.filename) {
        await fileExtensions.set(item.mediaFile.url, await path.extname(await item.mediaFile.url.split("SaberChat/")[1]));
    }

    return res.render("shop/show", {platform, shop, categories, item, fileExtensions, data: platform.features[await objectArrIndex(platform.features, "route", "shop")]});
}

//Update or upvote item
controller.updateItem = async function(req, res) {
    //If there is an attached form with a 'name' attribute, update item info. Otherwise, upvote (same route prefix)
    if (req.body.name) {await controller.updateItemInfo(req, res);
    } else {await controller.upvoteItem(req, res);}
}

//Delete Item
controller.deleteItem = async function(req, res) {
    const shop = await setup(Market);
    const item = await Item.findByIdAndDelete(req.params.id); //Delete item based on specified ID
    if (!item) {
        await req.flash("error", "Could not delete item");
        return res.redirect("back");
    }

    //Delete any attached uploads
    if (item.mediaFile && item.mediaFile.filename) {
        const [cloudErr, cloudResult] = await cloudDelete(item.mediaFile.filename, "image");
        if (cloudErr || !cloudResult || cloudResult.result !== "ok") {
            await req.flash("error", "Error deleting uploaded image");
            return res.redirect("back");
        }
    }

    //Access all shop categories
    const categories = await ItemCategory.find({_id: {$in: shop.categories}});
    if (!categories) {
        await req.flash("error", "Could not remove item from list of item categories");
        return res.redirect("back");
    }

    for (let category of categories) { //If the category includes this item, remove the item from that category"s item list
        await removeIfIncluded(category.items, item._id);
        await category.save();
    }

    //Access all orders and scan their items
    const orders = await Order.find({}).populate("items.item");
    if (!orders) {
        await req.flash("error", "Could not find orders");
        return res.redirect("back");
    }

    for (let order of orders) { //If the order includes this item, remove the item from that order"s item list
        for (let i of order.items) {
            if (!i.item) {await order.items.splice(i, 1);}
        }

        order.charge = 0; //Reset and re-increment order charge
        for (let i of order.items) {order.charge += (i.item.price * i.quantity);}
        await order.save();
    }

    await req.flash("success", "Deleted Item!");
    return res.redirect("/shop/manage");
}

//-----------ROUTES TO MANAGE SHOP -------------//

//Manage Shop/View Orders
controller.manage = async function(req, res) {
    if (req.query.orders) { //If route calls to display orders
        return controller.manageOrders(req, res);
    }

    if (req.query.data) { //If route calls to display shop statistics
        const platform = await setup(Platform);
        if (!platform.purchasable) {
            await req.flash('error', `This feature is not enabled on ${platform.name} Saberchat`);
            return res.redirect('back');        
        }

        const market = await setup(Market);
        const customers = await User.find({authenticated: true});
        const items = await Item.find({});
        const allOrders = await Order.find({});
        if (!customers || !items || !allOrders) {return false;}

        //Calculate shop statistics (view 'utils/shop-data.js' for full implementation)
        const data = await getData(customers, items, allOrders);
        if (!data) {
            await req.flash("error", "An Error Occurred");
            return res.redirect("back")
        }
        data.platform = platform;
        data.market = market;
         data.data = platform.features[await objectArrIndex(platform.features, "route", "shop")]; //Access full shop display data
        return res.render("shop/data", data);
    }

    await controller.manageShop(req, res); //If route calls to display regular management
}

//Open/Close Shop
controller.changeStatus = async function(req, res) {
    const shop = await setup(Market);
    if (!shop) {return res.json({error: "An error occurred"});}
    shop.open = !shop.open; //Switch openness (inequality directly reverses it)
    await shop.save();
    return res.json({success: "Succesfully updated shop", open: shop.open});
}

//Update Shop Primary Settings
controller.updateSettings = async function(req, res) {
    const platform = await setup(Platform);
    const shop = await setup(Market);
    if (!platform || !shop) {
        await req.flash("error", "Could not access platform");
        return res.redirect("back");
    }

    for (let attr of ["name", "description"]) { //Update name and description based on text input
        platform.features[await objectArrIndex(platform.features, "route", "shop")][attr] = req.body[attr];
    }
    
    shop.itemTags = req.body.tagInput.split(','); //Update tags based on comma-separated input
    await shop.save()
    
    //Update tags on order items
    const items = await Item.find({});
    if (!items) {
        await req.flash("error", "Could not access items");
        return res.redirect("back");
    }

    //If tag is no longer used, remove it from item
    for (let item of items) {
        for (let tag of item.tags) {
            if (!await shop.itemTags.includes(tag)) {await item.tags.splice(item.tags.indexOf(tag), 1);}
        }
        await item.save();
    }

    await platform.save();
    await req.flash("success", "Updated Settings!");
    return res.redirect("/shop/manage");
}

//-----------ROUTES FOR GENERAL ITEM CATEGORIES-------------//

//Create New Item Category Form
controller.newCategory = async function(req, res) {
    const platform = await setup(Platform);
    const shop = await setup(Market);
    
    //Collect info on all the items, so that we can give the user the option to add them to that category
    const categories = await ItemCategory.find({_id: {$in: shop.categories}}).populate("items");
    if (!platform || !shop || !categories) {
        await req.flash("error", "Unable to find categories");
        return res.redirect("back");
    }
    //Render new category form with shop data
    return res.render("shop/newItemCategory", {platform, categories, data: platform.features[await objectArrIndex(platform.features, "route", "shop")]});
}

//Create New Item Category
controller.createCategory = async function(req, res) {
    const shop = await setup(Market);
    const overlap = await ItemCategory.find({_id: {$in: shop.categories}, name: req.body.name}); //Find all item categories with this name that already exist
    if (!shop || !overlap) {
        await req.flash("error", "Unable to find item categories");
        return res.redirect("back");
    }

    if (overlap.length > 0) { //If there are overlapping items
        await req.flash("error", "Item Category Already Exists.");
        return res.redirect("back");
    }

    const category = await ItemCategory.create({name: req.body.name, items: []});
    if (!category) {
        await req.flash("error", "Item Category could not be created");
        return res.redirect("back");
    }

    await shop.categories.push(category); //Add category to shop's settings
    await shop.save();

    const categories = await ItemCategory.find({_id: {$in: shop.categories}}); //Found categories, but represents all item categories
    if (!categories) {
        await req.flash("error", "Could not find item categories");
        return res.redirect("back");
    }

    for (let t of categories) { //Now that we"ve created the category, we have to remove the newly selected items from all other categories
        for (let i = 0; i < t.items.length; i++) {
            if (await req.body[t.items[i].toString()]) {await t.items.splice(i, 1);}
        }
        await t.save();
    }

    const items = await Item.find({}); //Find all items
    if (!items) {
        await req.flash("error", "Could not find items");
        return res.redirect("back");
    }

    for (let item of items) { //If the item is selected, add it to this category (now that we"ve removed it from all other categories)
        if (await req.body[item._id.toString()]) {await category.items.push(item);}
    }

    await category.save();
    await req.flash("success", "Item Category Created!");
    return res.redirect("/shop/manage");
}

//-----------ROUTES FOR SPECIFIC ITEM CATEGORIES-------------//

//View/Edit Item Category
controller.viewCategory = async function(req, res) {
    const platform = await setup(Platform);
    const category = await ItemCategory.findById(req.params.id).populate("items"); //Find the specified category
    if (!platform || !category) {
        await req.flash("error", "An Error Occurred");
        return res.redirect("back");
    }

    if (category.name == "Other") { //"Other" category cannot be modified
        await req.flash("error", "You cannot modify that category");
        return res.redirect("/shop/manage");
    }

    const categories = await ItemCategory.find({_id: {$ne: category._id}}).populate("items"); //Find all items
    if (!categories) {
        await req.flash("error", "An Error Occurred");
        return res.redirect("back");
    }
    return res.render("shop/editItemCategory", {platform, category, categories, data: platform.features[await objectArrIndex(platform.features, "route", "shop")]});
}

//Update Item Category
controller.updateCategory = async function(req, res) {
    const shop = await setup(Market);
    const overlap = await ItemCategory.find({_id: {$in: shop.categories, $ne: req.params.id}, name: req.body.name}); //Find all categories besides the one we are editing with the same name
    if (!overlap) {
        await req.flash("error", "An Error Occurred");
        return res.redirect("back");
    }

    if (overlap.length > 0) { //If there is overlap
        await req.flash("error", "Item category already in database");
        return res.redirect("back");
    }

    const category = await ItemCategory.findByIdAndUpdate(req.params.id, {name: req.body.name}); //Update this item category based on the id
    if (!category) {
        await req.flash("error", "Unable to update item category");
        return res.redirect("back");
    }

    const otherCategories = await ItemCategory.find({_id: {$in: shop.categories, $ne: category._id}}); //Find all other categories
    if (!otherCategories) {
        await req.flash("error", "Unable to find item categories");
        return res.redirect("back");
    }

    const items = await Item.find({}); //Find all items
    if (!items) {
        await req.flash("error", "Unable to find items");
        return res.redirect("back");
    }

    for (let otherCategory of otherCategories) { //Iterate over other categories
        for (let item of items) {
            if ((await otherCategory.items.includes(item._id)) && (await req.body[item._id.toString()] == "on")) {
                await otherCategory.items.splice(otherCategory.items.indexOf(item._id), 1);
            }
        }
        await otherCategory.save();
    }

    let other = await ItemCategory.findOne({_id: {$in: shop.categories}, name: "Other"}); //Find category "other"
    if (!other) {
        other = await ItemCategory.create({name: "Other"}); //If it does not exist, create it category "other"
        if (!other) {
            await req.flash("error", "Item Category could not be created");
            return res.redirect("back");
        }
    }

    for (let item of category.items) {
        if (!(await req.body[item._id.toString()])) {await other.items.push(item);} //Item is no longer checked; move it to other
    }
    await other.save();

    category.items = []; //Empty category and push new items to its items[] array, based on the latest changes
    for (let item of items) {
        if (await req.body[item._id.toString()]) {await category.items.push(item);}
    }

    await category.save();
    await req.flash("success", "Item category updated!");
    return res.redirect("/shop/manage");
}

//Delete Item Category
controller.deleteCategory = async function(req, res) {
    const shop = await setup(Market);
    let other = await ItemCategory.findOne({_id: {$in: shop.categories}, name: "Other"}); //Find the category with name "Other" - all unselected items go there
    if (!other) {
        other = await ItemCategory.create({name: "Other"}); //If it does not exist, create it category "other"
        if (!other) {
            await req.flash("error", "Item category could not be created");
            return res.redirect("back");
        }
    }

    const category = await ItemCategory.findByIdAndDelete(req.params.id); //Delete category based on specified ID
    if (!category) {
        await req.flash("error", "Unable to find item category");
        return res.redirect("back");
    }

    await removeIfIncluded(shop.categories, category._id); //Remove from the official shop's category list
    await shop.save();
    for (let item of category.items) {await other.items.push(item);} //Move all items to "other" category
    await other.save();
    await req.flash("success", "Item category deleted!");
    return res.redirect("/shop/manage");
}

//Upvote item as customer
controller.upvoteItem = async function(req, res) {
    const item = await Item.findById(req.params.id);
    if (!item) {
        return res.json({error: "Error upvoting item"});
    }

    //If user has already upvoted item, remove the upvote (clicking would remove it)
    if (await removeIfIncluded(item.upvotes, req.user._id)) {
        await item.save();
        return res.json({success: `Downvoted ${item.name}`, upvoteCount: item.upvotes.length});
    }

    await item.upvotes.push(req.user._id); //If not, add user's id to upvote list
    await item.save();
    return res.json({success: `Upvoted ${item.name}`, upvoteCount: item.upvotes.length}); //Return new total upvote count
}

//Update information about specific shop item
controller.updateItemInfo = async function(req, res) {
    if (!(await req.user.tags.includes("Cashier"))) { //Check for Cashier Permission
        await req.flash("error", "You do not have permission to do that");
        return res.redirect("back");
    }

    const platform = await setup(Platform);
    const shop = await setup(Market);
    const overlap = await Item.find({_id: {$ne: req.params.id}, name: req.body.name});
    if (!platform || !shop || !overlap) {
        await req.flash("error", "Item Not Found");
        return res.redirect("back");
    }

    if (overlap.length > 0) { //If there are any overlapping items
        await req.flash("error", "Item With This Name Exists");
        return res.redirect("back");
    }
    const item = await Item.findByIdAndUpdate(req.params.id, { //Update item
        name: req.body.name,
        price: await parseFloat(req.body.price),
        availableItems: await parseInt(req.body.available),
        description: req.body.description,
        imgUrl: {url: req.body.image, display: req.body.showImage == "url"},
        imageLink: (req.body.imageLink != undefined),
        displayAvailability: (req.body.displayAvailability != undefined),
        tags: [] //Reset tags to be added back from form
    });
    if (!item) {
        await req.flash("error", "item not found");
        return res.redirect("back");
    }

    if (!item.displayAvailability) {item.availableItems = 10;}
    for (let tag of shop.itemTags) { //Iterate through shop tags and add tag if listed for item
        if (req.body[tag]) {item.tags.push(tag);}
    }

    if (!platform.purchasable) {item.link = req.body.url;} //If item cannot be directly purchased
    item.mediaFile.display = req.body.showImage == "upload";
    if (req.files) {
        if (req.files.mediaFile) {
            let cloudErr;
            let cloudResult;
            if (item.mediaFile && item.mediaFile.filename) {
                [cloudErr, cloudResult] = await cloudDelete(item.mediaFile.filename, "image");
                //Check for failure
                if (cloudErr || !cloudResult || cloudResult.result !== "ok") {
                    await req.flash("error", "Error deleting uploaded image");
                    return res.redirect("back");
                }
            }
            
            //Process and compress file
            const file = req.files.mediaFile[0];
            const processedBuffer = await autoCompress(file.originalname, file.buffer);
            [cloudErr, cloudResult] = await cloudUpload(file.originalname, processedBuffer);

            if (cloudErr || !cloudResult) {
                await req.flash("error", "Upload failed");
                return res.redirect("back");
            }

            item.mediaFile = { //Update media file object with image data
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
        await req.flash("error", "Unable to find active orders");
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

     //Collect all item categories
    const categories = await ItemCategory.find({_id: {$in: shop.categories}, name: {$ne: req.body.category}});
    if (!categories) {
        await req.flash("error", "Unable to find item categories");
        return res.redirect("back");
    }

    for (let t of categories) { //Remove this item from its old item category (if the category has not changed, it"s fine because we" add it back in a moment anyway)
        await removeIfIncluded(t.items, item._id);
        await t.save();
    }

    //Find the category specified in the form
    let category = await ItemCategory.findOne({_id: {$in: shop.categories}, name: req.body.category});
    if (!category) {
        category = await ItemCategory.findOne({name: "Other"}); //Search for default category - "other"
        if (!category) {
            category = await ItemCategory.create({name: "Other"}); //If category does not exist, create it 
            if (!category) {
                await req.flash("error", "Unable to find item category");
                return res.redirect("back");
            }
        }
    }

    await removeIfIncluded(category.items, item._id); //If item is already in category, remove it so you can put the updated category back (we don"t know whether the category will be there or not, so it"s better to just cover all bases)
    await category.items.push(item);
    await category.save();

    await req.flash("success", "Item updated!");
    return res.redirect("/shop/manage");
}

//Display shop control panel
controller.manageShop = async function(req, res) {
    const platform = await setup(Platform);
    const shop = await setup(Market);
    
    //Collect info on all the item categories
    const categories = await ItemCategory.find({_id: {$in: shop.categories}}).populate("items");
    if (!platform || !shop || !categories) {
        await req.flash("error", "An Error Occurred");
        return res.redirect("back");
    }

    let sortedCategories = [];
    let sortedCategory;
    for (let category of categories) { //Sort displayed categories alphabetically
        sortedCategory = category;
        await quicksort(sortedCategory.items, 0, sortedCategory.items.length-1, "name");
        await sortedCategories.push(sortedCategory);
    }
    return res.render("shop/manage", {platform, shop, categories: sortedCategories, data: platform.features[await objectArrIndex(platform.features, "route", "shop")]});
}

//Manage viewing timeframe of past orders
controller.manageOrders = async function(req, res) {
    const platform = await setup(Platform);
    if (!platform.purchasable) {
        await req.flash('error', `This feature is not enabled on ${platform.name} Saberchat`);
        return res.redirect('back');        
    }
    let viewPast = false;
    if(req.query.past) {
        viewPast = true;
    }

    const now = new Date();
    // set defaults
    let startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    // end datetime is technically beginning of next day
    endDate.setDate(endDate.getDate() + 1);

    const startDateParam = req.query.start_date;
    const endDateParam = req.query.end_date;

    // expects queryparam of format YYYY-MM-DD
    if(startDateParam && typeof startDateParam === 'string' && startDateParam.length === 10) { 
        try {
            startDate = new Date(startDateParam);
        } catch (error) {}
    }

    if(endDateParam && typeof endDateParam === 'string' && endDateParam.length === 10) { 
        try {
            endDate = new Date(endDateParam);
            // end datetime is technically beginning of next day
            endDate.setDate(endDate.getDate() + 1);
        } catch (error) {}
    }

    const activeOrders = await Order.find({present: true}).sort({created_at: -1}).populate("items.item");
    if (!platform || !activeOrders) {
        await req.flash("error", "Could not find orders");
        return res.redirect("back");
    }

    const filteredOrders = await Order.find({
            created_at: { $gte: startDate, $lte: endDate }, 
            present: false
        }).sort({created_at: -1}).populate("items.item");

    endDate.setDate(endDate.getDate() - 1); // remove the extra day added for fe display purposes
    return res.render("shop/orderDisplay", {
        platform, 
        activeOrders, 
        filteredOrders, 
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        data: platform.features[await objectArrIndex(platform.features, "route", "shop")],
        viewPast: viewPast
    });
}

module.exports = controller;