const updateRole = function(select) { //Update user's permission
    const loading = document.getElementById('loading'); //Button which shows request status
    loading.style.display = 'block';
    loading.style.color = 'gray';
    loading.innerHTML = 'Waiting...';
    const role = select.value;
    const url = '/admin/permissions?_method=put';
    const userId = select.id;
    const data = {userId, role};
    sendPostReq(url, data, (data) => {
        if (data.success) { //If successful, display success info
            loading.style.color = 'green';
            loading.innerHTML = data.success;
        } else if (data.error) { //If unsuccessful, display error message
            loading.style.color = 'red';
            loading.innerHTML = data.error;
        }

        setTimeout(() => {loading.style.display = "none";}, 2000);  //After a second, hide the message
        if (data.user) { //If a user was updated, change their displayed permission
            for (let option of select) {
                if (option.value == data.user.permission) {
                    option.selected = true;
                }
            }
        }
    });
}

const incBalance = function(userId, dollarPayment) { //Add 1 to balance
    const input = document.getElementById(`balance-${userId}`);
    if (dollarPayment) {input.value = (parseFloat(input.value) + 1).toFixed(2);
    } else {input.value = (parseFloat(input.value) + 1);}
    updateBalance(document.getElementById(userId), event);
}

const decBalance = function(userId, dollarPayment) { //Remove 1 from balance
    const input = document.getElementById(`balance-${userId}`);
    if (parseFloat(input.value) -1 >= 0) { //Check that balance still > 0
        if (dollarPayment) {input.value = (parseFloat(input.value) - 1).toFixed(2);
        } else {input.value = (parseFloat(input.value) - 1);}
        updateBalance(document.getElementById(userId), event);
    }
}

const updateBalance = function(form, event, dollarPayment) {
    const loading = document.getElementById('loading'); //Button which shows request status
    loading.style.display = 'block';
    loading.style.color = 'gray';
    loading.innerHTML = 'Waiting...';
    const userId = form.id;
    const balanceInput = document.getElementById(`balance-${userId}`);
    const url = '/admin/balances?_method=put';
    const data = {userId, bal: balanceInput.value};
    sendPostReq(url, data, (data) => {
        if (data.success) { //If successful, display success info
            loading.style.color = 'green';
            loading.innerHTML = data.success;
            if (dollarPayment) {balanceInput.value = parseFloat(data.balance).toFixed(2);
            } else {balanceInput.value = data.balance}
        } else if (data.error) { //If unsuccessful, display error message
            loading.style.color = 'red';
            loading.innerHTML = data.error;
        }
        setTimeout(() => {loading.style.display = "none";}, 2000); //After a second, hide the message
    });
    event.preventDefault();
}