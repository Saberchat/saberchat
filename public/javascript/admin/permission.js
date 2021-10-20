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

const highlight = function(input) { //Highlight input to avoid user errors in text deletion
    input.select();
}

const updateBalance = function(form, event, dollarPayment) {
    const userId = form.id;
    const loading = document.getElementById(`loading-${userId}`); //Button which shows request status
    loading.style.display = 'block';
    loading.style.color = 'gray';
    loading.innerHTML = 'Waiting...';
    const balanceInput = document.getElementById(`balance-${userId}`);
    const balanceDisplay = document.getElementById(`balance-tag-${userId}`);
    const url = '/admin/balances?_method=put';
    const data = {userId, bal: parseFloat(balanceInput.value)};
    sendPostReq(url, data, data => {
        if (data.success) { //If successful, display success info
            loading.style.color = 'green';
            loading.innerHTML = data.success;
            if (dollarPayment) {
                balanceInput.value = "0.00";
                balanceDisplay.innerText = parseFloat(data.balance).toFixed(2);
            } else {
                balanceInput.value = "0";
                balanceDisplay.innerText = data.balance;
            }
        } else if (data.error) { //If unsuccessful, display error message
            loading.style.color = 'red'; 
            loading.innerHTML = data.error;
        }
        setTimeout(() => {loading.style.display = "none";}, 5000); //After a second, hide the message
    });
    event.preventDefault();
}

const removeBalance = function(button, event, dollarPayment) {
    const userId = button.id.split('-')[2];
    const loading = document.getElementById(`loading-${userId}`); //Button which shows request status
    loading.style.display = 'block';
    loading.style.color = 'gray';
    loading.innerHTML = 'Waiting...';
    
    const balanceInput = document.getElementById(`balance-${userId}`);
    const balanceDisplay = document.getElementById(`balance-tag-${userId}`);
    const url = '/admin/balances?_method=put';
    const data = {userId, bal: -1*parseFloat(balanceInput.value)};
    sendPostReq(url, data, data => {
        if (data.success) { //If successful, display success info
            loading.style.color = 'green';
            loading.innerHTML = data.success;
            if (dollarPayment) {
                balanceInput.value = "0.00";
                balanceDisplay.innerText = parseFloat(data.balance).toFixed(2);
            } else {
                balanceInput.value = "0";
                balanceDisplay.innerText = data.balance;
            }
        } else if (data.error) { //If unsuccessful, display error message
            loading.style.color = 'red'; 
            loading.innerHTML = data.error;
        }
        setTimeout(() => {loading.style.display = "none";}, 5000); //After a second, hide the message
    });
    event.preventDefault();
}