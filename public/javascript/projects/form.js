const imgContainer = document.getElementById('image-block');

let i = document.getElementsByClassName('input-container').length;

const addImg = (() => { //Adds the image input field
    const img = document.createElement('div');
    img.classList.add('image-group');
    img.id = `block-${i}`
    img.style="text-align: left;";
    img.innerHTML = `<div class="input-container" >
    <input id="${i}" type="text" class="form-control project-image" oninput="createImg(this)" placeholder="Url..." name="images[${i}]" required >
  </div>
  <button type="button" onclick="deleteImg(this)" class="btn btn-danger" style="float: right;"><i class="fas fa-minus"></i></button>`;
    imgContainer.prepend(img);
    i++;
});

const createImg = (val => { //Creates an image based on value of image input

  if ($(`#block-${val.id}`).find('img').length == 0) {
    const imageDisplay = document.createElement('img');
    imageDisplay.id = `image-${val.id}`;

    if (val.value.split(' ').join('') != '') {
      imageDisplay.src = val.value;
      imageDisplay.alt = "Image Does Not Exist";
      imageDisplay.style = "width: 50%; height: 50%; margin-top: 10px; border-radius: 15px; float: left; margin-bottom: 20px;";
      document.getElementById(`block-${val.id}`).append(imageDisplay);
      $(`#${$(`#block-${val.id}`).find('img')[0].id}`).show();
    }

  } else {
    if (val.value.split(' ').join('') != '') {
      $(`#block-${val.id}`).find('img')[0].src = val.value;
      $(`#${$(`#block-${val.id}`).find('img')[0].id}`).show();

    } else {
      $(`#${$(`#block-${val.id}`).find('img')[0].id}`).hide();
    }
  }
});

const deleteImg = (btn => {
    const parent = btn.parentNode;
    parent.remove();
});
