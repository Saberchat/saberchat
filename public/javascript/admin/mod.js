function ignoreComment(button) {
    const url = '/admin/moderate?_method=put';
    const commentId = button.id;
    $.post(url, {id: commentId}, function(data) {
        if(data.success) {
            console.log(data.success);
        } else if(data.error) {
            console.log(data.error);
        }
    });
}

function deleteComment(button) {
    const url = '/admin/moderate?_method=delete';
    const commentId = button.id;
    $.post(url, {id: commentId}, function(data) {
        if(data.success) {
            console.log(data.success);
        } else if(data.error) {
            console.log(data.error);
        }
    });
}