const package = {}

package.linearSearch = function(arr, val, property) { //Perform linear search on unsorted array to return populated value
    for (let i = 0; i < arr.length; i++) { //Iterate through array and find value searched
        if (arr[i][property] == val) {return arr[i];} //Frontwards iterative search
        if (arr[arr.length-(i+1)][property] == val) {return arr[arr.length-(i+1)]} //Backwards iterative search
    }
    return null; //Value not found in array
}

package.binarySearch = function(arr, from, to, val, property) { //Perform binary search on sorted array to return populated value
    mid = parseInt((from+to)/2); //Midpoint of array

    if (arr[mid][property] == val) {return mid;} //Value is found
    else if (from == to) {return null;} //Value not found in array

    //Search in upper or lower half based on whether value is smaller or larger than midpoint
    else if (arr[mid][property] > val) {return this.binarySearch(arr, from, mid, val, property);}
    else if (arr[mid][property] > val) {return this.binarySearch(arr, mid+1, to, val, property);}
}

module.exports = package;