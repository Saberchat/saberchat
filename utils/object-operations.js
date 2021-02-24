const {sortByPopularity} = require("../utils/popularity-algorithms");

//Find overlapping objects, based on the equality of one array property
module.exports.equateObjects = function(objects, property) {
    let sortedObjects = new Map();
    let sortedMatrix = [];

    for (let object of objects) {
        if (sortedObjects.has(object[property].sort().toString())) {
            sortedObjects.set(object[property].sort().toString(), sortedObjects.get(object[property].sort().toString())+1);
        } else {
            sortedObjects.set(object[property].sort().toString(), 1);
        }
    }

    for (let object of sortedObjects) {
        sortedMatrix.push({
            objects: object[0].split(','),
            instances: object[1],
            date: new Date()
        });
    }

    return sortByPopularity(sortedMatrix, "instances", "date").popular;
}

//Check if an object which includes a certain property contains a key in that property
module.exports.objectArrIncludes = function(arr, property, key, subproperty) {
    for (let i = 0; i < arr.length; i ++) {
        if (subproperty) {
            if (arr[i][property][subproperty].toString() == key.toString()) {
                return i;
            }
        }
        if (arr[i][property].toString() == key.toString()) {
            return i;
        }
    }
    return -1;
}

//Build an array with a single property for each item in an array of objects
module.exports.parsePropertyArray = function(arr, property) {
    let final = [];
    for (let object of arr) {
        final.push(object[property]);
    }
    return final;
}

module.exports.removeIfIncluded = function(arr, element) {
    if (arr.includes(element)) {
        arr.splice(arr.indexOf(element), 1);
    }
}