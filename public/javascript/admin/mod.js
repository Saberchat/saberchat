const ignoreComment = (button => {
  const listItem = (button.parentNode).parentNode;
  const url = '/admin/moderate?_method=put';
  const commentId = button.id;
  $.post(url, {id: commentId}, function(data) {
    if(data.success) {
      listItem.remove();
      const reportedComments = document.getElementsByClassName("reported-comment");
      if (reportedComments.length == 0) {
        document.getElementById("reported-comments-header").innerText = "No Reported Comments";
      }
    }
  });
});

const deleteComment = (button => {
  const listItem = (button.parentNode).parentNode;
  const url = '/admin/moderate?_method=delete';
  const commentId = button.id;
  $.post(url, {id: commentId}, function(data) {
    if(data.success) {
      listItem.remove();
      const reportedComments = document.getElementsByClassName("reported-comment");
      if (reportedComments.length == 0) {
        document.getElementById("reported-comments-header").innerText = "No Reported Comments";
      }
    }
  });
});
