const likeComment = function (button) { //Like a comment on an article
    const commentId = button.id.split("-")[1];
    const url = `/articles/like-comment?_method=put`;
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
