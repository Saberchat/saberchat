// Iterate through all elements listed as links
for (let item of document.getElementsByClassName("convertible-text")) {
    // Each item's text is an href. Turn that into its HTML element
    item.innerHTML = item.innerText; 
}
