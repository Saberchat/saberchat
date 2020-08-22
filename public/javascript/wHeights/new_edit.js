// initialize the editor
const editor = new EditorJS({

    holderId: 'editorjs', // id of the div containing editor
    logLevel: 'ERROR', // sets what is logged to console
    tools: { // configure tools
        header: {
            class: Header,
            config: {
                placeholder: 'Enter a header...',
                levels: [1,2,3,4],
                defaultLevel: 2
            }
        },
        list: {
            class: List,
            inlineToolbar: true
        }
    },
    placeholder: 'Type here...',
    // autofocus: 'true',
    data: {}
});

// save editor info
// editor.save().then((outputData) => {
//     console.log('Article data: ', outputData)
//   }).catch((error) => {
//     console.log('Saving failed: ', error)
//   });