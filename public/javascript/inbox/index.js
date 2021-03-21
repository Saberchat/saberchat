const messageActions = document.getElementsByClassName('message-actions')[0];
const requestActions = document.getElementsByClassName('request-actions')[0];

const messageList = document.getElementsByClassName('message-list')[0];
const requestList = document.getElementsByClassName('request-list')[0];

const currentReq = document.getElementById('current-req-list');
const pastReq = document.getElementById('past-req-list');

// buttons to toggle messages and requests
const viewMsg = document.getElementById('view-msg');
const viewReq = document.getElementById('view-req');

// buttons to see current/past requests
const currentReqBtn = document.getElementById('current-req');
const pastReqBtn = document.getElementById('past-req');

// buttons to delete messages
const delAllBtn = document.getElementById('del-all-btn');
const delSelBtn = document.getElementById('del-sel-btn');

//buttons to mark messages
const markAllBtn = document.getElementById('mark-all-btn');
const markSelBtn = document.getElementById('mark-sel-btn');

const delSelForm = document.getElementById('del-select-form');

// tracks inbox and request states
let inboxDisplay = 'message';
let reqDisplay = 'current';

const setMessages = function () { // changes view to messages
    if (inboxDisplay == 'request') {
        messageActions.classList.add('display');
        messageList.classList.add('display');
        viewMsg.classList.add('active');
        viewMsg.disabled = true;

        requestActions.classList.remove('display');
        requestList.classList.remove('display');
        viewReq.classList.remove('active');
        viewReq.disabled = false;

        inboxDisplay = 'message';
    }
}

const setRequests = function () { //changes view to requests
    if (inboxDisplay == 'message') {
        requestActions.classList.add('display');
        requestList.classList.add('display');
        viewReq.classList.add('active');
        viewReq.disabled = true;

        messageActions.classList.remove('display');
        messageList.classList.remove('display');
        viewMsg.classList.remove('active');
        viewMsg.disabled = false;

        inboxDisplay = 'request';
    }
}

const submitDelete = function () { // sends form info for deleting selected messages
    delSelForm.submit();
}

const updateDelete = function () { // switches between delete all to delete selected
    const inputs = document.getElementsByClassName('del-form-input');
    let selected = false;
    for (let i = 0; i < inputs.length; i++) {
        const input = inputs[i];
        if (input.checked == true) {
            selected = true;
            break;
        }
    }

    if (selected) {
        delAllBtn.style.display = 'none';
        delSelBtn.style.display = 'block';
        markAllBtn.style.display = 'none';
        markSelBtn.style.display = 'block';
    } else {
        delSelBtn.style.display = 'none';
        delAllBtn.style.display = 'block';
        markSelBtn.style.display = 'none';
        markAllBtn.style.display = 'block';
    }
}
