let tagList = []
if (document.getElementById("tag-input")) {
    tagList = document.getElementById("tag-input").value.split(',');
} else {
    tagList = [];
}

const confirm = function(button) { //Send request that order is ready
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

const ready = function(button) { //Send request that order is ready
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

const reject = function(button) { //Send request that order is rejected
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

const cancel = function(button) { //Send request to cancel order
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

const changeShopStatus = function() { //Send request to close/open shop
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

const switchOrders = function(button) { //Switch order panel from active orders to past orders
    if (button.id == "past-order-button") {
        document.getElementById("output-stream-old").hidden = false;
        document.getElementById("output-stream").hidden = true;
        document.getElementById("button-text").innerText = " View Active Orders";
        document.getElementById("order-type").innerText = " Past Orders";
        document.getElementById("order-subheading").innerText = "All Past Orders";
        button.id = "active-order-button";

    } else {
        document.getElementById("output-stream-old").hidden = true;
        document.getElementById("output-stream").hidden = false;
        document.getElementById("button-text").innerText = " View Past Orders";
        document.getElementById("order-type").innerText = " Active Orders";
        document.getElementById("order-subheading").innerText = "All Active Orders";
        button.id = "past-order-button";
    }
}

const filterDate = function() {
    const startInput = document.getElementById('startDateInput');
    const endInput = document.getElementById('endDateInput');

    if(!startInput.value && !endInput.value) {
        const errMsg = document.getElementById('date-filter-err-msg');
        return errMsg.style.display = 'block';
    }

    const urlParams = new URLSearchParams(window.location.search);
    
    urlParams.set('past', 'true');

    if(startInput.value) { urlParams.set('start_date', startInput.value)};
    if(endInput.value) { urlParams.set('end_date', endInput.value)};


    window.location.search = urlParams;
}

const addTag = function(e) { //Add tag to list of cafe item tags
    e.preventDefault();
    const input = document.getElementById("new-tag-input");
    tagList.push(input.value);
    document.getElementById("tag-input").value = tagList.toString();

    let newTag = document.createElement('div');
    newTag.classList.add('user-tag');
    newTag.id = input.value;
    newTag.innerHTML = `<span name="tags" value="${input.value}">${input.value}</span><button type="button" id="${input.value}" onclick="remTag(this)">&times;</button>`;
    document.getElementById("cafe-info-div").appendChild(newTag);

    //Empty input
    input.value = "";
}

const remTag = function(btn) { //Remove tag from list of cafe item tags
    const id = btn.id;
    const itemTags = document.getElementsByClassName('user-tag');
    for (let tag of itemTags) { //Iterate through tags until the one with the remove ID is found
        if (tag.id == id) {
            document.getElementById("cafe-info-div").removeChild(tag);
            tagList.splice(tagList.indexOf(id), 1);
            document.getElementById("tag-input").value = tagList.toString();
        }
    }
}
