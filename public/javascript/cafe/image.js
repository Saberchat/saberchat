const createImage = function(imageInput) {
    if (imageInput.value.replaceAll(' ', '') != '') {
        document.getElementById("item-image").src = imageInput.value;
        document.getElementById("item-image").hidden = false;

    } else {
        document.getElementById("item-image").hidden = true;
    }
}
