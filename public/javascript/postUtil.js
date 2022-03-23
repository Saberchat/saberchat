const sendPostReq = function(url, data, callback) { // Send UI interaction to server 
    fetch(url, { // Call fetch function with JSON data
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(data)
    })
    .then(response => { // Callback contains server response
        if (!response.ok) {throw new Error(`HTTP-Error: ${response.status}`);} // Error
        return response.json(); // If no error, return respons as JSON object
    })
    .then(data => {return callback(data);}) // pass data to callback func
    .catch(error => {console.log(`Error:\n${String(error)}`);});
}