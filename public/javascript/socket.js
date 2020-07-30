$(function() {
    var socket = io();
    var nick = null;
    $('#message-form').submit(function(e) {
      e.preventDefault(); // prevents page reloading
      if ($('#m').val().substring(0, 5) == '/nick') {
        nick = $('#m').val().substring(6);
        $('#m').val('');
      } else if (nick != null) {
        socket.emit('chat message', nick + ": " + $('#m').val());
        $('#m').val('');
      } else {
        socket.emit('chat message', $('#m').val());
        $('#m').val('');
      }
      return false;
    });
    socket.on('chat message', function(msg) {
      // $('#messages').append($('<li>').text(msg));
      $('#messages').append(
        "<li>\
          <i class='fas fa-user-circle avatar'></i>\
            <p>" + msg + "</p>\
        </li>"
      );
    });
    socket.on('')
});