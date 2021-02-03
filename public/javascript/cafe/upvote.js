// sends put request with data
const upvote = function (button) {
    const itemId = button.id.split("-")[1];
    const url = `/cafe/upvote?_method=put`;
    const data = {item: itemId};
    $.post(url, data, data => {
        if (data.success) {
            if (data.success.includes("Downvoted")) {
                button.style.color = "grey";
            } else {
                button.style.color = "red";
            }
            document.getElementById(`upvoteCount-${itemId}`).innerText = data.upvoteCount;
        }
    });
}
