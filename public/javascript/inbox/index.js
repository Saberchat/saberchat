const messageActions = document.getElementsByClassName('message-actions')[0];
const requestActions = document.getElementsByClassName('request-actions')[0];
const messageList = document.getElementsByClassName('message-list')[0];
const requestList = document.getElementsByClassName('request-list')[0];

// tracks inbox state
let display = 'message';

function setMessages() {
    if(display == 'request') {
        messageActions.classList.add('display');
        messageList.classList.add('display');

        requestActions.classList.remove('display');
        requestList.classList.remove('display');

        display = 'message';
    }
}

function setRequests() {
    if(display == 'message') {
        requestActions.classList.add('display');
        requestList.classList.add('display');

        messageActions.classList.remove('display');
        messageList.classList.remove('display');

        display = 'request';
    }
}