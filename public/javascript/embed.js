for (let item of document.getElementsByClassName("convertible-text")) { //Iterate through all elements listed as links
    item.innerHTML = item.innerText; //Each item's text is an href. Turn that into its HTML element
}
