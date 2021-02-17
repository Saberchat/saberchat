module.exports.formatTime = function(time) {
    let hourComponent;
    let timeInHours;

    if (Math.floor(time) < 0) {
        hourComponent = `${24+Math.floor(time)}`;
    } else {
        hourComponent = `${Math.floor(time)}`;
    }

    if (Math.round((time-Math.floor(time)) * 60) < 10) {
        timeInHours = `${hourComponent}:0${Math.round((time-Math.floor(time)) * 60)}`;
    } else {
        timeInHours = `${hourComponent}:${Math.round((time-Math.floor(time)) * 60)}`;
    }

    if (parseInt(timeInHours.split(':')[0]) == 0) {
        timeInHours = `${12+parseInt(timeInHours.split(':'[0]))}:${timeInHours.split(':')[1]} AM`;
    } else if (parseInt(timeInHours.split(':')[0]) == 12) {
        timeInHours = `${timeInHours} PM`;
    } else if (parseInt(timeInHours.split(':')[0]) < 12) {
        timeInHours = `${timeInHours} AM`;
    } else {
        timeInHours = `${parseInt(timeInHours.split(':')[0])-12}:${timeInHours.split(':')[1]} PM`;
    }

    return timeInHours;
}

module.exports.getHours = function(dates) {
    let finalTimes = [];
    let finalTimesUnformatted = [];
    let dateInMs;
    let actual;

    for (let date of dates) {
        dateInMs = date.getTime();
        finalTimesUnformatted.push(((dateInMs/3600000)% 24)-8);
        finalTimes.push(module.exports.formatTime(((dateInMs/3600000)% 24)-8));
    }

    return {finalTimes, finalTimesUnformatted};
}

module.exports.sortTimes = function(times, formattedTimes) {
    let temp;
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

module.exports.getStats = function(times) {
    let avgTime = 0;
    let stdDevTime = 0;
    let medianTime;
    let minTime;
    let maxTime;

    for (let time of times) {
        avgTime += (time/times.length);
    }

    if (times.length%2 == 0) {
        medianTime = module.exports.formatTime((times[times.length/2] + times[(times.length/2)+1])/2);
    } else {
        medianTime = module.exports.formatTime(times[(times.length+1)/2]);
    }

    let formattedAvgTime = module.exports.formatTime(Math.round(avgTime));
    for (let time of times) {
        stdDevTime += Math.pow((time-avgTime), 2);
    }

    stdDevTime = Math.sqrt(stdDevTime/times.length);
    minTime = module.exports.formatTime(avgTime-(2*stdDevTime));
    maxTime = module.exports.formatTime(avgTime+(2*stdDevTime));

    return {avgTime: formattedAvgTime, medianTime, minTime, maxTime};
}
