const delUploadCheck = document.getElementById('delete-upload-check');
const reUploadBlock = document.getElementById('replace-upload-block');

if(delUploadCheck && reUploadBlock) {
    reUploadBlock.style.display = "none";
    function updateUpload() {
        if(delUploadCheck.checked) {
            reUploadBlock.style.display = "block";
        } else {
            reUploadBlock.style.display = "none";
        }
    }

    delUploadCheck.addEventListener('change', updateUpload);
}