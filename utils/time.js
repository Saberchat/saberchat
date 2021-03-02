//Time Operations
const package = {};

package.formatTime = function(time) { //Format time in terms of hours and minutes
    let hourComponent;
    let timeInHours;

    if (Math.floor(time) < 0) { //If time is before midnight, evaluate in hours before 24:00
        hourComponent = `${24+Math.floor(time)}`;
    } else {
        hourComponent = `${Math.floor(time)}`;
    }

    if (Math.round((time-Math.floor(time)) * 60) < 10) { //If minutes are less than 10, use "hh:0m" instead of "hh:m"
        timeInHours = `${hourComponent}:0${Math.round((time-Math.floor(time)) * 60)}`;
    } else {
        timeInHours = `${hourComponent}:${Math.round((time-Math.floor(time)) * 60)}`;
    }

    if (parseInt(timeInHours.split(':')[0]) == 0) { //If time is midnight, use 12AM instead of 0AM
        timeInHours = `${12+parseInt(timeInHours.split(':'[0]))}:${timeInHours.split(':')[1]} AM`;
    } else if (parseInt(timeInHours.split(':')[0]) == 12) { //If time is noon, use 12PM
        timeInHours = `${timeInHours} PM`;
    } else if (parseInt(timeInHours.split(':')[0]) < 12) { //If time is before noon, use (regular time) AM
        timeInHours = `${timeInHours} AM`;
    } else { //If time is after noon, use (time after 12) PM
        timeInHours = `${parseInt(timeInHours.split(':')[0])-12}:${timeInHours.split(':')[1]} PM`;
    }
    return timeInHours;
}

package.getHours = function(dates) {
    let finalTimes = [];
    let finalTimesUnformatted = [];
    let dateInMs;

    for (let date of dates) {
        dateInMs = date.getTime();
        //Get hours after midnight (not sure why I have to subtract 8, but otherwise doesn't get the right output)
        finalTimesUnformatted.push(((dateInMs/3600000)% 24)-8);
        finalTimes.push(package.formatTime(((dateInMs/3600000)% 24)-8));
    }
    return {finalTimes, finalTimesUnformatted};
}

package.sortTimes = function(times, formattedTimes) { //Sort times in increasing order
    let temp;
    //Use sorting principles to iterate through times and format them
    for (let i = 0; i < times.length-1; i ++) {
        for (let j = 0; j < times.length-1; j ++) {
            temp = times[j];
            times[j] = times[j+1];
            times[j+1] = temp;
            temp = formattedTimes[j];
            formattedTimes[j] = formattedTimes[j+1];
            formattedTimes[j+1] = temp;
        }
    }
    return {times, formattedTimes};
}

package.getStats = function(times) { //Get mean, median and standard deviation of times (using basic stat operations)
    let avgTime = 0;
    let stdDevTime = 0;
    let medianTime;
    let minTime;
    let maxTime;

    //Calculate mean time
    for (let time of times) {
        avgTime += (time/times.length);
    }

    //Calculate median
    if (times.length%2 == 0) {
        medianTime = package.formatTime((times[times.length/2] + times[(times.length/2)+1])/2);
    } else {
        medianTime = package.formatTime(times[(times.length+1)/2]);
    }

    //Calcualte standard deviation
    let formattedAvgTime = package.formatTime(Math.round(avgTime));
    for (let time of times) {
        stdDevTime += Math.pow((time-avgTime), 2);
    }

    stdDevTime = Math.sqrt(stdDevTime/times.length);
    minTime = package.formatTime(avgTime-(2*stdDevTime));
    maxTime = package.formatTime(avgTime+(2*stdDevTime));

    return {avgTime: formattedAvgTime, medianTime, minTime, maxTime};
}

module.exports = package;