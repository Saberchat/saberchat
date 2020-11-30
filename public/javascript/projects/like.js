// sends put request with data
const like = (button => {
  const projectId = button.id.split("-")[1];
  const url = `/projects/like?_method=put`;
  const data = {project: projectId};
  $.post(url, data, function(data) {
    if(data.success) {

      if (data.success.includes("Removed a like")) {

        if (button.id.split("-")[2] == "index") {
          button.style.color = "white";

        } else if (button.id.split("-")[2] == "show"){
          button.style.color = "grey";
        }

      } else {
        button.style.color = "#03a5fc";
      }

      document.getElementById(`likeCount-${projectId}`).innerText = data.likeCount;

    } else if(data.error) {}
  });
})
