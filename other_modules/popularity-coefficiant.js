//Popularity Functions can be used to calculate and sort popularity for projects, cafe items, tutors, etc.

//Takes an array of post objects (must have likes and a date created), and outputs the average popularity coefficient (likes per day)
function getPopularityCoefficiant(posts, likeFactor, dateFactor) {
    const now = new Date().getTime();
    const rate = 86400; //Rate of conversion is seconds to days
    let popularityCoefficiant = 0;
    for (let post of posts) {
        popularityCoefficiant += ((rate * post[likeFactor].length) / (now - post[dateFactor].getTime())) / posts.length;
    }
    return popularityCoefficiant;
}

//Sort posts by popularity
function sortByPopularity(posts, likeFactor, dateFactor) {
    let sorted = { //Object holds both popular and unpopular items
        popular: [],
        unpopular: []
    };

    //Sort posts by order of popularity coefficiant
    let temp;
    for (let i = 0; i < posts.length - 1; i++) {
        for (let j = 0; j < posts.length - 1; j++) {
            if (getPopularityCoefficiant([posts[j]], likeFactor, dateFactor) < getPopularityCoefficiant([posts[j + 1]], likeFactor, dateFactor)) {
                temp = posts[j];
                posts[j] = posts[j + 1];
                posts[j + 1] = temp;
            }
        }
    }

    //Uses popularity coefficiant to sort posts into popular and unpopular
    for (let post of posts) {
        if (getPopularityCoefficiant([post], likeFactor, dateFactor) >= getPopularityCoefficiant(posts, likeFactor, dateFactor)) {
            sorted.popular.push(post);

        } else {
            sorted.unpopular.push(post);
        }
    }
  }

  //Return only specific fields
  if (fields) {
    let sortedFields = {popular: [], unpopular: []};
    for (let group in sorted) {
        for (let post of sorted[group]) {
            for (let attr in post) {
                if (fields.includes(attr)) {
                    sortedFields[group].push(post[attr]);
                }
            }
        }
    }
    return sortedFields;
  }

  return sorted;
}

module.exports = {getPopularityCoefficiant, sortByPopularity};
