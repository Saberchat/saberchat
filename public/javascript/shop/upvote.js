const upvote = function(button) { //Upvote or remove an upvote from a given item
    const itemId = button.id.split("-")[1];
    const url = `/shop/item/${itemId}?_method=put`;
    const data = {};
    sendPostReq(url, data, data => {
        if (data.success) {
            if (data.success.includes("Downvoted")) { //If upvote is removed, make button grey
                button.style.color = "grey";
            } else { //If upvote is added, make button red
                button.style.color = "red";
            }
            document.getElementById(`upvoteCount-${itemId}`).innerText = data.upvoteCount; //Update upvote count
        }
    });
}
