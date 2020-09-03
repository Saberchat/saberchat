const loading = document.getElementById('loading');

// sends put request with data
function updateStatus(select) {
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
}