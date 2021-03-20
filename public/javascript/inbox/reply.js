const reply = function () {
    document.getElementById('reply-box').hidden = false;
}

const cancelReply = function () {
    document.getElementById('reply-box').hidden = true;
}

const sendReply = function (msg, event) {
    const msgId = msg.id.split('-')[2];
    const url = `/inbox/reply?_method=put`;

    let images = [];
    for (let image of document.getElementsByClassName('input-container')) {
        images.push(image.getElementsByTagName('input')[0].value);
    }

    const data = {message: msgId, text: document.getElementById('message').value, images: images.reverse()};
    $.post(url, data, data => {
        if (data.success) {
            const replyContainer = document.getElementById('reply-container');
            const replies = document.getElementsByClassName('replies');
            const imgContainer = document.getElementById('image-block');
            const modes = new Map([[true, "white"], [false, "black"]]);

            //Build string of new reply's images
            let imageString = ``;
            for (let image of data.message.replies[data.message.replies.length - 1].images) {
                imageString += `<img src="${image}" style="width: 40%; height: 40%; margin-bottom: 10px; border-radius: 15px;"/><br>`;
            }

            //Create HTML article element for reply
            let newReply = document.createElement('article');
            newReply.className = "msg-container replies";
            newReply.style = "padding: 20px";
            newReply.innerHTML = `<h4>Reply From <a style="color: ${modes.get(data.darkmode)};" href="../../profiles/${data.message.replies[data.message.replies.length - 1].author._id}">${data.message.replies[data.message.replies.length - 1].author.username}</a></h4><p>${data.message.replies[data.message.replies.length - 1].date}</p><p>${data.message.replies[data.message.replies.length - 1].text}</p>${imageString}`;
            replyContainer.appendChild(newReply);

            //Clear all fields in the reply field, and hide reply container
            document.getElementById('message').value = "";
            imgContainer.innerHTML = '';
            document.getElementById('reply-box').hidden = true;
        }
    });
    event.preventDefault(); //Prevent page from refreshing
}
