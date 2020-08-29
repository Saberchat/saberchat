function order(form, customer) {
  var socket = io();

  $(form).submit(function (e) {
    e.preventDefault();

    var itemList = [];
    $('#item-list > .form-check > input').each(function(index) {

      if ($(this).is(':checked')) {
        let currentItemName = $(this).attr('id');
        itemList.push(currentItemName);
      }
      // this = current accessed element
      // index = int index of current element relative to parent list
    });
    socket.emit('order', itemList, customer);

  });
}
