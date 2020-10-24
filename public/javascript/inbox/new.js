const form = document.getElementById('message-form');

const userSelect = document.getElementById('user-select');
const facultySelect = document.getElementById('faculty-select');
const userDisplay = document.getElementById('user-display');

const defaultMsg = document.getElementById('default-msg');
const anonyMsg = document.getElementById('anony-msg');

const everyoneCheck = document.getElementById('all-check');

const anonymousCheck = document.getElementById('anonymous-check');
const anonymousControl = document.getElementById('anonymous-control');

let recipients = [];

// processes all the selected recipients into form info
function process() {
    if(!recipients.length > 0 && !everyoneCheck.checked) {
        return false;
    } else if(!everyoneCheck.checked) {
        const input = document.createElement('input');
        input.type = 'text';
        input.name = 'recipients';
        input.value = JSON.stringify(recipients);
        input.style.display = 'none';
        form.appendChild(input);
    }
    return true;
}

// toggles recipients selection
function updateTo(everyoneCheck) {
    if(everyoneCheck.checked) {
        userSelect.required = false;
        facultySelect.required = false;
        defaultMsg.style.display = 'none';
        anonyMsg.style.display = 'none';
        userDisplay.style.display = 'none';
        anonymousControl.style.display = 'none';

        recipients = [];
        clearTags();
        facultySelect.value = '';
        userSelect.value = '';
    } else {
        setAnonymous(anonymousCheck);
        anonymousControl.style.display = 'block';
        userDisplay.style.display = 'block';
    }
}

// toggles anonymous messaging
function setAnonymous(check) {
    if(check.checked) {
        userSelect.required = false;
        defaultMsg.style.display = 'none';

        facultySelect.required = true;
        anonyMsg.style.display = 'block';

        recipients = [];
        clearTags();
        facultySelect.value = '';

    } else {
        userSelect.required = true;
        defaultMsg.style.display = 'block';

        facultySelect.required = false;
        anonyMsg.style.display = 'none';

        recipients = [];
        clearTags();
        userSelect.value = '';
    }
}

// clears user tags
function clearTags() {
    const tags = document.getElementsByClassName('user-tag');

    while (tags[0]) {
        tags[0].parentNode.removeChild(tags[0]);
    }
}

// adds recipients to list
function addRecipient(type) {
    if(type == 'user') {
        const id = userSelect.value;
        addTag(userSelect, id);
    } else if(type == 'faculty') {
        const id = facultySelect.value;
        addTag(facultySelect, id);
    }
}

// adds the user tag to the display
function addTag(select, id) {
    if(!recipients.includes(id)) {
        const username = select.options[select.selectedIndex].text;
        recipients.push(id);

        const tag = document.createElement('div');
        tag.classList.add('user-tag');
        tag.innerHTML = `<span>${username}</span>
        <button type="button" id="${id}" onclick="remRecipient(this)">&times;</button>`;

        userDisplay.appendChild(tag);
    }
}

// remove recipients
function remRecipient(btn) {
    const id = btn.id;
    const i = recipients.indexOf(id);
    if(i > -1) {
        recipients.splice(i, 1);
    }
    const parent = btn.parentNode;
    parent.parentNode.removeChild(parent);
}
