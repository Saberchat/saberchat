const updateRole = function (select) { //Update user's permission
    const loading = document.getElementById('loading'); //Button which shows request status
    loading.style.display = 'block';
    loading.style.color = 'gray';
    loading.innerHTML = 'Waiting...';
    const role = select.value;
    const url = '/admin/permissions?_method=put';
    const userId = select.id;
    const data = {userId, role};
    $.post(url, data, (data) => {
        if (data.success) { //If successful, display success info
            loading.style.color = 'green';
            loading.innerHTML = data.success;
        } else if (data.error) { //If unsuccessful, display error message
            loading.style.color = 'red';
            loading.innerHTML = data.error;
        }

        setTimeout(() => { //After a second, hide the message
            loading.style.display = "none";
        }, 1000);

        if (data.user) { //If a user was updated, change their displayed permission
            for (let option of select) {
                if (option.value == data.user.permission) {
                    option.selected = true;
                }
            }
        }
    });
}

const updateBalance = function(form, event) {
    const loading = document.getElementById('loading'); //Button which shows request status
    loading.style.display = 'block';
    loading.style.color = 'gray';
    loading.innerHTML = 'Waiting...';
    const userId = form.id;
    const balanceInput = document.getElementById(`balance-${userId}`);
    const url = '/admin/balances?_method=put';
    const data = {userId, bal: balanceInput.value};
    $.post(url, data, (data) => {
        if (data.success) { //If successful, display success info
            loading.style.color = 'green';
            loading.innerHTML = data.success;
            if (data.balance == 0) {
                balanceInput.value = "0.00";
            } else {
                balanceInput.value = `${(data.balance * 100).toString().slice(0, (data.balance * 100).toString().length - 2)}.${(data.balance * 100).toString().slice((data.balance * 100).toString().length - 2)}`;
            }

        } else if (data.error) { //If unsuccessful, display error message
            loading.style.color = 'red';
            loading.innerHTML = data.error;
        }

        setTimeout(() => { //After a second, hide the message
            loading.style.display = "none";
        }, 1000);
    });
    event.preventDefault();
}