const like = function (button) { //Like an announcement
    const announcementId = button.id.split("-")[1];
    const url = `/announcements/like?_method=put`;
    const data = {announcementId};
    $.post(url, data, data => {
        if (data.success) {
            if (data.success.includes("Removed a like")) { //If response involved removing a like, change button color based on page
                if (button.id.split("-")[2] == "index")  {
                    button.style.color = "white";
                } else if (button.id.split("-")[2] == "show") {
                    button.style.color = "grey";
                }
            } else { //If response involved adding a like, change color
                button.style.color = "#03a5fc";
            }
            document.getElementsByClassName(`likeCount-${announcementId}`)[0].innerText = data.likeCount; //Update the number of likes
        }
    });
}

const likeComment = function (button) { //Like a comment on an announcement
    const commentId = button.id.split("-")[1];
    const url = `/announcements/like-comment?_method=put`;
    const data = {commentId};
    $.post(url, data, data => {
        if (data.success) {
            if (data.success.includes("Removed a like")) { //If response involved removing a like, change button color
                button.style.color = "grey";
            } else { //If response involved adding a like, change button color
                button.style.color = "#03a5fc";
            }
            document.getElementById(`likeCountComment-${commentId}`).innerText = data.likeCount; //Update number of likes
        }
    });
}
