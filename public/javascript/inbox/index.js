const messageActions = document.getElementsByClassName('message-actions')[0];
const requestActions = document.getElementsByClassName('request-actions')[0];

const messageList = document.getElementsByClassName('message-list')[0];
const requestList = document.getElementsByClassName('request-list')[0];

const viewMsg = document.getElementById('view-msg');
const viewReq = document.getElementById('view-req');

const delSelForm = document.getElementById('del-select-form');

// tracks inbox state
let display = 'message';

// changes view to messages
function setMessages() {
    if(display == 'request') {
        messageActions.classList.add('display');
        messageList.classList.add('display');
        viewMsg.classList.add('active');
        viewMsg.disabled = true;

        requestActions.classList.remove('display');
        requestList.classList.remove('display');
        viewReq.classList.remove('active');
        viewReq.disabled = false;

        display = 'message';
    }
}

//changes view to requests
function setRequests() {
    if(display == 'message') {
        requestActions.classList.add('display');
        requestList.classList.add('display');
        viewReq.classList.add('active');
        viewReq.disabled = true;

        messageActions.classList.remove('display');
        messageList.classList.remove('display');
        viewMsg.classList.remove('active');
        viewMsg.disabled = false;

        display = 'request';
    }
}

// sends form info for deleting selected messages
function submitDelete() {
    delSelForm.submit();
}