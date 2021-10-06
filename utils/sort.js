const package = {};

package.partition = function(arr, from, to) { //Partition array around pivot and swap misplaced elements on either side
    let pivot = arr[from]; //Set pivot to any value in array (start works nicely)
    
    //Set tracker variables on either side
    let i = from-1;
    let j = to+1;

    while (i < j) { //Continue swapping process until i moves past j
        i++;
        while (arr[i] < pivot) {i++;} //Find first value larger than pivot on the left
        j--;
        while (arr[j] > pivot) {j--;} //Find first value smaller than pivot on the right
        if (i < j) { //If i and j are both on the correct sides of the pivot, swap elements on either side
            [arr[i], arr[j]] = [arr[j], arr[i]]; //Swap elements
        }
    }
    return j;
}

package.quicksort = function(arr, from, to) { //Implement recursive quicksort algorithm on array
    if (from < to) { //Continue until pivot falls outside array bounds
        let p = partition(arr, from, to); //Create pivot point by partitioning array into two parts

        //Recursively sort around pivot
        quicksort(arr, from, p);
        quicksort(arr, p+1, to);
    }
}

module.exports = package;