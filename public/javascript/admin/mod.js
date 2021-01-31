let loaded = [];

const ignoreComment = (button => {
  const url = '/admin/moderate?_method=put';
  const commentId = button.id.split('-')[1];
  const listItem = document.getElementById(`comment-${commentId}`);
  $.post(url, {id: commentId}, function(data) {
    $(`#modal-ignore-${commentId}`).modal('hide');
    if(data.success) {
      listItem.remove();
      const reportedComments = document.getElementsByClassName("reported-comment");
      if (reportedComments.length == 0) {
        document.getElementById("reported-comments-header").innerText = "No Reported Comments";
      }

    } else if (data.error) {
      document.getElementById("mod-error").innerText = data.error;
      document.getElementById("mod-error").style.display = "inline";

      setTimeout(() => {
        document.getElementById("mod-error").style.display = "none";
      }, 1000);
    }
  });
});

const deleteComment = (button => {
  const url = '/admin/moderate?_method=delete';
  const commentId = button.id.split('-')[1];
  const listItem = document.getElementById(`comment-${commentId}`);
  $.post(url, {id: commentId}, function(data) {
    $(`#modal-delete-${commentId}`).modal('hide');
    if(data.success) {
      listItem.remove();
      const reportedComments = document.getElementsByClassName("reported-comment");
      if (reportedComments.length == 0) {
        document.getElementById("reported-comments-header").innerText = "No Reported Comments";
      }

    } else if (data.error) {
      document.getElementById("mod-error").innerText = data.error;
      document.getElementById("mod-error").style.display = "inline";

      setTimeout(() => {
        document.getElementById("mod-error").style.display = "none";
      }, 1000);
    }
  });
});

const getContext = (button => {
  const url = '/admin/moderate';
  const commentId = button.id.split('-')[1];
  const data = {commentId};

  if (!loaded.includes(commentId)) {
    loaded.push(commentId);

    $.post(url, data, function(data) {
      if (data.success) {
        const contextBody = document.getElementById(`context-body-${commentId}`);
        let newComment;

        for (let comment of data.context) {
          newComment = document.createElement('div');
          newComment.className = "media mb-2";

          if (comment._id.toString() == commentId) {
            newComment.innerHTML = `<img src="${comment.author.imageUrl}" alt="user" class="user-image"> <div class="media-body ml-3"> <div class="bg-primary rounded py-2 px-3 mb-2 w-75"> <p class="text-small mb-0 text-white"> ${comment.text}</p> </div> <p class="small text-muted msg-info"><span class="username">${comment.author.username}</span>, ${comment.date}</p></div>`;

          } else {
            newComment.innerHTML = `<img src="${comment.author.imageUrl}" alt="user" class="user-image"> <div class="media-body ml-3"> <div class="bg-grey rounded py-2 px-3 mb-2 w-75"> <p class="text-small mb-0 text-dark"> ${comment.text}</p> </div> <p class="small text-muted msg-info"><span class="username">${comment.author.username}</span>, ${comment.date}</p></div>`;
          }
          contextBody.appendChild(newComment);
        }

      } else {
        $(`#modal-context-${commentId}`).modal('hide');
      }
    });
  }
});
