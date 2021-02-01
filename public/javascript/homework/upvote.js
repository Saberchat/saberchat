function upvote(button) {
    const courseId = button.id.split('-')[1];
    const tutorId = button.id.split("-")[2];
    const url = `/homework/upvote/${courseId}?_method=put`;
    const data = {tutorId};

    $.post(url, data, data => {
        if(data.success) {

            if (data.success.includes("Downvoted")) {
                button.innerHTML = `<span class="not-upvoted"><i class="fas fa-arrow-circle-up"></i><span class="upvote-count" id="upvoteCount-<%=course._id%>-${tutorId}"> ${data.upvoteCount}</span></span>`;

            } else {
                button.innerHTML = `<span class="upvoted"><i class="fas fa-arrow-circle-up"></i><span class="upvote-count" id="upvoteCount-<%=course._id%>-${tutorId}"> ${data.upvoteCount}</span></span>`;
            }
        }
    });
}

function likeReview(button) { //Like a tutor's review (restricted to students and former students)
    const reviewId = button.id.split('-')[1];
    const url = `/homework/like-review/${reviewId}?_method=put`;
    const data = {};

    $.post(url, data, data => {
        if(data.success) {
            if (data.success.includes("Liked")) {
                button.style.color = "#03a5fc";
            } else {
                button.style.color = "white";
            }
            document.getElementById(`like-count-${reviewId}`).innerText = data.likeCount;
        }
    });
}
