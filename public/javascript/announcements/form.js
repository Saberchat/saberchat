const imgContainer = document.getElementById('image-block');

let i = 0;

function addImg() {
    const img = document.createElement('div');
    img.classList.add('image-group');
    img.innerHTML = `<div class="input-container">
    <input type="text" class="form-control" placeholder="Url..." name="images[${i}]" required>
  </div>
  <button type="button" onclick="deleteImg(this)" class="btn btn-danger"><i class="fas fa-minus"></i></button>`;
    imgContainer.appendChild(img);
    i++;
}

function deleteImg(btn) {
    const parent = btn.parentNode;
    parent.remove();
}