let fillers = require('fillers');

//Push all nonincluded prepositions, articles, pronouns, miscellaneous words
for (let word of ['aboard', 'about', 'above', 'across', 'after', 'against', 'along', 'amid', 'among', 'anti', 'around', 'as', 'at', 'before', 'behind', 'below', 'beneath', 'beside', 'besides', 'between', 'beyond', 'but', 'by', 'concerning', 'considering', 'despite', 'down', 'during', 'except', 'excepting', 'excluding', 'following', 'for', 'from', 'in', 'inside', 'into', 'like', 'minus', 'near', 'of', 'off', 'on', 'onto', 'opposite', 'outside', 'over', 'past', 'per', 'plus', 'regarding', 'round', 'save', 'since', 'than', 'through', 'to', 'toward', 'towards', 'under', 'underneath', 'unlike', 'until', 'up', 'upon', 'versus', 'via', 'with', 'within', 'without', 'i', 'me', 'we', 'us', 'you', 'she', 'her', 'he', 'him', 'it', 'they', 'them', 'that', 'which', 'who', 'whom', 'whose', 'whichever', 'whoever', 'whomever', 'when', 'whenever', 'however', 'this', 'these', 'that', 'those', 'anybody', 'anyone', 'anything', 'each', 'either', 'everybody', 'my', 'your', 'his', 'her', 'its', 'our', 'your', 'their', 'mine', 'yours', 'his', 'hers', 'ours', 'yours', 'theirs', 'both', 'few', 'many', 'several', 'all', 'any', 'most', 'none', 'some', 'myself  ', 'ourselves', 'yourself', 'yourselves', 'himself', 'herself', 'itself', 'themselves', 'a', 'an', 'the', 'were', 'fine', 'should', 'could', 'would', 'done', 'doing', 'made', 'making', 'also', 'suppose', 'supposed', 'supposing', 'perhaps', 'different', 'excellent', 'various', 'varied', 'varying']) {

  fillers.push(word);
}

module.exports = fillers;
