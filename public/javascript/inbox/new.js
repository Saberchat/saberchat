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
    recipients.push(id);

    const tag = document.createElement('div');
    tag.classList.add('user-tag');
    tag.innerHTML = `<span>${username}</span>
    <button type="button" id="${id}" onclick="remRecipient(this)">&times;</button>`;

    userDisplay.appendChild(tag);
    userSelect.value = '';
    console.log(recipients)
}

// remove recipients
function remRecipient(btn) {
    const id = btn.id;
    const i = recipients.indexOf(id);
    recipients.splice(i, 1);

    const parent = btn.parentNode;
    parent.remove();
    console.log(recipients)
}