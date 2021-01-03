// sends put request with data
const upvote = (button => {
  const courseId = button.id.split('-')[1];
  const tutorId = button.id.split("-")[2];
  const url = `/homework/upvote/${courseId}?_method=put`;
  const data = {tutor: tutorId};
  $.post(url, data, function(data) {
    if(data.success) {

      if (data.success.includes("Downvoted")) {
        button.style.color = "grey";

      } else {
        button.style.color = "red";
      }

      document.getElementById(`upvoteCount-${courseId}-${tutorId}`).innerText = data.upvoteCount;
    }
  });
});
