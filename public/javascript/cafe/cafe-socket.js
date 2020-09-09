function order(form, customer) {
  var socket = io();

  $(form).submit(function (e) {
    // e.preventDefault();

    var instructions = $('#descInput').val();
    var itemList = [];
    var itemCount = [];
    $('#item-list > .form-check').each(function(index) {

      if ($(this).find('input').is(':checked')) {
        let currentItemName = $(this).find('input').attr('id');
        itemList.push(currentItemName);
        let currentItemCount = $(this).find('select').val();
        itemCount.push(currentItemCount);
        console.log(itemList)
      }
      // this = current accessed element
      // index = int index of current element relative to parent list
    });
    socket.emit('order', itemList, itemCount, instructions, customer);
    console.log("_" + instructions + "_");
  });
}

function getOrders(outputStream) {
  var socket = io();

  socket.on('connect', () => {
    console.log("connection from cafe use");
  });

  socket.on('order', (order) => {
    console.log("new order");
    if (!order.instructions) {
      $(outputStream).prepend(`
        <div class="card mt-3">
          <div class="card-body">
            <h5 class="card-title">Order for ${order.name}</h5>
            <p class="card-text">No additional instructions</p>
            <ul class="list-group">
              <li class="list-group-item">${order.items}</li>
            </ul>
            <p class="card-text mt-3">${order.charge}</p>
            <p class="card-text">${order.date}</p>
            <form class="ready-form" action="<%= order._id %>/ready" method="post">
              <button type="submit" class="btn btn-primary" name="button">Order Ready</button>
            </form>
          </div>
        </div>
      `);
    } else {
      $(outputStream).prepend(`
        <div class="card mt-3">
          <div class="card-body">
            <h5 class="card-title">Order for ${order.name}</h5>
            <p class="card-text">${order.instructions}</p>
            <ul class="list-group">
              <li class="list-group-item">placeholder</li>
            </ul>
            <p class="card-text mt-3">${order.charge}</p>
            <p class="card-text">${order.date}</p>
            <a href="#" class="btn btn-primary">Go somewhere</a>
          </div>
        </div>
      `);
    }
  });
}
