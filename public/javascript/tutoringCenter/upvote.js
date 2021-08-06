const upvote = function(button, location) { //Upvote a tutor
    const courseId = button.id.split('-')[1];
    const tutorId = button.id.split("-")[2];
    const url = `/tutoringCenter/upvote/${courseId}?_method=put`;
    const data = {tutorId};

    sendPostReq(url, data, data => {
        if (data.success) {
            if (data.success.includes("Downvoted")) { //If downvoting tutor, make color grey
                button.innerHTML = `<span class="not-upvoted"><i class="fas fa-arrow-circle-up"></i><span class="upvote-count" id="upvoteCount-<%=course._id%>-${tutorId}"> ${data.upvoteCount}</span></span>`;

            } else {
                button.innerHTML = `<span class="upvoted"><i class="fas fa-arrow-circle-up"></i><span class="upvote-count" id="upvoteCount-<%=course._id%>-${tutorId}"> ${data.upvoteCount}</span></span>`;
            }

            if (location) { //Styling works different on tutor-show page
                if (location == "show") {
                    button.innerHTML += "<br>"
                }
            }
        } else {
            console.log(data);
        }
    });
}

const likeReview = function(button) { //Like a tutor's review (restricted to students and former students)
    const reviewId = button.id.split('-')[1];
    const url = `/tutoringCenter/like-review/${reviewId}?_method=put`;
    const data = {};

    sendPostReq(url, data, data => {
        if (data.success) {
            if (data.success.includes("Liked")) {
                button.style.color = "#03a5fc";
            } else {
                button.style.color = "white";
            }
            document.getElementById(`like-count-${reviewId}`).innerText = data.likeCount;
        }
    });
}
