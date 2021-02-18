// initial setting
const head = document.getElementById('article-head');
const body = document.getElementById('article-body');
const imageInput = document.getElementById('image-input');
body.style.display = 'none';
let textCount = 1;
let imageCount = 0;

// article variables
let articleTitle;
let articleAuthor;
// array to keep track of what's added
let articleContent = [];

// changes from head to editor
const next = (() => {
    const title = document.getElementById('title').value;
    const author = document.getElementById('author').value;
    head.style.display = 'none';
    body.style.display = '';
    document.getElementById('title-display').innerText = title;
    articleTitle = title;
    document.getElementById('author-display').innerText = author;
    articleAuthor = author;
});

// adds textarea
const addText = (() => {
    textCount += 1;
    $('#article-content').append(
        `<div class="text-block">
    <textarea class="text-input form-control" id="t-${textCount}" name="content[t-${textCount}]" rows="1" oninput="autoGrow(this)"></textarea>
    <button class="delete-btn btn btn-danger" onclick="remove(this)"><i class="far fa-trash-alt"></i></button>
  </div>`
    );
    document.getElementById('t-' + textCount).onkeydown = e => {
        if (e.keyCode == 9 || e.which == 9) {
            e.preventDefault();
            let s = this.selectionStart;
            this.value = this.value.substring(0, this.selectionStart) + "\t" + this.value.substring(this.selectionEnd);
            this.selectionEnd = s + 1;
        }
    }
});

// adds image
const addImage = (() => {
    $('#article-content').append(
        `<div class="img-block">
    <img src="${imageInput.value}" alt="article image" class="rounded article-img">
    <button class="delete-btn btn btn-danger" onclick="remove(this)"><i class="far fa-trash-alt"></i></button>
    </div>`
    );
    imageInput.value = "";
});

// enable tabs in textareas
const textareas = document.getElementsByTagName('textarea');
const count = textareas.length;

for (let i = 0; i < count; i++) {
    textareas[i].onkeydown = function (e) {
        if (e.keyCode == 9 || e.which == 9) {
            e.preventDefault();
            let s = this.selectionStart;
            this.value = this.value.substring(0, this.selectionStart) + "\t" + this.value.substring(this.selectionEnd);
            this.selectionEnd = s + 1;
        }
    }
}
// function to post data
const postIt = ((url, data) => {

    $('body').append($('<form/>', {
        id: 'jQueryPostItForm',
        method: 'post',
        action: url
    }));

    for (let i in data) {
        $('#jQueryPostItForm').append($('<input/>', {
            type: 'hidden',
            name: i,
            value: data[i]
        }));
    }
    $('#jQueryPostItForm').submit();
});

// removes text/image block
const remove = (element => {
    let parent = element.parentElement;
    parent.remove();
});

// auto grows textareas
const autoGrow = (element => {
    element.style.height = "5px";
    element.style.height = (element.scrollHeight) + "px";
});

// submit article
// $('#create-btn').on('click', (() => {
//   let preContent = $('#article-content').children();
//   for(let i=0;i < preContent.length; i++) {
//     if(preContent[i].tagName == 'TEXTAREA') {
//       articleContent.push({
//         type: 'text',
//         content: preContent[i].value
//       });
//     } else if(preContent[i].tagName == 'IMG') {
//       articleContent.push({
//         type: 'image',
//         content: preContent[i].src
//       });
//     }
//   }
//   const article = {
//     title: articleTitle,
//     author: articleAuthor,
//     content: JSON.stringify(articleContent)
//   }
//
//   postIt('/witherlyheights/articles/new', article);
// });

$('#create-btn').on('click', (() => {
    let preContent = $('#article-content').children();
    for (let i = 0; i < preContent.length; i++) {
        let element = preContent[i].children[0];
        if (element.tagName == 'TEXTAREA') {
            articleContent.push({
                type: 'text',
                content: element.value
            });
        } else if (element.tagName == 'IMG') {
            articleContent.push({
                type: 'image',
                content: element.src
            });
        }
    }
    const article = {
        title: articleTitle,
        author: articleAuthor,
        content: JSON.stringify(articleContent)
    }

    postIt('/articles/new', article);
}));
