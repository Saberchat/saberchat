const package = {};

package.partition = function(arr, from, to, property) { //Partition array around pivot and swap misplaced elements on either side
    let pivot = arr[from]; //Set pivot to any value in array (start works nicely)
    
    //Set tracker variables on either side
    let i = from-1;
    let j = to+1;

    while (i < j) { //Continue swapping process until i moves past j
        i++;
        j--;
        if (typeof arr[i][property] == "string") { //Make case insensitive
            while (arr[i][property].toLowerCase() < pivot[property].toLowerCase()) {i++;} //Find first value larger than pivot on the left
            while (arr[j][property].toLowerCase() > pivot[property].toLowerCase()) {j--;} //Find first value smaller than pivot on the right

        } else if (typeof arr[i][property] == "object") { //Track counts as opposed to values
            while (arr[i][property].length < pivot[property].length) {i++;} //Find first value larger than pivot on the left
            while (arr[j][property].length > pivot[property].length) {j--;} //Find first value smaller than pivot on the right          

        } else { //Normal iteration
            while (arr[i][property] < pivot[property]) {i++;} //Find first value larger than pivot on the left
            while (arr[j][property] > pivot[property]) {j--;} //Find first value smaller than pivot on the right
        }

        if (i < j) { //If i and j are both on the correct sides of the pivot, swap elements on either side
            [arr[i], arr[j]] = [arr[j], arr[i]]; //Swap elements
        }
    }
    return j;
}

package.quicksort = function(arr, from, to, property) { //Implement recursive quicksort algorithm on array
    if (from < to) { //Continue until pivot falls outside array bounds
        let p = package.partition(arr, from, to, property); //Create pivot point by partitioning array into two parts

        //Recursively sort around pivot
        package.quicksort(arr, from, p, property);
        package.quicksort(arr, p+1, to, property);
    }
}

module.exports = package;