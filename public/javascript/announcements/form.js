const imgContainer = document.getElementById('image-block');

let i = 0;

function addImg() { //Adds the image input field
    const img = document.createElement('div');
    img.classList.add('image-group');
    img.id = `block-${i}`
    img.innerHTML = `<div class="input-container">
    <input type="text" class="form-control" onkeyup="createImg(this)" placeholder="Url..." name="images[${i}]" required>
  </div>
  <button type="button" onclick="deleteImg(this)" class="btn btn-danger"><i class="fas fa-minus"></i></button>`;
    imgContainer.appendChild(img);
    i++;
}

function createImg(val) { //Creates an image based on value of image input

  if ($(`#block-${i-1}`).find('img').length == 0) {
    const imageDisplay = document.createElement('img')
    imageDisplay.src = val.value
    imageDisplay.style = "width: 50%; height: 50%; margin-top: 10px; border-radius: 15px;"
    document.getElementById(`block-${i-1}`).appendChild(imageDisplay)

  } else {
    setTimeout(() => {
      $(`#block-${i-1}`).find('img')[0].src = val.value
    }, 3)
  }
}

function deleteImg(btn) {
    const parent = btn.parentNode;
    parent.remove();
}
