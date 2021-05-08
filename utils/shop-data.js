//SCHEMA
const Order = require('../models/shop/order');
const Item = require('../models/shop/orderItem');

//LIBRARIES
const {sortByPopularity} = require("./popularity");
const {equateObjects} = require("./object-operations");
const {getHours, sortTimes, getStats} = require('./time');

module.exports = async function(customers, items, orders) {
    const data = {items}; //Object with all collected shop data
    data.popularCustomers = []; //Calculate most popular and lucrative customers, and customers with the longest orders
    data.longestOrderCustomers = [];
    data.lucrativeCustomers = [];
    let orderLength = 0;
    let spent = 0;

    let customerOrders;
    for (let customer of customers) {
        customerOrders = await Order.find({customer: customer._id}); if (!customerOrders) {return false;}
        orderLength = 0;
        spent = 0;
        for (let order of customerOrders) { //Calculate average order length and total spent based on individual orders and charges
            orderLength += order.items.length/orders.length;
            spent += order.charge;
        }

        //Add objects with each group of data to arrays
        await data.popularCustomers.push({customer, orderCount: customerOrders.length, date: customer.created_at});
        await data.longestOrderCustomers.push({customer, orderLength, date: customer.created_at});
        await data.lucrativeCustomers.push({customer, spent, avgCharge: Math.round((spent/orders.length)*100)/100, date: customer.created_at});
    }

    //Sort objects
    data.popularCustomers = await sortByPopularity(data.popularCustomers, "orderCount", "date", null).popular;
    data.longestOrderCustomers = await sortByPopularity(data.longestOrderCustomers, "orderLength", "date", null).popular;
    data.lucrativeCustomers = await sortByPopularity(data.lucrativeCustomers, "spent", "date", null).popular;

    //Evaluate the most purchased and upvoted items
    data.upvotedItems = await sortByPopularity(items, "upvotes", "created_at", null).popular;
    let orderedItems = [];
    data.orderedQuantities = [];

    let itemCount = 0; //Total number of orders for this item
    let itemOrderedCount = 0; //Number of instances the item was ordered
    for (let item of items) {
        itemCount = 0;
        itemOrderedCount = 0;
        for (let order of orders) { //Iterate through orders and increment the amount ordered
            for (let orderItem of order.items) {
                if (await orderItem.item.equals(item._id)) {
                    itemCount += orderItem.quantity;
                    itemOrderedCount ++;
                }
            }
        }

        //Add objects with packaged data
        await orderedItems.push({item, orderCount: itemCount, date: item.created_at});
        if (itemOrderedCount == 0) {
            await data.orderedQuantities.push({item, numOrders: itemOrderedCount, orderCount: itemCount, avgQuantity: 0});
        } else {
            await data.orderedQuantities.push({item, numOrders: itemOrderedCount, orderCount: itemCount, avgQuantity: itemCount/itemOrderedCount});
        }
    }
    data.popularOrderedItems = await sortByPopularity(orderedItems, "orderCount", "date", null).popular;

    //Calculate common item combinations
    let itemCombos = [];
    let itemCombo = [];
    for (let order of orders) {
        itemCombo = [];
        for (let item of order.items) {await itemCombo.push(item.item);}
        await itemCombos.push({items: itemCombo});
    }

    //Sort combinations
    let combinations = await equateObjects(itemCombos, "items");
    data.combinations = [];
    let populatedCombination = [];
    let populatedItem;

    for (let combo of combinations) { //Iterate through combinations and populate their info
        populatedCombination = [];
        for (let object of combo.objects) {
            populatedItem = await Item.findById(object);
            if (!populatedItem) {return false;}
            await populatedCombination.push(populatedItem);
        }
        await data.combinations.push({combination: populatedCombination, instances: combo.instances});
    }

    data.pricepoints = new Map(); //Calculate popularity at various price points
    for (let item of items) {await data.pricepoints.set(item._id.toString(), new Map());}

    for (let order of orders) { //Iterate through orders and set their price points
        for (let item of order.items) {
            if (await data.pricepoints.get(item.item._id.toString()).has(item.price)) {
                await data.pricepoints.get(item.item._id.toString()).set(item.price, data.pricepoints.get(item.item._id.toString()).get(item.price) + 1);
            } else {
                await data.pricepoints.get(item.item._id.toString()).set(item.price, 1);
            }
        }
    }

    let times = []; //Calculate most common timeframes using the times package
    for (let order of orders) {await times.push(new Date(order.created_at));}

    data.times = await sortTimes(getHours(times).finalTimesUnformatted, getHours(times).finalTimes).formattedTimes;
    data.timeStats = await getStats(sortTimes(getHours(times).finalTimesUnformatted, getHours(times).finalTimes).times);

    return data;
}
