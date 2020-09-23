const form = document.getElementById('message-form');

const userSelect = document.getElementById('user-select');
const userDisplay = document.getElementById('user-display');

let recipients = [];

// processes all the selected recipients into form info
function process() {
    const input = document.createElement('input');
    input.type = 'text';
    input.name = 'recipients';
    input.value = 'joe';
    input.style.display = 'none';
    form.appendChild(input);
}

// toggles recipients selection
function updateTo(check) {
    if(check.checked) {
        userSelect.required = false;
        userSelect.style.display = 'none';
        userDisplay.style.display = 'none';
    } else {
        userSelect.required = true;
        userSelect.style.display = '';
        userDisplay.style.display = '';
    }
}

// adds recipients to list
function addRecipient() {
    const info = userSelect.value;
    console.log(JSON.parse(users));
    recipients.push(userSelect.value);
    const tag = document.createElement('div');

    console.log(recipients);
}

// refreshes the user list display
function refreshUserList() {

}