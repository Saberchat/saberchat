function scrollToElement(innerElement, containerId) {
  var topPos = innerElement.offsetTop;
  document.getElementById(containerId).scrollTop = topPos-10;
  
}

//create function that sets up the socket chat
function chatInit(username, userId, messageForm, input, chatDisplay, room, userImage) {

  var socket = io();

  $(messageForm).submit(function(e) {
    e.preventDefault(); // prevents page reloading
    let text = $('#m').val()
    //emits message object containing text, usrname, and user Id
    if(text != "") {
      socket.emit('chat message', {'text': text, 'authorId': userId, 'userImage': userImage, 'username': username});
      $(input).val('');
      $(chatDisplay).append(
        `<div class="media w-50 ml-auto mb-2">
        <div class="media-body">
          <div class="bg-primary rounded py-2 px-3 mb-2">
            <p class="text-small mb-0 text-white">${text}</p>
          </div>
          <p class="small text-muted">${$.format.date(Date.now(), "h:mm a | MMM d")}</p>
        </div>
      </div>`
      );
    }
    let messages = document.getElementsByClassName('media');
    let message = messages[messages.length - 1];
    if(message) {
      scrollToElement(message, 'message-display');
    }
    return false;
  });

  socket.on('connect', () => {
    socket.emit('switch room', room);
  });

  socket.on('chat message', function(msg) {
    // appends the message to the ul element displaying the messages
    $(chatDisplay).append(`<div class="media w-50 mb-2">
    <img src="${msg.userImage}" alt="user" class="user-image">\
    <div class="media-body ml-3">
      <div class="bg-grey rounded py-2 px-3 mb-2">
        <p class="text-small mb-0 text-dark">${msg.text}</p>
      </div>
      <p class="small text-muted"><span class="username">${msg.username}</span>, ${$.format.date(Date.now(), "h:mm a | MMM d")}</p>
    </div>
    </div>`);
    let messages = document.getElementsByClassName('media');
    let message = messages[messages.length - 1];
    if(message) {
      scrollToElement(message, 'message-display');
    }
    socket.on('');
  });
}
