//Popularity Functions can be used to calculate and sort popularity for projects, shop items, tutors, etc.
const {equateObjects} = require("../utils/object-operations");
const package = {};

// Takes an array of objects and outputs the average popularity coefficient (likes per day)
package.getPopularityCoefficiant = function(objects, likeFactor, dateFactor) {
    const now = new Date().getTime();
    const rate = 86400; //Rate of conversion is seconds to days
    let popularityCoefficiant = 0;
    for (let object of objects) {
        if (typeof object[likeFactor] == "number") { //Check datatype of likeFactor (can be a list or a uniform int)
            popularityCoefficiant += ((rate * object[likeFactor]) / (now - object[dateFactor].getTime())) / objects.length;
        } else {
            popularityCoefficiant += ((rate * object[likeFactor].length) / (now - object[dateFactor].getTime())) / objects.length;
        }
    }
    return popularityCoefficiant;
}

package.sortByPopularity = function(objects, likeFactor, dateFactor, fields) { //Sort objects by popularity coefficiant
    let sorted = {popular: [], unpopular: []}; //Object holds both popular and unpopular items
    for (let i = 0; i < objects.length - 1; i++) { //Sort objects by order of popularity coefficiant (Bubblesort Algorithm)
        for (let j = 0; j < objects.length - 1; j++) {
            if (package.getPopularityCoefficiant([objects[j]], likeFactor, dateFactor) < package.getPopularityCoefficiant([objects[j + 1]], likeFactor, dateFactor)) {
                [objects[j], objects[j+1]] = [objects[j+1], objects[j]]; //Swap elements if they are out of order
            }
        }
    }

    for (let object of objects) { //Uses popularity coefficiant to sort objects into popular and unpopular
        if (package.getPopularityCoefficiant([object], likeFactor, dateFactor) >= package.getPopularityCoefficiant(objects, likeFactor, dateFactor)) {
            sorted.popular.push(object);
        } else {
            sorted.unpopular.push(object);
        }
    }

    if (fields) { //If function includes specific fields as params
        let sortedByField = {popular: [], unpopular: []};
        //Group across each parameter (Comes out to n^3 due to dimensionality expansion)
        for (let category in sorted) {
            for (let object of sorted[category]) {
                for (let field in object) {
                    if (fields.includes(field)) {
                        sortedByField[category].push(object[field]);
                    }
                }
            }
        }
        return sortedByField;
    }
    return sorted;
}

module.exports = package;