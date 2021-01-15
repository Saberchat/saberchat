const ready = (button => {
  const orderId = button.id.split('-')[0];
  const url = `/cafe/${orderId}/ready`;
  const data = {};

  $.post(url, data, function(data) {

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

  $.post(url, data, function(data) {

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

  $.post(url, data, function(data) {

    if (data.success) {
      $(`#modal-${orderId}-cancel`).modal('hide');
      document.getElementById("active-orders").removeChild(document.getElementById(`${orderId}`));
    } else {
      console.log(data)
    }
  });
});
