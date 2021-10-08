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