// sends put request with data
const like = (button => {
  const announcementId = button.id.split("-")[1];
  const url = `/announcements/like?_method=put`;
  const data = {announcement: announcementId};
  $.post(url, data, function(data) {
    if(data.success) {

      if (data.success.includes("Removed a like")) {

        if (button.id.split("-")[2] == "index") {
          button.style.color = "white";

        } else if (button.id.split("-")[2] == "show"){
          button.style.color = "grey";
        }

      } else {
        button.style.color = "#03a5fc";
      }

      document.getElementById(`likeCount-${announcementId}`).innerText = data.likeCount;
    }

  });
});

const likeComment = (button => {
  const announcementId = button.id.split("-")[2];
  const commentIndex = parseInt(button.id.split("-")[1]);
  const url = `/announcements/like-comment?_method=put`;
  const data = {announcement: announcementId, commentIndex: commentIndex};
  $.post(url, data, function(data) {
    if(data.success) {

      if (data.success.includes("Removed a like")) {
        button.style.color = "grey";

      } else {
        button.style.color = "#03a5fc";
      }

      document.getElementById(`likeCountComment-${commentIndex}-${announcementId}`).innerText = data.likeCount;

    }
  });
});
