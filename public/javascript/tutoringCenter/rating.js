let starCounts = new Map(); //Create global map of tutors' ratings

const rate = function(button, tutorId) { //Rate a tutor
    if (starCounts.has(tutorId)) {
        //If clicked star is already the number of stars, subtract 1 (most out-of-5 review systems I have found work this way)
        if (starCounts.get(tutorId) == parseInt(button.id)) {
            starCounts.set(tutorId, parseInt(button.id) - 1);
        } else {
            starCounts.set(tutorId, parseInt(button.id));
        }
    } else { //Add new value to star counts
        starCounts.set(tutorId, parseInt(button.id));
    }

    //Reset the total rating average
    for (let star of document.getElementsByClassName(`star-${tutorId}`)) {
        star.style.color = "black";
        if (parseInt(star.id) <= starCounts.get(tutorId)) {
            star.style.color = "#cc9537";
        }
    }
}

const submitRating = function(button, location) { //Submit rating with text and stars
    const courseId = button.id.split('-')[0];
    const tutorId = button.id.split("-")[1];
    if (!starCounts.has(tutorId)) {starCounts.set(tutorId, 0);} //If tutor not in map, add with their rating

    //Send data to server and process new tutor rating
    const url = `/tutoringCenter/rate/${courseId}?_method=put`;
    const data = {tutorId, rating: starCounts.get(tutorId), text: document.getElementById(`review-${tutorId}`).value};

    sendPostReq(url, data, data => {
        if (data.success) {
            document.getElementById(`review-${tutorId}`).value = "";

            for (let star of document.getElementsByClassName(`star-${tutorId}`)) { //Reset all average stars
                star.style.color = "black";
            }

            //Fill stars with gold color based on average rating
            for (let average_star of document.getElementsByClassName(`average-rating-${tutorId}`)) {
                average_star.style.color = "black";

                if (parseInt(average_star.id) <= data.averageRating) {
                    average_star.style.color = "#cc9537";
                }
            }

            if (location == "tutor-show") { //On tutor-show page, build review div with text, like button, and stars
                let newReview = document.createElement('div');
                newReview.className = "col-md-8 col-12";
                let starString = ``
                for (let i = 0; i < 5; i += 1) { //Iterate through each star-count and build until total rating is reached
                    if (i + 1 <= data.review.rating) {
                        starString += ` <i id="${i + 1}" class="fas fa-star average-rating-selected"></i>`;
                    } else {
                        starString += ` <i id="${i + 1}" class="fas fa-star average-rating-unselected"></i>`;
                    }
                }

                //Add user's profile picture to the review
                let imageUrl;
                if (data.user.mediaFile.display) {
                    imageUrl = data.user.mediaFile.url;
                } else {
                    imageUrl = data.user.imageUrl.url;
                }

                //Fill div with HTML styling
                newReview.innerHTML = `<section class="profile-desc shop"><div class="desc-head"><h3><img class="follower-image" src="${imageUrl}"/><span class="review-sender">${data.user.firstName} ${data.user.lastName}</span></h3> <i id="like-${data.review._id}" class="fas fa-thumbs-up review-unliked" onclick="likeReview(this)"></i> <span id="like-count-${data.review._id}" class="like-count">${data.review.likes.length}</span><div title="Ratings" class="ratings">${starString}</div><div title="date" class="review-date">${data.review.date}</div><hr></div><div class="desc-body"><p>${data.review.text}</p></div></section><br>`;
                document.getElementsByClassName('reviews')[0].insertBefore(newReview, document.getElementsByClassName('reviews')[0].firstChild);
            }

            //Update displayed reviews length
            document.getElementById(`reviews-length-${tutorId}`).innerText = `${data.reviews_length}`;
            $(`#modal-review-${tutorId}`).modal('hide');
        }
    });
}
