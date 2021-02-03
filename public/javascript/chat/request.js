const request = function (button) {
    const roomId = button.id.split('-')[1];
    const url = `/chat/${roomId}/request-access`;
    const data = {};

    $.post(url, data, data => {
        if (data.success) {
            button.className = "btn btn-danger btn-sm float-right";
            button.innerHTML = "<i class='fas fa-window-close'></i> Cancel Request";
            button.setAttribute("onclick", "cancelRequest(this)");
        }
    });
}

const cancelRequest = function (button) {
    const roomId = button.id.split('-')[1];
    const url = `/chat/${roomId}/cancel-request?_method=delete`;
    const data = {};

    $.post(url, data, data => {
        if (data.success) {
            button.className = "btn btn-success btn-sm float-right";
            button.innerHTML = "<i class='fas fa-hand-paper'></i> Request Access";
            button.setAttribute("onclick", "request(this)");
        }
    });
}
