const ready = (button => {
    const orderId = button.id.split('-')[0];
    const url = `/cafe/${orderId}/ready`;
    const data = {};

    $.post(url, data, function (data) {

        if (data.success) {
            $(`#modal-${orderId}-ready`).modal('hide');
            document.getElementById("output-stream").removeChild(document.getElementById(`${orderId}`));

            const orders = document.getElementsByClassName("order-card");
            if (orders.length == 0) {
                let noOrders = document.createElement("h2");
                noOrders.innerText = "No New Orders";
                document.getElementById("output-stream").appendChild(noOrders);
            }
        }
    });
});

const reject = (button => {
    const orderId = button.id.split('-')[0];
    const rejectionReason = document.getElementById(`rejection-reason-${orderId}`).value;
    const url = `/cafe/${orderId}/reject`;
    const data = {rejectionReason};

    $.post(url, data, function (data) {

        if (data.success) {
            $(`#modal-${orderId}-reject`).modal('hide');
            document.getElementById("output-stream").removeChild(document.getElementById(`${orderId}`));

            const orders = document.getElementsByClassName("order-card");
            if (orders.length == 0) {
                let noOrders = document.createElement("h2");
                noOrders.innerText = "No New Orders";
                document.getElementById("output-stream").appendChild(noOrders);
            }
        }
    });
});

const cancel = (button => {
    const orderId = button.id.split('-')[0];
    const url = `/cafe/order/${orderId}?_method=delete`;
    const data = {};

    $.post(url, data, function (data) {

        if (data.success) {
            $(`#modal-${orderId}-cancel`).modal('hide');
            document.getElementById("active-orders").removeChild(document.getElementById(`${orderId}`));
        }
    });
});

const changeCafeStatus = (() => {
    const url = `/cafe/change-cafe-status?_method=put`;
    const data = {};

    $.post(url, data, function (data) {

        if (data.success) {
            const change = new Map([[true, ["btn btn-danger", "lock-open", "Close Cafe"]], [false, ["btn btn-success", "lock", "Open Cafe"]]]);
            document.getElementById("cafe-status-button").className = change.get(data.open)[0];
            document.getElementById("cafe-status-button").innerHTML = `<i class="fas fa-${change.get(data.open)[1]}"></i> ${change.get(data.open)[2]}`;
        }
    });
});
