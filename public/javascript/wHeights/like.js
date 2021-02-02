const likeComment = (button => {
    const commentId = button.id.split("-")[1];
    const url = `/articles/like-comment?_method=put`;
    const data = {commentId};
    $.post(url, data, data => {
        if (data.success) {

            if (data.success.includes("Removed a like")) {
                button.style.color = "grey";

            } else {
                button.style.color = "#03a5fc";
            }

            document.getElementById(`likeCountComment-${commentId}`).innerText = data.likeCount;

        }
    });
});
