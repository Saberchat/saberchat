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
    const id = userSelect.value;
    const username = userSelect.options[userSelect.selectedIndex].text;
    recipients.push({id: id, username: username});

    refreshDisplay();
}

// remove recipients
function remReicipient(id) {
    const user = recipients.find(user => user.id === id);
    const i = recipients.indexOf(user);
    recipients.splice(i, 1);

    refreshDisplay();
}

// refreshes user-list display
function refreshDisplay() {
    userDisplay.innerHTML = '';
    for (let i = 0; i < recipients.length; i++) {
        const id = recipients[i];

        const tag = document.createElement('div');
        tag.classList.add('user-tag');
        tag.innerHTML = `<span>${username}</span>
        <button type="button" onclick="remRecipient(${id})">&times;</button>`;

        userDisplay.appendChild(tag);
    }
}