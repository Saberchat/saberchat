const searchFunction = (() => {
  const projects = document.getElementsByClassName('text-block');
  const breaks = document.getElementsByClassName('text-break');
  const searchInput = document.getElementById('search-input');
  let filter = searchInput.value.toLowerCase();

  for (let i = 0; i < projects.length; i += 1) {
    if (!projects[i].textContent.replace("(Read More)", "").toLowerCase().includes(filter)) {
      $(`#${projects[i].id}`).hide();
      $(`#${breaks[i].id}`).hide();

    } else {
      $(`#${projects[i].id}`).show();
      $(`#${breaks[i].id}`).show();
    }
  }
});
