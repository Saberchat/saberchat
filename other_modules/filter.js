//Filter keywords from text
//NOTE: The constant fillerwords array is temporary. 
//I will be moving towards setting up a compareTo parameter which allows for static comparison between different texts, so we can parse unique keywords

let fillers = require('fillers');
let otherFillers = ['aboard', 'about', 'above', 'across', 'after', 'against', 'along', 'amid', 'among', 'anti', 'around', 'as', 'at', 'before', 'behind', 'below', 'beneath', 'beside', 'besides', 'between', 'beyond', 'but', 'by', 'concerning', 'considering', 'despite', 'down', 'during', 'except', 'excepting', 'excluding', 'following', 'for', 'from', 'in', 'inside', 'into', 'like', 'minus', 'near', 'of', 'off', 'on', 'onto', 'opposite', 'outside', 'over', 'past', 'per', 'plus', 'regarding', 'round', 'save', 'since', 'than', 'through', 'to', 'toward', 'towards', 'under', 'underneath', 'unlike', 'until', 'up', 'upon', 'versus', 'via', 'with', 'within', 'without', 'i', 'me', 'we', 'us', 'you', 'she', 'her', 'he', 'him', 'it', 'they', 'them', 'that', 'which', 'who', 'whom', 'whose', 'whichever', 'whoever', 'whomever', 'when', 'whenever', 'however', 'this', 'these', 'that', 'those', 'anybody', 'anyone', 'anything', 'each', 'either', 'everybody', 'my', 'your', 'his', 'her', 'its', 'our', 'your', 'their', 'mine', 'yours', 'his', 'hers', 'ours', 'yours', 'theirs', 'then', 'both', 'few', 'many', 'several', 'all', 'any', 'most', 'none', 'some', 'myself  ', 'ourselves', 'yourself', 'yourselves', 'himself', 'herself', 'itself', 'themselves', 'a', 'an', 'the', 'were', 'fine', 'should', 'could', 'would', 'done', 'doing', 'made', 'making', 'also', 'suppose', 'supposed', 'supposing', 'perhaps', 'different', 'excellent', 'various', 'varied', 'varying'];

//Push all nonincluded prepositions, articles, pronouns, miscellaneous words
for (let word of otherFillers) {
  fillers.push(word);
}

const filter = (text => {
  let keywords = new Map();
  const textSplitter = new RegExp(/[\"\s\'\r\n]/, 'g');
  const delimeter = new RegExp(/[^a-zA-z0-9]/, 'g');

  let processedWord;
  for (let word of text.split(textSplitter)) {
    processedWord = word.split(delimeter).join('').toLowerCase();
    if (processedWord.length > 3 && !fillers.includes(processedWord)) {
      if (keywords.has(processedWord)) {
        keywords.set(processedWord, keywords.get(processedWord) + 1);
      } else {
        keywords.set(processedWord, 1);
      }
    }
  }

  let meanValue = 0;
  for (let value of keywords) {
    meanValue += value[1];
  }
  meanValue /= keywords.size;

  for (let value of keywords) {
    if (value[1] < meanValue) {
      keywords.delete(value[0]);
    }
  }

  return keywords;
});

module.exports = filter;
