const keywords = document.getElementsByClassName("keyword");
const occurences = document.getElementsByClassName("occurence");

anychart.onDocumentReady(function () {
    var data = [];

    for (let i = 0; i < keywords.length; i++) {
        data.push({"x": keywords[i].innerText, "value": parseInt(occurences[i].innerText)});
    }


// create a tag (word) cloud chart
    var chart = anychart.tagCloud(data);
    // set an array of angles at which the words will be laid out
    chart.angles([0])
    // enable a color range
    chart.colorRange(true);
    // set the color range length
    chart.colorRange().length('80%');
// display the word cloud chart
    chart.container("container");
    chart.draw();

});
