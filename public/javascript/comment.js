let replyId; //Stores address of comment to which reply is directed

const comment = function(form, object, route, event) {
    if (document.getElementById('comment-input').value.split(' ').join('') != '') {
        const id = form.id.split("-")[1];
        const url = `/${route}/comment?_method=put`;
        const data = {text: document.getElementById('comment-input').value, replyId};
        data[`${object}Id`] = id;
        document.getElementById('comment-input').value = ""; //Empty input field

        sendPostReq(url, data, data => {
            if (data.success) {
                const allComments = document.getElementById('all-comments'); // DOM Elements that change with new comment

                //Update the two HTML comment counters
                document.getElementById('comments-count-icon').innerHTML = `<i class="fas fa-comment-dots"></i> ${data.comments.length}`;
                document.getElementById('comments-heading').innerText = `Comments (${data.comments.length})`;

                //Build a comment body for new message
                let newComment = document.createElement('div');
                newComment.className = "media mb-2 comment-body";
                newComment.style = "text-align: left;";

                let commentHTML;
                if (data.comments[data.comments.length - 1].sender.mediaFile.display) {
                     commentHTML = `<img src="${data.comments[data.comments.length - 1].sender.mediaFile.url}" alt="user" class="user-image"><div class="media-body ml-3"><div class="bg-primary rounded py-2 px-3 mb-2 w-75"><p class="text-small mb-0 text-white">`;
                 } else {
                     commentHTML = `<img src="${data.comments[data.comments.length - 1].sender.imageUrl.url}" alt="user" class="user-image"><div class="media-body ml-3"><div class="bg-primary rounded py-2 px-3 mb-2 w-75"><p class="text-small mb-0 text-white">`;
                 }

                // If someone is mentioned in this segment, make their @ a link
                for (let line of data.comments[data.comments.length - 1].text.split(" ")) {
                    if (line[0] == '@') {
                        commentHTML += `<a style="color: white;" href="../profiles/${line.split('#')[1].split('_')[0]}">${line.split("#")[0]}</a> `;
                    } else {
                        commentHTML += `${line} `;
                    }
                }

                // Add date value and closing tags
                commentHTML += `</p></div><p class="small text-muted msg-info"><span class="username">Me</span>, ${data.comments[data.comments.length - 1].date}</p><span class="unliked-comment" id="likeComment-${data.comments[data.comments.length - 1]._id}" onclick="likeComment(this, '${object}', '${route}')"><i class="fas fa-thumbs-up"></i></span> <span class="like-comment-comment" id="likeCountComment-${data.comments[data.comments.length - 1]._id}">0</span></div>`;

                // Add the new comment to the top of the list of comments
                newComment.innerHTML = commentHTML;
                allComments.insertBefore(newComment, allComments.children[0]);
            }
        });
        event.preventDefault(); //Prevent page from automatically refreshing
    }
}

const reply = function(comment) {
    document.getElementById('comment-input').value = `@${comment.id.split("comment-")[1]}_ `;
}