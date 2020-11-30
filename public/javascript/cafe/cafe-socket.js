const order = ((form, customer) => {
  var socket = io();
  let items = document.getElementById('item-list');

  $(form).submit(function (e) {

    var instructions = $('#descInput').val();
    var payingInPerson = document.getElementById('payingInPerson').checked;
    var balance = parseFloat(document.getElementById('balance').innerText);
    var charge = parseFloat(document.getElementById('total-cost').innerText.split("$")[1]);
    var itemList = [];
    var itemCount = [];

    $('#item-list > .form-check > .style-div').each(function(index) {

      if ($(this).find('input').is(':checked')) {
        let currentItemName = $(this).find('input').attr('id');
        itemList.push(currentItemName);
        let currentItemCount = $(this).find('select').val();
        itemCount.push(currentItemCount);
      }
      // this = current accessed element
      // index = int index of current element relative to parent list
    });

    if (itemList.length > 0) {
      if (!payingInPerson && charge > balance) {} else {
        socket.emit('order', itemList, itemCount, instructions, payingInPerson, customer);
      }
    }
  });
})

const getOrders = (outputStream => {
  var socket = io();

  socket.on('connect', () => {
    console.log("connection from cafe use");
  });

  socket.on('order', (order, foundItems) => {
    console.log("new order");

    const getInstructions = (() => {
      if (!order.instructions || order.instructions == "") {
        return `<p class="card-text">No extra instructions</p>`;
      } else {
        return `<p class="card-text"><strong>Extra Instructions:</strong> ${order.instructions}</p>`;
      }
    })

    const getItems = (() => {
      var str = ``;

      for (let i = 0; i < order.items.length; i++) {
        str += `<li class="list-group-item">${foundItems[i].name}: ${order.quantities[i]} order(s)</li>\n`;
      }

      return str;
    })

    $(outputStream).prepend(`
      <div class="card mt-3">
        <div class="card-body">
          <h5 class="card-title">Order for ${order.name}</h5>
          ${getInstructions()}
          <ul class="list-group">
            ${getItems()}
          </ul>
          <p class="card-text mt-3"><strong>Cost:</strong> $${order.charge}</p>
          <p class="card-text">${order.date}</p>
          <form class="ready-form" action="${order._id}/ready" method="post">
            <button type="submit" class="btn btn-primary" name="button">Order Ready</button>
          </form>
        </div>
      </div>
    `);
  });
})
