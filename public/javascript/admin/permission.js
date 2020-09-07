const loading = document.getElementById('loading');

// sends put request with data
function updateRole(select) {
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
    });
}
