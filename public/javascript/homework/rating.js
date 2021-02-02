let starCounts = new Map();

function rate(button, tutorId) {
    if (starCounts.has(tutorId)) {

        //If clicked star is already the number of stars, subtract 1 (most out-of-5 review systems I have found work this way)
        if (starCounts.get(tutorId) == parseInt(button.id)) {
            starCounts.set(tutorId, parseInt(button.id) - 1);
        } else {
            starCounts.set(tutorId, parseInt(button.id));
        }
    } else {
        starCounts.set(tutorId, parseInt(button.id));
    }

    for (let star of document.getElementsByClassName(`star-${tutorId}`)) {
        star.style.color = "black";
        if (parseInt(star.id) <= starCounts.get(tutorId)) {
            star.style.color = "#cc9537";
        }
    }
}

function submitRating(button, location) {
    const courseId = button.id.split('-')[0];
    const tutorId = button.id.split("-")[1];

    if (!starCounts.has(tutorId)) {
        starCounts.set(tutorId, 0);
    }

    const url = `/homework/rate/${courseId}?_method=put`;
    const data = {tutorId, rating: starCounts.get(tutorId), review: document.getElementById(`review-${tutorId}`).value};

    $.post(url, data, data => {
        if (data.success) {
            document.getElementById(`review-${tutorId}`).value = "";

            for (let star of document.getElementsByClassName(`star-${tutorId}`)) {
                star.style.color = "black";
            }

            for (let average_star of document.getElementsByClassName(`average-rating-${tutorId}`)) {
                average_star.style.color = "black";

                if (parseInt(average_star.id) <= data.averageRating) {
                    average_star.style.color = "#cc9537";
                }
            }

            if (location == "tutor-show") {
                let newReview = document.createElement('div');
                newReview.className = "col-md-8 col-12";

                let starString = ``
                for (let i = 0; i < 5; i += 1) {
                    if (i + 1 <= data.review.rating) {
                        starString += ` <i id="${i + 1}" class="fas fa-star average-rating-selected"></i>`;
                    } else {
                        starString += ` <i id="${i + 1}" class="fas fa-star"></i>`;
                    }
                }

                newReview.innerHTML = `<section class="profile-desc"><div class="desc-head"><h3><img class="follower-image" src="${data.user.imageUrl}"/><span class="review-sender">${data.user.firstName} ${data.user.lastName}</span></h3> <i id="like-${data.review.review._id}" class="fas fa-thumbs-up review-unliked" onclick="likeReview(this)"></i> <span id="like-count-${data.review.review._id}" class="like-count">${data.review.review.likes.length}</span><div title="Ratings" class="ratings">${starString}</div><div title="date" class="review-date">${data.review.review.date}</div><hr></div><div class="desc-body"><p>${data.review.review.text}</p></div></section><br>`;

                document.getElementsByClassName('reviews')[0].insertBefore(newReview, document.getElementsByClassName('reviews')[0].firstChild);
            }

            document.getElementById(`reviews-length-${tutorId}`).innerText = `${data.reviews_length}`;

            $(`#modal-review-${tutorId}`).modal('hide');

        }
    });
}
