const ignoreComment = (button => {
  const listItem = (button.parentNode).parentNode;
  const url = '/admin/moderate?_method=put';
  const commentId = button.id;
  $.post(url, {id: commentId}, function(data) {
    if(data.success) {
        console.log(data.success);
        listItem.remove();
    } else if(data.error) {
        console.log(data.error);
    }
  });
});

const deleteComment = (button => {
  const listItem = (button.parentNode).parentNode;
  const url = '/admin/moderate?_method=delete';
  const commentId = button.id;
  $.post(url, {id: commentId}, function(data) {
    if(data.success) {
        console.log(data.success);
        listItem.remove();
    } else if(data.error) {
        console.log(data.error);
    }
  });
});
