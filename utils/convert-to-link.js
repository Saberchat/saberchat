const package = {};

package.convertToLink = function(text) { //Convert text to contain embedded links
    const delimeter = new RegExp(/[\"\'\r]/, 'g'); //Regex for most troublesome link characters
    const alpha = new RegExp(/[a-z]/, 'g')
    const nonAlpha = new RegExp(/^[a-z]/, 'g')
    let deformatted = []; //Holds words/links from text
    let embedded = false; //Boolean value to check if link/email is embedded in each line of text

    //Final list of emails and links, and the converted text
    let emails = [];
    let hashtags = [];
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
    let line;
    for (let i = 0; i < deformatted.length; i++) {
        line = deformatted[i];

        if ((line.includes('@')) && (!line.includes('/'))) { //All emails must include @, but do not include /, although some site URLs have @ and /) (Social media tags also included)
            emails.push(text.slice(text.indexOf(line), text.indexOf(line) + line.length));
        
        } else if ((line.charAt(0) == '#') && (!line.includes('/'))) { //Hashtags (any sequences preceded with a pound sign)
            hashtags.push(text.slice(text.indexOf(line), text.indexOf(line) + line.length));

        //Money can be confused as a link, so $ expressions are discounted
        } else if (line.slice(0, line.length - 1).includes('.') && line.slice(0, line.length - 1).split('.')[1].length > 0 && !line.includes('$')) {
            if (line.slice(0, line.length - 1).split('.')[1][0].match(alpha)) {
                links.push(text.slice(text.indexOf(line), text.indexOf(line) + line.length));
            }
        
        //Pick up phone numbers (Only US works) by identifying 10-digit numerical series
        } else if (parseInt(line.split('-').join('').split('(').join('').split(')').join('')).toString().length == 10) {
            phones.push(text.slice(text.indexOf(line), text.indexOf(line) + line.length));

        //Pick up phone numbers with spaces in between (Only US works) by concatenating neighboring 3-7 numerical series
        } else if ((i < deformatted.length - 1) && (parseInt(`${line}${deformatted[i+1]}`.split('-').join('').split('(').join('').split(')').join('')).toString().length == 10)) {
            phones.push(`${line} ${deformatted[i+1]}`);
        }
    }

    //Build converted string using HTML hrefs
    let counter = 0;
    while (counter < text.split(' ').length) {
        line = text.split(' ')[counter];
        embedded = false;

        for (let email of emails) { //Iterate through the emails and search for segments that contain them
            if (line.includes(email)) {
                embedded = true;
                for (let segment of line.split('\n')) {
                    if (segment.includes(email)) { //Check that a) email is included and b) it has an address before the @ (not a social media handle)
                        if (segment.split('(').join('').split(')').join('').indexOf('@') > 0) {
                            convertedText += `<a class="embedded-link" href="mailto:${email}">${segment}</a>`;
                        } else { //If email consists of an @ with nothing before it, link it as a social media handle (Instagram default)
                            convertedText += `<a class="embedded-link" target="_blank" href="https://www.instagram.com/${email.split(')').join('').split('(').join('').split(',').join('').slice(1)}">${segment}</a>`;
                        }
                    } else {convertedText += `${segment}`;} //If no match is found, add segment without any attached link
                }
                convertedText += ` `; //Space concludes line segment
                break;
            }
        }

        for (let hashtag of hashtags) { //Iterate through hashtags and add any matches
            if (line.includes(hashtag)) {
                embedded = true;
                for (let segment of line.split('\n')) {
                    if (segment.includes(hashtag)) {
                        convertedText += `<a class="embedded-link" target="_blank" href="https://instagram.com/explore/tags/${hashtag.slice(1)}">${segment}</a>`;
                    } else {convertedText += `${segment}`;} //If no match is found, add segment without any attached link
                }
                convertedText += ` `; //Space concludes line segment
                break;
            }
        }

        for (let phone of phones) { //Iterate through phones and search for any matches
            if (line.includes(phone)) { //If segment directly contains phone, add it 
                embedded = true;
                for (let segment of line.split('\n')) {
                    if (segment.includes(phone)) {
                        convertedText += `<a class="embedded-link" href="tel:${phone}">${segment}</a>`;
                    } else {convertedText += `${segment}`;} //If no match is found, add segment without any attached link
                }
                convertedText += ` `; //Space concludes line segment
                break;
            } else if (`${line} ${text.split(' ')[counter+1]}` == phone) { //If phone is listed between two split segments, format them
                embedded = true;
                convertedText += `<a class="embedded-link" href="tel:${phone}">${phone}</a> `;
                counter ++; //Skip the second line segment
            }
        }

        for (let link of links) { //Iterate through regular URLs and search for any matches
            if (line.includes(link)) { //If there is a link somewhere in the line
                embedded = true;
                for (let segment of line.split('\r')) { //Iterate through line and search for specific location of link
                    if (segment.includes(link)) {

                        //Evaluates whether link includes https, and adds it accordingly
                        if (link.slice(0, 4) != "http") {
                            convertedText += `<a class="embedded-link" href="https://${link}" target="_blank">${segment}</a>`;
                        } else {
                            convertedText += `<a class="embedded-link" href="${link}" target="_blank">${segment}</a>`;
                        }
                    } else {convertedText += `${segment}`;}  //If no match is found, add segment without any attached link
                }
                convertedText += ` `;
                break; //Space concludes line segment
            }
        }
        if (!embedded) {convertedText += `${line} `;} //If there is no link in the line at all, add plain text
        counter ++;
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
                    if (word.toLowerCase().indexOf(name.toLowerCase()) == 0) {
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