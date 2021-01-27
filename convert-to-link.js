const convertToLink = (text => {
  const delimeter = new RegExp(/[\"\'\r]/, 'g');
  let deformatted = [];
  let embedded = false;
  let emails = [];
  let links = [];
  let convertedString = ""

  for (let line of text.split('\n')) {
    for (let segment of line.trim().split(' ')) {
      deformatted.push(segment.split(delimeter).join(''));
    }
  }

  for (let line of deformatted) {
    if ((line.includes('@'))) {
      emails.push(text.slice(text.indexOf(line), text.indexOf(line)+line.length));

    } else if (line.slice(0, line.length-1).includes('.')) {
      links.push(text.slice(text.indexOf(line), text.indexOf(line)+line.length));
    }
  }

  for (let line of text.split(' ')) {
    embedded = false;
    for (let email of emails) {
      if (line.includes(email)) {
        embedded = true;
        for (let segment of line.split('\n')) {
          if (segment.includes(email)) {
            convertedString += `<a class="embedded-link" href="mailto:${email}">${segment}</a>`;
          } else {
            convertedString += `${segment}`;
          }
        }
        convertedString += ` `;
        break;
      }
    }

    for (let link of links) {
      if (line.includes(link)) {
        embedded = true;
        for (let segment of line.split('\r')) {
          if (segment.includes(link)) {
            if (link.slice(0, 4) != "http") {
              convertedString += `<a class="embedded-link" href="https://${link}" target="_blank">${segment}</a>`;
            } else {
              convertedString += `<a class="embedded-link" href="${link}" target="_blank">${segment}</a>`;
            }
          } else {
            convertedString += `${segment}`;
          }
        }
        convertedString += ` `;
        break;
      }
    }

    if (!embedded) {
      convertedString += `${line} `;
    }
  }

  return convertedString;
});

module.exports = convertToLink;
