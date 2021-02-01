// Upvotes a tutor
const upvote = (button => {
  const courseId = button.id.split('-')[1];
  const tutorId = button.id.split("-")[2];
  const url = `/homework/upvote/${courseId}?_method=put`;
  const data = {tutorId};
  $.post(url, data, function(data) {
    if(data.success) {

      if (data.success.includes("Downvoted")) {
        button.innerHTML = `<span class="not-upvoted"><i class="fas fa-arrow-circle-up"></i><span id="upvoteCount-<%=course._id%>-${tutorId}"> ${data.upvoteCount}</span><br></span>`;

      } else {
        button.innerHTML = `<span class="upvoted"><i class="fas fa-arrow-circle-up"></i><span id="upvoteCount-<%=course._id%>-${tutorId}"> ${data.upvoteCount}</span><br></span>`;
      }
    }
  });
});

const likeReview = (button => {
  const reviewId = button.id.split('-')[1];
  const url = `/homework/like-review/${reviewId}?_method=put`;
  const data = {};

  $.post(url, data, function(data) {
    if(data.success) {

      if (data.success.includes("Liked")) {
        button.style.color = "#03a5fc";

      } else {
        button.style.color = "white";
      }

      document.getElementById(`like-count-${reviewId}`).innerText = data.likeCount;

    } else {
      console.log(data.error);
    }
  });
});
