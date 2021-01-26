const convertToLink = (text => {
  let deformatted = [];
  let emails = [];
  let links = [];
  let convertedString = ""

  for (let line of text.split('\n')) {
    for (let segment of line.trim().split(' ')) {
      deformatted.push(segment.split('"').join('').split('\'').join(''));
    }
  }

  for (let line of deformatted) {
    if ((line.includes('@'))) {
      emails.push(text.slice(text.indexOf(line), text.indexOf(line)+line.length+1));

    } else if (line.slice(0, line.length-1).includes('.')) {
      links.push(text.slice(text.indexOf(line), text.indexOf(line)+line.length+1));
    }
  }

  return {emails, links};
});

module.exports = convertToLink;
