// sends put request with data
const comment = (form => {

  if (document.getElementById('comment-input').value.split(' ').join('') != '') {
    const projectId = form.id.split("-")[1];
    const url = `/projects/comment?_method=put`;
    const data = {project: projectId, text: document.getElementById('comment-input').value};
    $.post(url, data, function(data) {
      if(data.success) {
        setTimeout(() => {
          window.location.reload();
        }, 5)

      } else if(data.error) {}
    });

  }
})

const reply = (comment => {
  document.getElementById('comment-input').value = `@${comment.id.split("comment-")[1]}_ `
})
