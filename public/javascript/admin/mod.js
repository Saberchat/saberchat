const ignoreComment = (button => {
  const listItem = (button.parentNode).parentNode;
  const url = '/admin/moderate?_method=put';
  const commentId = button.id;
  $.post(url, {id: commentId}, function(data) {
    if(data.success) {
      listItem.remove();
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
    }
  });
});
