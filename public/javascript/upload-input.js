let fileCount = 0; //Track how many file inputs have been opened
let filesCounted = false; //Check whether previously uploaded files are accounted for (for editing pages)

const upload = function(files) { //Add a new upload input
    if (!filesCounted && files) { //If a number of files is already there (on update page)
        fileCount += files;
        filesCounted = true;
    }

    if (fileCount < 7) { //Not more than 7 files can be added
        fileCount ++;
        let newInputBlock = document.createElement("div");
        newInputBlock.className = "form-group";
        newInputBlock.id = `mediaFile-${fileCount}`;
        newInputBlock.innerHTML = `
        <div class="image-upload form-control-file">
            <input type="file" name="mediaFile" multiple accept="image/*, video/*, audio/*, application/pdf">
            <button type="button" onclick="removeFile(this)" id="removeFile-${fileCount}" class="btn btn-danger removeFile"><i class="fas fa-minus"></i></button>
        </div>
        `;
        document.getElementById("uploads").appendChild(newInputBlock);
    }
}

const removeFile = function(button) { //Delete a file input
    if (fileCount > 0) {
        fileCount --;
        const removeable = document.getElementById(`mediaFile-${button.id.split('-')[1]}`);
        document.getElementById("uploads").removeChild(removeable);
    }
}