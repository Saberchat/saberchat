function convertToLink(text) {
    const delimeter = new RegExp(/[\"\'\r]/, 'g'); //Regex for most troublesome link characters
    let deformatted = []; //Holds words/links from text
    let embedded = false; //Boolean value to check if link/email is embedded in each line of text

    //Final list of emails and links, and the converted text
    let emails = [];
    let links = [];
    let convertedText = "";

    //Iterate through text and parse out words and links
    for (let line of text.split('\n')) {
        for (let segment of line.trim().split(' ')) {
            deformatted.push(segment.split(delimeter).join(''));
        }
    }

    //Parse emails and links from deformatted text
    for (let line of deformatted) {
        if ((line.includes('@'))) {
            emails.push(text.slice(text.indexOf(line), text.indexOf(line) + line.length));

            //Money can be confused as a link, so $ expressions are discounted
        } else if (line.slice(0, line.length - 1).includes('.') && !line.includes('$')) {
            links.push(text.slice(text.indexOf(line), text.indexOf(line) + line.length));
        }
    }

    //Build converted string using HTML hrefs
    for (let line of text.split(' ')) {
        embedded = false;
        for (let email of emails) {
            if (line.includes(email)) {
                embedded = true;
                for (let segment of line.split('\n')) {
                    if (segment.includes(email)) {
                        convertedText += `<a class="embedded-link" href="mailto:${email}">${segment}</a>`;
                    } else {
                        convertedText += `${segment}`;
                    }
                }
                convertedText += ` `;
                break;
            }
        }

        for (let link of links) {
            if (line.includes(link)) { //If there is a link somewhere in the line
                embedded = true;

                //Iterate through line and search for specific location of link
                for (let segment of line.split('\r')) {
                    if (segment.includes(link)) {

                        //Evaluates whether link includes https, and adds it accordingly
                        if (link.slice(0, 4) != "http") {
                            convertedText += `<a class="embedded-link" href="https://${link}" target="_blank">${segment}</a>`;
                        } else {
                            convertedText += `<a class="embedded-link" href="${link}" target="_blank">${segment}</a>`;
                        }

                    } else {
                        convertedText += `${segment}`; //If no link is included, add plain text
                    }
                }
                convertedText += ` `;
                break;
            }
        }

        if (!embedded) { //If there is no link in the line at all, add plain text
            convertedText += `${line} `;
        }
    }

    return convertedText;
}

module.exports = convertToLink;
