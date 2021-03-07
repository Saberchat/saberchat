// sends put request with data
const comment = ((form, event) => {

    if (document.getElementById('comment-input').value.split(' ').join('') != '') {
        const articleId = form.id.split("-")[1];
        const url = `/articles/comment?_method=put`;
        const data = {article: articleId, text: document.getElementById('comment-input').value};
        document.getElementById('comment-input').value = ""; //Empty input field

        $.post(url, data, data => {

            if (data.success) {
                // DOM Elements that change with new comment
                const comments = document.getElementsByClassName('comment-body');
                const allComments = document.getElementById('all-comments');

                //Update the two HTML comment counters
                document.getElementById('comments-count-icon').innerHTML = `<i class="fas fa-comment-dots"></i> ${data.comments.length}`;
                document.getElementById('comments-heading').innerText = `Comments (${data.comments.length})`;

                //Build a comment body for new message
                let newComment = document.createElement('div');
                newComment.className = "media mb-2 comment-body";
                newComment.style = "text-align: left;";
                let commentHTML;
                //Build comment body based on user's image display
                if (data.comments[data.comments.length - 1].sender.imageFile.display) {
                     commentHTML = `<img src="${data.comments[data.comments.length - 1].sender.imageFile.url}" alt="user" class="user-image"><div class="media-body ml-3"><div class="bg-primary rounded py-2 px-3 mb-2 w-75"><p class="text-small mb-0 text-white">`;
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
                commentHTML += `</p></div><p class="small text-muted msg-info"><span class="username">Me</span>, ${data.comments[data.comments.length - 1].date}</p><span class="unliked-comment" id="likeComment-${data.comments[data.comments.length - 1]._id}" onclick="likeComment(this)"><i class="fas fa-thumbs-up"></i></span> <span class="like-comment-comment" id="likeCountComment-${data.comments[data.comments.length - 1]._id}">0</span></div>`;

                // Add the new comment to the top of the list of comments
                newComment.innerHTML = commentHTML;
                allComments.insertBefore(newComment, allComments.children[0]);

            }
        });
        event.preventDefault(); //Prevent page from automatically refreshing
    }
});

const reply = (comment => { //When reply button is clicked, put the replied comment sender's username in the input field
    document.getElementById('comment-input').value = `@${comment.id.split("comment-")[1]}_ `
});
