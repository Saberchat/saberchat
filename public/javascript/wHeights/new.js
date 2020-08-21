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
function next() {
  const title = document.getElementById('title').value;
  const author = document.getElementById('author').value;
  head.style.display = 'none';
  body.style.display = '';
  document.getElementById('title-display').innerText = title;
  articleTitle = title;
  document.getElementById('author-display').innerText = author;
  articleAuthor = author;
}
// adds textarea
function addText() {
  textCount += 1;
  $('#article-content').append(
    `<textarea class="my-3" id="t-${textCount}" name="content[t-${textCount}]" rows="1" oninput="autoGrow(this)"></textarea>`
  );
  document.getElementById('t-' + textCount).onkeydown = function(e){
        if(e.keyCode==9 || e.which==9){
            e.preventDefault();
            let s = this.selectionStart;
            this.value = this.value.substring(0,this.selectionStart) + "\t" + this.value.substring(this.selectionEnd);
            this.selectionEnd = s+1; 
        }
    }
}

// adds image
function addImage() {
  $('#article-content').append(
    `<img src="${imageInput.value}" alt="article image" class="my-3 rounded img-fluid">`
  );
  imageInput.value = "";
}
// enable tabs in textareas
const textareas = document.getElementsByTagName('textarea');
const count = textareas.length;

for(let i=0;i<count;i++){
    textareas[i].onkeydown = function(e){
        if(e.keyCode==9 || e.which==9){
            e.preventDefault();
            let s = this.selectionStart;
            this.value = this.value.substring(0,this.selectionStart) + "\t" + this.value.substring(this.selectionEnd);
            this.selectionEnd = s+1; 
        }
    }
}

// auto grows textareas
function autoGrow(element) {
  element.style.height = "5px";
  element.style.height = (element.scrollHeight)+"px";
}

// submits article to be created
$('#article-form').submit(function(e) {
  e.preventDefault();
  const url = '/witherlyheights/articles/new'
  let preContent = $('#article-content').children();
  for(let i=0;i < preContent.length; i++) {
    if(preContent[i].tagName == 'TEXTAREA') {
      articleContent.push({
        type: 'text',
        content: preContent[i].value
      });
    } else if(preContent[i].tagName == 'IMG') {
      articleContent.push({
        type: 'image',
        content: preContent[i].src
      });
    }
  }
  
  const article = {
    title: articleTitle,
    author: articleAuthor,
    content: articleContent
  }
  
  $.post(url, article, function() {
    window.location.replace('/witherlyheights');
  });
});