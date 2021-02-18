// article variables
let articleTitle;
let articleAuthor;

// initialize the editor
const editor = new EditorJS({

    holder: 'editorjs', // id of the div containing editor
    logLevel: 'ERROR', // sets what is logged to console
    tools: { // configure tools
        header: {
            class: Header,
            config: {
                placeholder: 'Enter a header...',
                levels: [1, 2, 3, 4],
                defaultLevel: 2
            }
        },
        list: {
            class: List,
            inlineToolbar: true
        },
        image: {
            class: SimpleImage,
            inlineToolbar: ['bold', 'italic']
        }
    },
    placeholder: 'Type here...',
    // autofocus: 'true',
    data: {}
});

const saveButton = document.getElementById('save-button');

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

saveButton.addEventListener('click', () => {
    editor.save().then(savedData => {
        articleTitle = document.getElementById('title').value;
        articleAuthor = document.getElementById('author').value;

        const article = {
            title: articleTitle,
            author: articleAuthor,
            content: JSON.stringify(savedData.blocks)
        }

        postIt('/articles/new', article);
        console.log('Saved Article');
    }).catch((error) => {
        console.log('Saving failed: ', error);
    });
});


// save editor info
// editor.save().then((outputData) => {
//     console.log('Article data: ', outputData)
//   }).catch((error) => {
//     console.log('Saving failed: ', error)
//   });
