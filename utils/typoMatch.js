/**
 * Levenshtein String Distance
 * @param str1
 * @param str2
 * @returns Number The number of deletions, insertions, or substitutions one needs to do to get from str1 to str2
 */
const levenshteinDistance = function(str1 = "", str2 = "") {
    const track = Array(str2.length + 1).fill(null).map(() =>
        Array(str1.length + 1).fill(null));
    for (let i = 0; i <= str1.length; i += 1) {
        track[0][i] = i;
    }
    for (let j = 0; j <= str2.length; j += 1) {
        track[j][0] = j;
    }
    for (let j = 1; j <= str2.length; j += 1) {
        for (let i = 1; i <= str1.length; i += 1) {
            const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
            track[j][i] = Math.min(
                track[j][i - 1] + 1, // deletion
                track[j - 1][i] + 1, // insertion
                track[j - 1][i - 1] + indicator, // substitution
            );
        }
    }
    return track[str2.length][str1.length];
}

/**
 * Sorts an array of strings based off of how close each string is to the query string
 * @param query the string to compare to (what user entered)
 * @param possibilities the possibilities to compare against (all the available options)
 * @returns Array possibilities, but sorted so that first element is the best match for the query
 */
const matchTypo = function(query = "", possibilities=[""]) {
    let options = [];
    for (let possibility of possibilities) {
        options.push({
            string: possibility,
            distance: levenshteinDistance(query, possibility)
        });
    }
    options.sort((a, b) => {return a.distance - b.distance});
    let output = [];
    for (let option of options) {
        output.push(option.string);
    }
    return output;
}

module.exports.levenshteinDistance = levenshteinDistance;
module.exports.matchTypo = matchTypo;

if (typeof require !== 'undefined' && require.main === module) {
    console.log(matchTypo("heplo", ["hello", "hi", "bye"]));
}