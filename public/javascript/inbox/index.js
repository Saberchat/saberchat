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

const delSelForm = document.getElementById('del-select-form');

// tracks inbox state
let inboxDisplay = 'message';

// tracks req inbox state
let reqDisplay = 'current';

// changes view to messages
function setMessages() {
    if(inboxDisplay == 'request') {
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

//changes view to requests
function setRequests() {
    if(inboxDisplay == 'message') {
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

// sends form info for deleting selected messages
function submitDelete() {
    delSelForm.submit();
}
// changes req inbox to current
function seeCurrentReq() {
    if(reqDisplay == 'history') {
        currentReq.classList.add('display');
        pastReq.classList.remove('display');

        currentReqBtn.disabled = true;
        pastReqBtn.disabled = false;

        reqDisplay = 'current';
    }
}
// changes req inbox to history
function seePastReq() {
    if(reqDisplay == 'current') {
        pastReq.classList.add('display');
        currentReq.classList.remove('display');

        pastReqBtn.disabled = true;
        currentReqBtn.disabled = false;

        reqDisplay = 'history';
    }
}