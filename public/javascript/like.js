const like = function(button, object, route) { //Like an object
    const id = button.id.split("-")[1];
    const url = `/${route}/like?_method=put`;
    const data = {};
    data[`${object}Id`] = id;
    sendPostReq(url, data, data => {
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
            document.getElementsByClassName(`likeCount-${id}`)[0].innerText = data.likeCount; //Update the number of likes
        }
    });
}

const likeComment = function(button, object, route) { //Like a comment on an object
    const commentId = button.id.split("-")[1];
    const url = `/${route}/like-comment?_method=put`;
    const data = {commentId};
    sendPostReq(url, data, data => {
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
