//Popularity Functions can be used to calculate and sort popularity for projects, cafe items, tutors, etc.

// Takes an array of post objects and outputs the average popularity coefficient (likes per day)
const getPopularityCoefficiant = function (posts, likeFactor, dateFactor) {
    const now = new Date().getTime();
    const rate = 86400; //Rate of conversion is seconds to days
    let popularityCoefficiant = 0;
    for (let post of posts) {
        //Check datatype of likeFactor (can be a list of likes or a uniform int)
        if (typeof post[likeFactor] == "number") {
            popularityCoefficiant += ((rate * post[likeFactor]) / (now - post[dateFactor].getTime())) / posts.length;
        } else {
            popularityCoefficiant += ((rate * post[likeFactor].length) / (now - post[dateFactor].getTime())) / posts.length;
        }
    }
    return popularityCoefficiant;
}

const sortByPopularity = function (posts, likeFactor, dateFactor, fields) { //Sort posts by popularity coefficiant
    let sorted = {popular: [], unpopular: []}; //Object holds both popular and unpopular items

    let temp; //Sort posts by order of popularity coefficiant
    for (let i = 0; i < posts.length - 1; i++) {
        for (let j = 0; j < posts.length - 1; j++) {
            if (getPopularityCoefficiant([posts[j]], likeFactor, dateFactor) < getPopularityCoefficiant([posts[j + 1]], likeFactor, dateFactor)) {
                temp = posts[j];
                posts[j] = posts[j + 1];
                posts[j + 1] = temp;
            }
        }
    }

    for (let post of posts) { //Uses popularity coefficiant to sort posts into popular and unpopular
        if (getPopularityCoefficiant([post], likeFactor, dateFactor) >= getPopularityCoefficiant(posts, likeFactor, dateFactor)) {
            sorted.popular.push(post);
        } else {
            sorted.unpopular.push(post);
        }
    }

    if (fields) { //If function includes specific fields as params
        let sortedByField = {popular: [], unpopular: []};
        for (let category in sorted) {
            for (let post of sorted[category]) {
                for (let field in post) {
                    if (fields.includes(field)) {
                        sortedByField[category].push(post[field]);
                    }
                }
            }
        }
        return sortedByField;
    }
    return sorted;
}

module.exports = {getPopularityCoefficiant, sortByPopularity};
