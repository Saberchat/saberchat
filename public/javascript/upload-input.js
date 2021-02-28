let fileCount = 0;

const upload = function() {
    if (fileCount < 7) {
        fileCount ++;
        let newInputBlock = document.createElement("div");
        newInputBlock.className = "form-group";
        newInputBlock.id = `imageFile-${fileCount}`;
        newInputBlock.innerHTML = `
        <div class="image-upload form-control-file">
            <input type="file" name="imageFile" multiple accept="image/*, video/*, audio/*, application/pdf">
            <button type="button" onclick="removeFile(this)" id="removeFile-${fileCount}" class="btn btn-danger removeFile"><i class="fas fa-minus"></i></button>
        </div>
        `;
        document.getElementById("uploads").appendChild(newInputBlock);
    }
}

const removeFile = function(button) {
    if (fileCount > 0) {
        fileCount --;
        const removeable = document.getElementById(`imageFile-${button.id.split('-')[1]}`);
        document.getElementById("uploads").removeChild(removeable);
    }
}