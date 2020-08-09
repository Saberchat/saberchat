//create function that sets up the socket chat
function chatInit(username, userId, messageForm, input, chatDisplay) {
  var socket = io();

  $(messageForm).submit(function(e) {
      e.preventDefault(); // prevents page reloading
      
      //emits message object containing text, usrname, and user Id
      socket.emit('chat message', {'text': $('#m').val(), 'author': username, 'authorId': userId});
      $(input).val('');
      return false;
  });

  socket.on('chat message', function(msg) {
      // appends the message to the ul element displaying the messages
      $(chatDisplay).append(
          "<li>\
          <i class='fas fa-user-circle avatar'></i>\
              <p>" + msg['author'] + ": " + msg['text'] +  "</p>\
          </li>"
      );
  });
  socket.on('')
}