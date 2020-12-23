const loading = document.getElementById('loading');

// sends put request with data
const updateStatus = (select => {
  loading.style.color = 'gray';
  loading.innerHTML = 'Waiting...';
  const status = select.value;
  const url = '/admin/status?_method=put';
  const userId = select.id;
  const data = {user: userId, status: status};
  $.post(url, data, function(data) {
    if(data.success) {
        loading.style.color = 'green';
        loading.innerHTML = data.success;
    } else if(data.error) {
        loading.style.color = 'red';
        loading.innerHTML = data.error;
    }
  });
})

// sends put request with data
const updateTag = (select => {
  loading.style.color = 'gray';
  loading.innerHTML = 'Waiting...';
  const tag = select.value;
  const url = '/admin/tag?_method=put';
  const userId = select.id;
  const data = {user: userId, tag: tag};
  $.post(url, data, function(data) {
    if(data.success) {
        setTimeout(() => {
          window.location.reload();
          loading.style.color = 'green';
          loading.innerHTML = data.success;
        }, 5)
    } else if(data.error) {
        loading.style.color = 'red';
        loading.innerHTML = data.error;
    }
  });
})
