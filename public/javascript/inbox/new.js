const form = document.getElementById('message-form');

const userSelect = document.getElementById('user-select');
const facultySelect = document.getElementById('faculty-select');
const userDisplay = document.getElementById('user-display');

const defaultMsg = document.getElementById('default-msg');
const anonyMsg = document.getElementById('anony-msg');

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

// toggles anonymous messgaing
function setAnonymous(check) {
    if(check.checked) {
        userSelect.required = false;
        defaultMsg.style.display = 'none';

        facultySelect.required = true;
        anonyMsg.style.display = 'static';

        recipients = [];
        const tags = document.getElementsByClassName('user-tag');
        console.log(tags);
        if(tags && tags.length > 0) {
            for (let i = 0; i < tags.length; i++) {
                const tag = tags[i];
                tag.remove();
            }
        }
        facultySelect.value = '';
    } else {
        userSelect.required = true;
        defaultMsg.style.display = 'static';

        facultySelect.required = false;
        anonyMsg.style.display = 'none';

        recipients = [];
        const tags = document.getElementsByClassName('user-tag');
        tags.forEach(tag => {tag.remove()});
        userSelect.value = '';
    }
}

// adds recipients to list
function addRecipient() {
    const id = userSelect.value;
    if(!recipients.includes(id)) {
        const username = userSelect.options[userSelect.selectedIndex].text;
        recipients.push(id);

        const tag = document.createElement('div');
        tag.classList.add('user-tag');
        tag.innerHTML = `<span>${username}</span>
        <button type="button" id="${id}" onclick="remRecipient(this)">&times;</button>`;

        userDisplay.appendChild(tag);
        
        console.log(recipients)
    }
    userSelect.value = '';
}

// remove recipients
function remRecipient(btn) {
    const id = btn.id;
    const i = recipients.indexOf(id);
    if(i) {
        recipients.splice(i, 1);
    }
    const parent = btn.parentNode;
    parent.remove();
    console.log(recipients)
}