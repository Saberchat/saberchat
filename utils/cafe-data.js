//This will be heavily refactored soon

const dateFormat = require('dateformat');
const {getPopularityCoefficiant, sortByPopularity} = require("../utils/popularity-algorithms");
const filter = require('../utils/filter');

const User = require('../models/user');
const Order = require('../models/order');
const Item = require('../models/orderItem');
const Type = require('../models/itemType');
const Cafe = require('../models/cafe')

const getData = async function () {

    const customers = await User.find({authenticated: true});
    if (!customers) {
        return false;
    }

    let popularCustomers = []; //Most orders
    let longestOrderCustomers = []; //Longest orders by item
    let lucrativeCustomers = []; //Most money spent at the cafe

    let customerOrdersObject;

    let customerOrders;
    let orderTotal;

    for (let customer of customers) {
        orderTotal = 0;

        customerOrders = await Order.find({'customer': customer._id});

        if (!customerOrders) {
            return false;
        }

        customerOrdersObject = {
            customer: customer,
            orderLength: 0
        };

        for (let order of customerOrders) {
            orderTotal += order.charge;

            for (let item of order.items) {
                customerOrdersObject.orderLength += item.quantity;
            }
        }

        customerOrdersObject.orderLength /= customerOrders.length;

        if (customerOrders.length > 0) {
            popularCustomers.push({customer: customer, orderCount: customerOrders.length});
            lucrativeCustomers.push({
                customer: customer,
                spent: orderTotal,
                avgCharge: (orderTotal / customerOrders.length)
            });
            longestOrderCustomers.push(customerOrdersObject);
        }

    }

    //Sort customers in all three arrays - popularity by number of orders, longest orders, and most charge
    let tempCustomer;
    for (let h = 0; h < popularCustomers.length; h++) {
        for (let i = 0; i < popularCustomers.length - 1; i++) {
            if (popularCustomers[i].orderCount < popularCustomers[i + 1].orderCount) {
                tempCustomer = popularCustomers[i];
                popularCustomers[i] = popularCustomers[i + 1];
                popularCustomers[i + 1] = tempCustomer;
            }

            if (longestOrderCustomers[i].orderLength < longestOrderCustomers[i + 1].orderLength) {
                tempCustomer = longestOrderCustomers[i];
                longestOrderCustomers[i] = longestOrderCustomers[i + 1];
                longestOrderCustomers[i + 1] = tempCustomer;
            }

            if (lucrativeCustomers[i].spent < lucrativeCustomers[i + 1].spent) {
                tempCustomer = lucrativeCustomers[i];
                lucrativeCustomers[i] = lucrativeCustomers[i + 1];
                lucrativeCustomers[i + 1] = tempCustomer;
            }

        }
    }

    //Evaluate the most purchased items

    const items = await Item.find({});
    if (!items) {
        return false;
    }

    let popularItems = [];
    let upvotedItems = [];
    let itemObject;
    let itemTotal;

    let orderedQuantities = []; //Typically how much of an item is ordered in one go
    let itemQuantityArray = [0, 0, 0];

    let itemOrders = await Order.find({});
    if (!itemOrders) {
        return false;
    }

    for (let item of items) {
        itemTotal = 0;
        itemQuantityArray = [0, 0, 0];

        for (let order of itemOrders) {
            for (let it of order.items) {
                if (it.item.toString() == item._id.toString()) {
                    itemTotal += it.quantity;
                    itemQuantityArray[it.quantity - 1] += 1;
                }
            }
        }

        itemObject = {
            item: item,
            orderCount: itemTotal
        };

        if (itemObject.orderCount > 0) {
            popularItems.push(itemObject);
        }

        let orderedQuantityObject = {
            item: item,
            numOrders: 0,
            sumOrders: 0,
            avgQuantity: 0
        };

        for (let i = 0; i < itemQuantityArray.length; i++) {
            orderedQuantityObject.numOrders += itemQuantityArray[i];
            orderedQuantityObject.sumOrders += ((i + 1) * itemQuantityArray[i]);
        }

        orderedQuantityObject.avgQuantity = orderedQuantityObject.sumOrders / orderedQuantityObject.numOrders;

        if (!isNaN(orderedQuantityObject.avgQuantity)) {
            orderedQuantities.push(orderedQuantityObject);
        }

        upvotedItems.push(item);

    }

    //Sort popular items
    let tempItem;
    for (let h = 0; h < popularItems.length; h++) {
        for (let i = 0; i < popularItems.length - 1; i++) {
            if (popularItems[i].orderCount < popularItems[i + 1].orderCount) {
                tempItem = popularItems[i];
                popularItems[i] = popularItems[i + 1];
                popularItems[i + 1] = tempItem;
            }
        }
    }

    //Sort upvoted items

    let tempUpvotedItem;
    let avgUpvotes = 0;

    for (let j = 0; j < upvotedItems.length - 1; j++) {
        for (let k = 0; k < upvotedItems.length - 1; k++) {
            if (upvotedItems[k].upvotes.length < upvotedItems[k + 1].upvotes.length) {
                tempUpvotedItem = upvotedItems[k];
                upvotedItems[k] = upvotedItems[k + 1];
                upvotedItems[k + 1] = tempUpvotedItem;
            }
        }
    }

    for (let i = 0; i < upvotedItems.length; i++) {
        avgUpvotes += upvotedItems[i].upvotes.length;
    }

    avgUpvotes /= upvotedItems.length;

    for (let j = upvotedItems.length - 1; j >= 0; j--) {
        if (upvotedItems[j].upvotes.length < avgUpvotes) {
            upvotedItems.splice(j, 1);
        }
    }

    //Calculate most common item combinations

    const orders = await Order.find({});
    if (!orders) {
        return false;
    }

    let combinations = []; //Matrix of common order combinations
    let combo = [];
    let overlap;

    //Initialize combinations matrix with first order

    for (let item of orders[0].items) {
        combo.push(item.item.toString());
    }

    combo.sort(); //Sort the combination so it can be easily compared with all other combinations

    combinations.push({combination: combo, instances: 1});

    for (let order of orders.slice(1)) {
        combo = []
        overlap = false;

        for (let item of order.items) {
            combo.push(item.item.toString());
        }

        combo.sort();

        for (let c of combinations) {
            if (combo.toString() == c.combination.toString()) { //Compare the sorted arrays by making them strings
                c.instances++;
                overlap = true;
                break;
            }
        }

        if (!overlap) {
            combinations.push({combination: combo, instances: 1});
        }
    }

    //Sort combinations
    let tempCombo;
    for (let h = 0; h < combinations.length; h++) {
        for (let i = 0; i < combinations.length - 1; i++) {
            if (combinations[i].instances < combinations[i + 1].instances) {
                tempCombo = combinations[i];
                combinations[i] = combinations[i + 1];
                combinations[i + 1] = tempCombo;
            }
        }
    }

    let populatedCombinations = [];
    let populatedCombination;
    let populatedItem;

    for (let combo of combinations) {
        populatedCombination = [];

        for (let item of combo.combination) {
            populatedItem = await Item.findById(item);
            if (!populatedItem) {
                return false;
            }
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
        for (let it of order.items) {
            if (pricepoints.get(it.item._id.toString()).has(it.price)) {
                pricepoints.get(it.item._id.toString()).set(it.price, pricepoints.get(it.item._id.toString()).get(it.price) + 1);

            } else {
                pricepoints.get(it.item._id.toString()).set(it.price, 1);
            }
        }
    }

    //Calculate most common timeframes

    let times = [];
    let timeCount = []; //Using matrix instead of map to count number of repetitions of a time so it can be sortable
    let time;
    let index; //Index of overlapping time in the matrix of times

    for (let order of orders) { //Orders already declared from earlier
        index = -1;
        time = order.date.split(', ')[1];

        if (time.split(' ')[1] == "AM") {

            if (time.split(':')[0] == '12') {
                time = `00:${time.split(':')[1].split(' ')[0]}`;

            } else {
                time = `${time.split(' ')[0]}`;
            }

        } else {
            if (time.split(':')[0] == '12') {
                time = `12:${time.split(':')[1].split(' ')[0]}`;

            } else {
                time = `${(parseInt(time.split(':')[0]) + 12).toString()}:${time.split(':')[1].split(' ')[0]}`;
            }
        }

        times.push(time)

        //Populate matrix of time counts accordingly
        for (let i = 0; i < timeCount.length; i++) {
            if (timeCount[i][0] == time) {
                index = i;
                break;
            }
        }

        if (index != -1) {
            timeCount[index][1] += 1;

        } else {
            timeCount.push([time, 1]);
        }
    }

    //Sort times

    let tempTime;
    for (let h = 0; h < times.length; h++) {
        for (let i = 0; i < times.length - 1; i++) {
            if (parseInt(`${times[i].split(':')[0]}${times[i].split(':')[1]}`) > parseInt(`${times[i + 1].split(':')[0]}${times[i + 1].split(':')[1]}`)) {
                tempTime = times[i];
                times[i] = times[i + 1];
                times[i + 1] = tempTime;
            }
        }
    }

    for (let h = 0; h < timeCount.length; h++) {
        for (let i = 0; i < timeCount.length - 1; i++) {
            if (parseInt(`${timeCount[i][0].split(':')[0]}${timeCount[i][0].split(':')[1]}`) > parseInt(`${timeCount[i + 1][0].split(':')[0]}${timeCount[i + 1][0].split(':')[1]}`)) {
                tempTime = timeCount[i];
                timeCount[i] = timeCount[i + 1];
                timeCount[i + 1] = tempTime;
            }
        }
    }

    let timesObject = { //This object stores the formatted time as well as the numerical time, meaning we can display it and do mathematical operations on it
        times: times,
        timeCount: timeCount,
        averageMinutes: 0,
        meanTime: '',
        medianTime: '',
        stdDevMinutes: 0,
        stdDevTime: '',
        minTimeMinutes: 0,
        minTime: '',
        maxTimeMinutes: 0,
        maxTime: ''
    };

    for (let time of times) {
        timesObject.averageMinutes += parseInt(time.split(':')[0]) * 60;
        timesObject.averageMinutes += parseInt(time.split(':')[1]);
    }

    timesObject.averageMinutes /= times.length;

    timesObject.meanTime = `${Math.floor(timesObject.averageMinutes / 60)}:${Math.round(timesObject.averageMinutes % 60)}`;

    if (timesObject.meanTime.split(':')[1].length < 2) {
        timesObject.meanTime = `${timesObject.meanTime}0`;
    }

    if (times.length % 2 == 1) {
        timesObject.medianTime = times[(times.length - 1) / 2];

    } else {
        timesObject.medianTime = `${Math.floor((parseInt(times[((times.length) / 2) - 1].split(':')[0]) + parseInt(times[((times.length) / 2)].split(':')[0])) / 2)}:${Math.round((parseInt(times[((times.length) / 2) - 1].split(':')[1]) + parseInt(times[((times.length) / 2)].split(':')[1])) / 2)}`
    }

    if (timesObject.medianTime.split(':')[1].length < 2) {
        timesObject.medianTime = `${timesObject.medianTime}0`;
    }

    let timeInMinutes;

    for (let time of times) {
        timeInMinutes = parseInt((time.split(':')[0]) * 60) + parseInt(time.split(':')[1]);
        timesObject.stdDevMinutes += (Math.pow((timeInMinutes - timesObject.averageMinutes), 2));
    }

    timesObject.stdDevMinutes = Math.sqrt(timesObject.stdDevMinutes / times.length);
    timesObject.stdDevTime = `${Math.floor(timesObject.stdDevMinutes / 60)}:${Math.round(timesObject.stdDevMinutes % 60)}`;

    if (timesObject.stdDevTime.split(':')[1].length < 2) {
        timesObject.stdDevTime = `${timesObject.stdDevTime}0`;
    }

    timesObject.minTimeMinutes = timesObject.averageMinutes - timesObject.stdDevMinutes;
    timesObject.maxTimeMinutes = timesObject.averageMinutes + timesObject.stdDevMinutes;

    timesObject.minTime = `${Math.floor(timesObject.minTimeMinutes / 60)}:${Math.round(timesObject.minTimeMinutes % 60)}`;
    timesObject.maxTime = `${Math.floor(timesObject.maxTimeMinutes / 60)}:${Math.round(timesObject.maxTimeMinutes % 60)}`;

    if (timesObject.minTime.split(':')[1].length < 2) {
        timesObject.minTime = `${timesObject.minTime}0`;
    }

    if (timesObject.maxTime.split(':')[1].length < 2) {
        timesObject.maxTime = `${timesObject.maxTime}0`;
    }

    return {
        items,
        popularCustomers,
        longestOrderCustomers,
        lucrativeCustomers,
        popularItems,
        upvotedItems,
        orderedQuantities,
        pricepoints,
        combinations: populatedCombinations,
        times: timesObject
    }
}

module.exports = getData;
