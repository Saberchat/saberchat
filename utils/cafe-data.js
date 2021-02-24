//SCHEMA
const Order = require('../models/cafe/order');
const Item = require('../models/cafe/orderItem');

//LIBRARIES
const {sortByPopularity} = require("../utils/popularity-algorithms");
const {equateObjects} = require("../utils/object-operations");
const {getHours, sortTimes, getStats} = require('../utils/time');

module.exports = async function(customers, items, orders) {
    //Calculate most popular and lucrative customers, and customers with the longest orders
    let popularCustomers = [];
    let longestOrderCustomers = [];
    let lucrativeCustomers = [];
    let orderLength = 0;
    let spent = 0;

    let customerOrders;
    for (let customer of customers) {
        customerOrders = await Order.find({customer: customer._id}); if (!customerOrders) {return false;}
        orderLength = 0;
        spent = 0;
        for (let order of customerOrders) {
            orderLength += order.items.length/orders.length;
            spent += order.charge;
        }
        popularCustomers.push({customer, orderCount: customerOrders.length, date: customer.created_at});
        longestOrderCustomers.push({customer, orderLength, date: customer.created_at});
        lucrativeCustomers.push({customer, spent, avgCharge: Math.round((spent/orders.length)*100)/100, date: customer.created_at});
    }

    popularCustomers = sortByPopularity(popularCustomers, "orderCount", "date", null).popular;
    longestOrderCustomers = sortByPopularity(longestOrderCustomers, "orderLength", "date", null).popular;
    lucrativeCustomers = sortByPopularity(lucrativeCustomers, "spent", "date", null).popular;

    //Evaluate the most purchased items
    const upvotedItems = sortByPopularity(items, "upvotes", "created_at", null).popular;
    let orderedItems = [];
    let orderedQuantities = [];

    let itemCount = 0; //Total number of orders for this item
    let itemOrderedCount = 0; //Number of instances the item was ordered
    for (let item of items) {
        itemCount = 0;
        itemOrderedCount = 0;
        for (let order of orders) {
            for (let orderItem of order.items) {
                if (orderItem.item.equals(item._id)) {
                    itemCount += orderItem.quantity;
                    itemOrderedCount ++;
                }
            }
        }

        orderedItems.push({item, orderCount: itemCount, date: item.created_at});
        if (itemOrderedCount == 0) {
            orderedQuantities.push({item, numOrders: itemOrderedCount, orderCount: itemCount, avgQuantity: 0});
        } else {
            orderedQuantities.push({item, numOrders: itemOrderedCount, orderCount: itemCount, avgQuantity: itemCount/itemOrderedCount});
        }
    }
    const popularOrderedItems = sortByPopularity(orderedItems, "orderCount", "date", null).popular;

    //Calculate common item combinations
    let itemCombos = [];
    let itemCombo = [];
    for (let order of orders) {
        itemCombo = [];
        for (let item of order.items) {
            itemCombo.push(item.item);
        }
        itemCombos.push({items: itemCombo});
    }

    let combinations = equateObjects(itemCombos, "items");
    let populatedCombinations = [];
    let populatedCombination = [];
    let populatedItem;

    for (let combo of combinations) {
        populatedCombination = [];
        for (let object of combo.objects) {
            populatedItem = await Item.findById(object);
            if (!populatedItem) {return false;}
            populatedCombination.push(populatedItem);
        }
        populatedCombinations.push({combination: populatedCombination, instances: combo.instances});
    }

    //Calculate popularity at various price points
    let pricepoints = new Map();
    for (let item of items) {
        pricepoints.set(item._id.toString(), new Map());
    }

    for (let order of orders) {
        for (let item of order.items) {
            if (pricepoints.get(item.item._id.toString()).has(item.price)) {
                pricepoints.get(item.item._id.toString()).set(item.price, pricepoints.get(item.item._id.toString()).get(item.price) + 1);
            } else {
                pricepoints.get(item.item._id.toString()).set(item.price, 1);
            }
        }
    }

    //Calculate most common timeframes
    let times = [];
    for (let order of orders) {
        times.push(new Date(order.created_at));
    }

    let formattedTimes = sortTimes(getHours(times).finalTimesUnformatted, getHours(times).finalTimes).formattedTimes;
    let timeStats = getStats(sortTimes(getHours(times).finalTimesUnformatted, getHours(times).finalTimes).times);

    return {
        items, popularCustomers, longestOrderCustomers,
        lucrativeCustomers, popularOrderedItems, upvotedItems,
        orderedQuantities, combinations: populatedCombinations,
        pricepoints, times: formattedTimes, timeStats
    }
}
