const form = document.getElementById('message-form');

const userSelect = document.getElementById('user-select');

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
    } else {
        userSelect.required = true;
        userSelect.style.display = '';
    }
}