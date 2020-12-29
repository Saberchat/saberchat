const searchFunction = (() => {
  let input = document.getElementById("search-input");
  let filter = input.value.toUpperCase();
  let list = document.getElementById("user-list");
  let users = list.getElementsByClassName('form-check');
  for (i = 0; i < users.length; i++) {
    let user = users[i].getElementsByTagName('label')[0];
    let txtValue = user.textContent || user.innerText;
    if (txtValue.toUpperCase().indexOf(filter) > -1) {
      users[i].style.display = "";
    } else {
      users[i].style.display = "none";
    }
  }
});
