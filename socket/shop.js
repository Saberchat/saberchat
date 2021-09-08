//LIBRARIES
const dateFormat = require("dateformat");
const setup = require("../utils/setup");

//SCHEMA
const Platform = require("../models/platform");
const User = require("../models/user");
const Order = require("../models/shop/order");
const Item = require("../models/shop/orderItem");
const {Market} = require("../models/group");

const shop = {};

shop.order = async function(io, socket, itemList, itemCount, instructions, address, payingInPerson, customerId) { //Create New Shop Order
    const platform = await setup(Platform);
    if (!platform.purchasable) {return console.log("Platform is not open to purchases");}
    const shop = await setup(Market); //Collect data on shop to figure out whether it's open or not
    if (!shop) {return console.log('error accessing shop');}

    if (shop.open) { //If the shop is open, run everything else. Otherwise, nothing matters since orders aren't being accepted
        console.log(customerId);
        const user = await User.findById(customerId);
        if (!user) {return console.log('error accessing user');}

        const activeOrders = await Order.find({name: `${user.firstName} ${user.lastName}`, present: true}); //Access user's current orders (so we can see if they've passed the order limit)
        if (!activeOrders) {return console.log('error accessing orders');}

        //If user has made three or more orders that are still active (have not been delivered)
        if (platform.restrictPosts && activeOrders.length >= 3) {return console.log("Max orders made");}

        const orderItems = await Item.find({_id: {$in: itemList}}); //Find all items that are part of the user's order (itemList was generated in shop-socket FE)
        if (!orderItems) {return console.log('error accessing order items');}

        let unavailable = false; //This variable will track if any items are unavailable in the requested quantities
        for (let i = 0; i < orderItems.length; i++) { //Iterate over each item and check if any are unavailable
            if (orderItems[i].availableItems < await parseInt(itemCount[i])) { //If order asks for more of this item than is available, unavailable is now true, and the checking stops immediately
                unavailable = true;
                break;
            }
        }

        //An unlikely scenario. Another user places an order that results in there being less available items than the number that our user has ordered.
        if (unavailable) {return console.log('some items unavailable');}

        let orderItemsObjects = [];
        for (let i = 0; i < itemList.length; i += 1) {
            await orderItemsObjects.push({
                item: itemList[i],
                quantity: parseInt(itemCount[i]),
                price: 0
            });
        }

        let orderInstructions = "";
        if (instructions == "") {orderInstructions = "None";
        } else {orderInstructions = instructions;}

        let orderAddress = "";
        if (address == "") {orderAddress = "None";
        } else {orderAddress = address;}

        let order = await Order.create({
            customer: customerId,
            name: `${user.firstName} ${user.lastName}`,
            present: true,
            charge: 0,
            instructions: orderInstructions,
            address: orderAddress,
            payingInPerson: payingInPerson
        });

        if (!order) {return console.log('error creating order');}

        order.date = await dateFormat(order.created_at, "mmm d, h:MM TT");
        let charge = 0;
        let itemProfile;

        for (let i = 0; i < orderItemsObjects.length; i++) { //items[] contains info about individual items (and their prices); itemCount[] says how much of each item is ordered. Multiplication will calculate how much to charge for an item
            itemProfile = await Item.findById(orderItemsObjects[i].item);
            if (!itemProfile) {return console.log('error accessing item');}
            charge += (itemProfile.price * orderItemsObjects[i].quantity);
            orderItemsObjects[i].price = itemProfile.price;
        }

        order.charge = charge; //Set order cost based on the items ordered
        order.items = orderItemsObjects;
        await order.save();

        if (order.charge > user.balance && !payingInPerson) { //If charge is over online balance, and user is paying online
            console.log(user.username);
            console.log(order.charge);
            console.log(user.balance);
            const deletedOrder = await Order.findByIdAndDelete(order._id);
            if (!deletedOrder) {return console.log('Error deleting order');}
        }

        const displayItems = await Item.find({_id: {$in: itemList}}); //Full versions of the _id signatures sent in order.items
        if (!displayItems) {return console.log('Error accessing display items');}
        return io.emit('order', order, displayItems); //Send order to shop admins via socket
    }
}

module.exports = shop;