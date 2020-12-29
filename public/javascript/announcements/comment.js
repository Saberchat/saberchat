// sends put request with data
const comment = ((form, event) => {

  if (document.getElementById('comment-input').value.split(' ').join('') != '') {
    const announcementId = form.id.split("-")[1];
    const url = `/announcements/comment?_method=put`;
    const data = {announcement: announcementId, text: document.getElementById('comment-input').value};
    document.getElementById('comment-input').value = ""; //Empty input field

    $.post(url, data, function(data) {

      if(data.success) {
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
        let commentHTML = `<img src="${data.comments[data.comments.length -1].sender.imageUrl}" alt="user" class="user-image"><div class="media-body ml-3"><div class="bg-primary rounded py-2 px-3 mb-2 w-75"><p class="text-small mb-0 text-white">`;

        // If someone is mentioned in this segment, make their @ a link
        for (let line of data.comments[data.comments.length-1].text.split(" ")) {
          if (line[0] == '@') {
            commentHTML += `<a style="color: white;" href="../profiles/${line.split('#')[1].split('_')[0]}">${line.split("#")[0]}</a> `;
          } else {
            commentHTML += `${line} `;
          }
        }

        // Add date value and closing tags
        commentHTML += `</p></div><p class="small text-muted msg-info"><span class="username">Me</span>, ${data.comments[data.comments.length-1].date}</p></div>`;

        // Add the new comment to the top of the list of comments
        newComment.innerHTML = commentHTML;
        allComments.insertBefore(newComment, allComments.children[0]);

      }
    });

    event.preventDefault(); //Prevent page from automatically refreshing
  }
});

const reply = (comment => {
  document.getElementById('comment-input').value = `@${comment.id.split("comment-")[1]}_ `
})
