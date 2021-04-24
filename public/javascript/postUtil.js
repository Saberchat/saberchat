function sendPostReq(url, data, callback) {
    fetch(url, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(data)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('HTTP-Error: ' + response.status);
        }
        return response.json();
    })
    .then(data => {
        return callback(data);
    })
    .catch(error => {
        console.log('Error:\n' + String(error));
    });
}

