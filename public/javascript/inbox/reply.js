const reply = (() => {
  document.getElementById('reply-box').hidden = false;
});

const cancelReply = (() => {
  document.getElementById('reply-box').hidden = true;
});

const sendReply = ((msg, event) => {
  const msgId = msg.id.split('-')[2];
  const url = `/inbox/reply?_method=put`;

  let images = [];
  for (let image of document.getElementsByClassName('input-container')) {
    images.push(image.getElementsByTagName('input')[0].value);
  };

  const data = {message: msgId, text: document.getElementById('message').value, images: images.reverse()};
  $.post(url, data, function(data) {
    if(data.success) {
      window.location.reload();

    } else if (data.error) {}
  })

  event.preventDefault()

})
