// sends put request with data
const like = function(button) {
    const projectId = button.id.split("-")[1];
    const url = `/projects/like?_method=put`;
    const data = {project: projectId};
    $.post(url, data, data => {
        if (data.success) {
            if (data.success.includes("Removed a like")) {
                if (button.id.split("-")[2] == "index") {
                    button.style.color = "white";
                } else if (button.id.split("-")[2] == "show") {
                    button.style.color = "grey";
                }
            } else {
                button.style.color = "#03a5fc";
            }
            document.getElementsByClassName(`likeCount-${projectId}`)[0].innerText = data.likeCount;
        }
    });
}

const likeComment = function(button) {
    const commentId = button.id.split("-")[1];
    const url = `/projects/like-comment?_method=put`;
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
}
