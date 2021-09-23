const order = function(form, customer, dollarPayment) {
    let socket = io();
    let items = document.getElementById('item-list');

    $(form).submit(function(e) {

        let payingInPerson;
        if (dollarPayment == "true") {payingInPerson = document.getElementById('payingInPerson').checked;   
        } else {payingInPerson = false;}

        let instructions = $('#descInput').val();
        let address = $('#addressInput').val();
        let balance;
        let charge;

        //If cashier is ordering, access name from menu as opposed to account info
        if (customer == "customer") {customer = document.getElementById("current-name").className};

        //If paying is online, collect DOM elements of balance and charge to evaluate
        if (dollarPayment == "true" && !payingInPerson) {
            balance = parseFloat(document.getElementById('balance-box').innerText.split("$")[1]);
            charge = parseFloat(document.getElementById('total-cost').innerText.split("$")[1]);
        } else if (!dollarPayment == "false") {
            balance = parseFloat(document.getElementById('balance-box').innerText.split(": ")[1].split(' ')[0]);
            charge = parseFloat(document.getElementById('total-cost').innerText.split(": ")[1].split(' ')[0]);
        }

        let itemList = [];
        let itemCount = [];

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

        if (itemList.length > 0) { //If some items have been ordered, send socket request
            socket.emit('order', itemList, itemCount, instructions, address, payingInPerson, customer);
        }
    });
}

const getOrders = function(outputStream, dollarPayment) { //Build order card once order has been successfully sent in shop
    let socket = io();

    socket.on('connect', () => {console.log("connection from shop use");});
    socket.on('order', (order, foundItems) => {
        const getInstructions = function() {
            if (!order.instructions || order.instructions == "") {
                return `<p class="card-text">No extra instructions</p>`;
            } else {
                return `<p class="card-text"><strong>Extra Instructions:</strong> ${order.instructions}</p>`;
            }
        }

        const getAddress = function() {
            if (!order.address || order.address == "") {
                return `<p class="card-text">No address provided</p>`;
            } else {
                return `<p class="card-text"><strong>Deliver To:</strong> ${order.address}</p>`;
            }
        }

        const getItems = function() {
            let str = ``;
            for (let i = 0; i < order.items.length; i++) {
                str += `<li class="list-group-item">${foundItems[i].name}: ${order.quantities[i]} order(s)</li>\n`;
            }

            return str;
        }

        if (dollarPayment == "true") {
            $(outputStream).prepend(
                `<div class="card mt-3">
                <div class="card-body">
                    <h5 class="card-title">Order for ${order.name}</h5>
                    ${getInstructions()}
                    ${getAddress()}
                    <ul class="list-group">
                        ${getItems()}
                    </ul>
                    <p class="card-text mt-3"><strong>Cost:</strong>$${order.charge.toFixed(2)}</p>
                    <p class="card-text">${order.date}</p>
                    <form class="ready-form" action="${order._id}/ready" method="post">
                        <button type="submit" class="btn btn-primary" name="button">Order Ready</button>
                    </form>
                </div>
                </div>`
            );
        } else {
            $(outputStream).prepend(
                `<div class="card mt-3">
                <div class="card-body">
                    <h5 class="card-title">Order for ${order.name}</h5>
                    ${getInstructions()}
                    <ul class="list-group">
                        ${getItems()}
                    </ul>
                    <p class="card-text mt-3"><strong>Cost:</strong>${order.charge} Credits</p>
                    <p class="card-text">${order.date}</p>
                    <form class="ready-form" action="${order._id}/ready" method="post">
                        <button type="submit" class="btn btn-primary" name="button">Order Ready</button>
                    </form>
                </div>
                </div>`
            );
        }
    });
}
