const searchFunction = (() => {
  const emails = document.getElementsByClassName('email');
  const searchInput = document.getElementById('search-input');
  let filter = searchInput.value.toLowerCase();

  for (let i = 0; i < emails.length; i += 1) {
    if (!emails[i].innerText.replace('User Exists', '').toLowerCase().includes(filter)) {
      emails[i].hidden = true;

    } else {
      emails[i].hidden = false;
    }
  }
});
