function chatInit(username, userId, messageForm, input, chatDisplay) {
  var socket = io();

  $(messageForm).submit(function(e) {
      e.preventDefault(); // prevents page reloading
      
      socket.emit('chat message', {'text': $('#m').val(), 'author': username, 'authorId': userId});
      $(input).val('');
      return false;
  });

  socket.on('chat message', function(msg) {
      // $('#messages').append($('<li>').text(msg));
      $(chatDisplay).append(
          "<li>\
          <i class='fas fa-user-circle avatar'></i>\
              <p>" + msg['author'] + ": " + msg['text'] +  "</p>\
          </li>"
      );
  });
  socket.on('')
}