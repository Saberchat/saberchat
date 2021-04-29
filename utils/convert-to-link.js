const { link } = require("joi");

const package = {};

package.convertToLink = function(text) { //Convert text to contain embedded links
    const delimeter = new RegExp(/[\"\'\r]/, 'g'); //Regex for most troublesome link characters
    const alpha = new RegExp(/[a-z]/, 'g')
    let deformatted = []; //Holds words/links from text
    let embedded = false; //Boolean value to check if link/email is embedded in each line of text

    //Final list of emails and links, and the converted text
    let emails = [];
    let links = [];
    let phones = [];
    let convertedText = "";

    //Iterate through text and parse out words and links
    for (let line of text.split('\n')) {
        for (let segment of line.trim().split(' ')) {
            deformatted.push(segment.split(delimeter).join(''));
        }
    }

    //Parse emails and links from deformatted text
    for (let line of deformatted) {
        if ((line.includes('@')) && (!line.includes('/'))) { //All emails must include @, but do not include /, although some site URLs have @ and /)
            emails.push(text.slice(text.indexOf(line), text.indexOf(line) + line.length));

        //Money can be confused as a link, so $ expressions are discounted
        } else if (line.slice(0, line.length - 1).includes('.') && line.slice(0, line.length - 1).split('.')[1].length > 0 && !line.includes('$')) {
            if (line.slice(0, line.length - 1).split('.')[1][0].match(alpha)) {
                links.push(text.slice(text.indexOf(line), text.indexOf(line) + line.length));
            }
        
        //Pick up phone numbers (Only US works) by identifying 10-digit numerical series
        } else if (parseInt(line.split('-').join('').split('(').join('').split(')').join('')).toString().length == 10) {
            phones.push(text.slice(text.indexOf(line), text.indexOf(line) + line.length));
        }
    }

    //Build converted string using HTML hrefs
    for (let line of text.split(' ')) {
        embedded = false;
        for (let email of emails) {
            if (line.includes(email)) {
                embedded = true;
                for (let segment of line.split('\n')) {
                    if (segment.includes(email) && segment.indexOf('@') > 0) { //Check that a) email is included and b) it has an address before the @ (not a social media handle)
                        convertedText += `<a class="embedded-link" href="mailto:${email}">${segment}</a>`;
                    } else {convertedText += `${segment}`;}
                }
                convertedText += ` `;
                break;
            }
        }

        for (let phone of phones) {
            if (line.includes(phone)) {
                embedded = true;
                for (let segment of line.split('\n')) {
                    if (segment.includes(phone)) {
                        convertedText += `<a class="embedded-link" href="tel:${phone}">${segment}</a>`;
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

package.embedLink = function(user, objects, hide) {
    let objectTexts = new Map(); //For users without accounts to see - replace names in text with initials
    let filteredText = "";
    let containedName;
    let containedInitial;
    for (let object of objects) { //Iterate through all objects and encode their text
        filteredText = "";
        if (!user) {
            containedName = "";
            containedInitial = "";
            for (let word of object.text.split(' ')) { //Iterate through each word and search for names
                containedName = "";
                containedInitial = "";
                for (let name of hide) { //Iterate through each name
                    if (word.toLowerCase().includes(name)) {
                        containedName = name; //Track the name that appears
                        containedInitial = `${containedName.charAt(0).toUpperCase()}`; //Encode the name as its initial
                        if (word.charAt(word.length-1) != '.') { //If word does not end with period, add one for end initial
                            containedInitial += '.';
                        }
                    }
                }
                if (containedName != '') { //If a name has been found, add processed version to text
                    filteredText += `${word.toLowerCase().split(containedName).join(containedInitial)} `;
                } else {
                    filteredText += `${word} `;
                }
            }
            filteredText = package.convertToLink(filteredText);
        } else {
            filteredText = package.convertToLink(object.text);
        }   
        objectTexts.set(object._id, filteredText); //Add object to map
    }
    return objectTexts;
}

module.exports = package;