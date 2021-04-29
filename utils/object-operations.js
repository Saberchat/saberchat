const {sortByPopularity} = require("../utils/popularity");
const package = {};

package.equateObjects = function(objects, property) { //Find overlapping objects, based on the equality of one array property
    let sortedObjects = new Map();
    let sortedMatrix = [];
    for (let object of objects) { //Iterate through objects

        if (sortedObjects.has(object[property].sort().toString())) { //If map already has object, add 1
            sortedObjects.set(object[property].sort().toString(), sortedObjects.get(object[property].sort().toString())+1);
        } else {
            sortedObjects.set(object[property].sort().toString(), 1); //Otherwise, add object to map
        }
    }

    for (let object of sortedObjects) { //Convert map to matrix
        sortedMatrix.push({
            objects: object[0].split(','),
            instances: object[1],
            date: new Date()
        });
    }
    return sortByPopularity(sortedMatrix, "instances", "date").popular; //Sort matrix by popularity of objects
}

package.objectArrIndex = function(arr, property, key, subproperty, caseInsensitive) { //Check if an object which includes a certain property contains a key in that property
    for (let i = 0; i < arr.length; i ++) {
        if (subproperty) { //If a subproperty needs to be evaluated
            if (caseInsensitive) { //If case insensitive
                if (arr[i][property][subproperty].toString().toLowerCase() == key.toString().toLowerCase()) {return i;} //Check equality with property and subproperty    
            }
            if (arr[i][property][subproperty].toString() == key.toString()) {return i;} //Check equality with property and subproperty
        }
        if (caseInsensitive) {
            if (arr[i][property].toString().toLowerCase() == key.toString().toLowerCase()) {return i;}
        }
        if (arr[i][property].toString() == key.toString()) {return i;} //Otherwise, check equality with just property
    }
    return -1; //If no result is found, return -1 (like a regular array)
}

package.parsePropertyArray = function(arr, property, lower) { //Build an array with a single property for each item in an array of objects
    let final = [];
    for (let object of arr) { //Iterate through array, and parse out specific property from each object
        if (lower) {final.push(object[property].toLowerCase());}
        else {final.push(object[property]);}
    }
    return final;
}

package.removeIfIncluded = function(arr, element, property) {
    if (property) { //If a specific property in the element needs to be evaluated, evaluate element's property
        if (package.objectArrIndex(arr, property, element) > -1) {
            arr.splice(package.objectArrIndex(arr, property, element), 1);
            return true;
        }
        return false;
    } else { //If no specific property is listed, evaluate element's exact value
        if (arr.includes(element)) {
            arr.splice(arr.indexOf(element), 1);
            return true;
       }
       return false;
    }
}

package.parseKeysOrValues = function(obj, version) { //Take an object and extract either its keys or values
    let keys = [];
    let values = [];
    for (let key in obj) { //Iterate through object and updates both arrays
        keys.push(key);
        values.push(obj[key]);
    }
    if (version == "keys") {return keys;} //Depending on return value, return either keys or values
    return values;
}

package.concatMatrix = function(arrs) { //Take a list of arrays and concatenate them such that each element of the final array contains corresponding elements from individual arrays
    let mat = [];
    let temp = [];
    for (let i = 0; i < arrs[0].length; i++) { //Iterate through each position in first array
        temp = [];
        for (let arr of arrs) {if (arr[i]) {temp.push(arr[i]);}} //Build temporary array with each item at given index at all arrays
        mat.push(temp); //Add built array to matrix
    }
    return mat;
}

package.multiplyArrays = function(arr, number) { //Take an array and return multiple copies of it as a matrix
    let mat = []; //Matrix stores duplicated arrays
    for (let i = 0; i < number; i++) {mat.push(arr);}  //Add arrays for the number of occurrences
    return mat;
}

package.sortAlph = function(arr, property) {
    const sortedProperties = package.parsePropertyArray(arr, property, true).sort();
    let sortedArr = [];
    for (let element of sortedProperties) {
        sortedArr.push(arr[package.objectArrIndex(arr, property, element, null, true)]);
    }
    return sortedArr;
}

module.exports = package;