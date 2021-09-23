const widthInput = document.getElementById('formWidth');
const heightInput = document.getElementById('formHeight');
const formUrlInput = document.getElementById('googleFormUrl');

const iframe = document.getElementById('formRenderer');

function renderForm() {
    if(formUrlInput.value.length < 10) {
        return;
    }
    let width = widthInput.value;
    let height = heightInput.value;

    if(!width) {
        width = 480;
    }
    if(!height) {
        height = 640;
    }

    let formUrl;
    try {
        formUrl = new URL(formUrlInput.value);
    } catch(error) {
        return alert('Invalid form link/url.');
    }
    
    formUrl.search = '?embedded=true';

    iframe.src = formUrl;
    iframe.width = width;
    iframe.height = height;
}

formUrlInput.addEventListener('change', renderForm);
widthInput.addEventListener('change', renderForm);
heightInput.addEventListener('change', renderForm);
