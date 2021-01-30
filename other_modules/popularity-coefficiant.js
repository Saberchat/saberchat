//Popularity Functions can be used to calculate and sort popularity for projects, cafe items, tutors, etc.

//Takes an array of post objects (must have likes and a date created), and outputs the popularity coefficient (likes per day)
const getPopularityCoefficiant = ((posts, likeFactor, dateFactor) => {
  const now = new Date().getTime();
  const rate = 86400; //Rate of conversion is seconds to days
  let popularityCoefficiant = 0;
  for (let post of posts) {
    popularityCoefficiant += ((rate*post[likeFactor].length)/(post[dateFactor].getTime() - now))/posts.length;
  }
  return popularityCoefficiant;
});

//Sort posts by popularity
const sortByPopularity = ((posts, likeFactor, dateFactor) => {
  let temp;
  let sorted = {
    popular: [],
    unpopular: []
  }

  for (let i = 0; i < posts.length - 1; i ++) {
    for (let j = 0; j < posts.length - 1; j ++) {
      if (getPopularityCoefficiant([posts[j]], likeFactor, dateFactor) < getPopularityCoefficiant([posts[j+1]], likeFactor, dateFactor)) {
        temp = posts[j];
        posts[j] = posts[j+1];
        posts[j+1] = temp;
      }
    }
  }

  for (let post of posts) {
    if (getPopularityCoefficiant([post], likeFactor, dateFactor) >= getPopularityCoefficiant(posts, likeFactor, dateFactor)) {
      sorted.popular.push(post);

    } else {
      sorted.unpopular.push(post);
    }
  }
  return sorted;
});

module.exports = {getPopularityCoefficiant, sortByPopularity};
