const loading = document.getElementById('loading');

// sends put request with data
const updateRole = (select => {
  loading.style.color = 'gray';
  loading.innerHTML = 'Waiting...';
  const role = select.value;
  const url = '/admin/permissions?_method=put';
  const userId = select.id;
  const data = {user: userId, role: role};
  $.post(url, data, function(data) {
    if(data.success) {
        loading.style.color = 'green';
        loading.innerHTML = data.success;
    } else if(data.error) {
        loading.style.color = 'red';
        loading.innerHTML = data.error;
    }

    if (data.user) {
      for (let option of select) {
        if (option.value == data.user.permission) {
          option.selected = true;
        }
      }
    }

  });
});

const searchFunction = (() => {
  const users = document.getElementsByClassName('user');
  const searchInput = document.getElementById('search-input');
  let filter = searchInput.value.toLowerCase();

  for (let i = 0; i < users.length; i += 1) {
    if (!(users[i].textContent.split('\n')[1].toLowerCase().includes(filter) || users[i].classList.toString().toLowerCase().includes(filter.toLowerCase()))) {
      users[i].hidden = true;

    } else {
      users[i].hidden = false;
    }
  }
});
