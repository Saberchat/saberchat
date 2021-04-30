const confirm = function (button) { //Send request that order is ready
    const orderId = button.id.split('-')[0];
    const url = `/shop/order/confirm/${orderId}?_method=put`;
    const data = {};

    sendPostReq(url, data, data => {
        if (data.success) {
            $(`#modal-${orderId}-confirm`).modal('hide');
            document.getElementById(`ready-form-${orderId}`).removeChild(document.getElementById(`confirm-${orderId}`));
        }
    });
}

const ready = function (button) { //Send request that order is ready
    const orderId = button.id.split('-')[0];
    const url = `/shop/order/${orderId}?_method=put`;
    const data = {};

    sendPostReq(url, data, data => {
        if (data.success) {
            $(`#modal-${orderId}-ready`).modal('hide');
            document.getElementById("output-stream").removeChild(document.getElementById(`${orderId}`));

            const orders = document.getElementsByClassName("order-card");
            if (orders.length == 0) { //If there are no more orders, build the h2 element that displays that
                let noOrders = document.createElement("h2");
                noOrders.innerText = "No New Orders";
                document.getElementById("output-stream").appendChild(noOrders);
            }
        }
    });
}

const reject = function (button) { //Send request that order is rejected
    const orderId = button.id.split('-')[0];
    const rejectionReason = document.getElementById(`rejection-reason-${orderId}`).value;
    const url = `/shop/order/${orderId}?_method=delete`;
    const data = {rejectionReason};

    sendPostReq(url, data, data => {
        if (data.success) {
            $(`#modal-${orderId}-reject`).modal('hide');
            document.getElementById("output-stream").removeChild(document.getElementById(`${orderId}`));

            const orders = document.getElementsByClassName("order-card");
            if (orders.length == 0) { //If there are no more orders, build the h2 element that displays that
                let noOrders = document.createElement("h2");
                noOrders.innerText = "No New Orders";
                document.getElementById("output-stream").appendChild(noOrders);
            }
        }
    });
}

const cancel = function (button) { //Send request to cancel order
    const orderId = button.id.split('-')[0];
    const url = `/shop/order/${orderId}?_method=delete`;
    const data = {};

    sendPostReq(url, data, data => {

        if (data.success) { //If successful request, remove order from list of active orders
            $(`#modal-${orderId}-cancel`).modal('hide');
            document.getElementById("active-orders").removeChild(document.getElementById(`${orderId}`));
        }
    });
}

const changeShopStatus = function () { //Send request to close/open shop
    const url = `/shop/manage?_method=put`;
    const data = {};

    sendPostReq(url, data, data => {

        if (data.success) {
            //List of corresponding element changes based on shop status
            const change = new Map([[true, ["btn btn-danger", "lock-open", "Close"]], [false, ["btn btn-success", "lock", "Open"]]]);
            document.getElementById("shop-status-button").className = change.get(data.open)[0];
            document.getElementById("shop-status-button").innerHTML = `<i class="fas fa-${change.get(data.open)[1]}"></i> ${change.get(data.open)[2]}`;
        }
    });
}
