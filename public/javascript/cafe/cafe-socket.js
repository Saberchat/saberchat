function order(form, customer) {
  var socket = io();

  $(form).submit(function (e) {
    // e.preventDefault();

    var instructions = $('#descInput').val();
    var itemList = [];
    $('#item-list > .form-check > input').each(function(index) {

      if ($(this).is(':checked')) {
        let currentItemName = $(this).attr('id');
        itemList.push(currentItemName);
      }
      // this = current accessed element
      // index = int index of current element relative to parent list
    });
    socket.emit('order', itemList, instructions, customer);
    console.log("_" + instructions + "_");
  });
}

function getOrders(outputStream) {
  var socket = io();

  socket.on('order', (id) => {
    $(outputStream).append(`
      <div class="card" style="width: 18rem;">
        <div class="card-body">
          <h5 class="card-title">${order.customer}</h5>
          <p class="card-text">Some quick example text to build on the card title and make up the bulk of the card's content.</p>
          <ul class="list-group list-group-flush">
            <li>placeholder</li>
          </ul>
          <small class="card-text">${order.price}</small>
          <a href="#" class="btn btn-primary">Go somewhere</a>
        </div>
      </div>
    `);
  })
}
