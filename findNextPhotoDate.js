

var request = require('request');
var Mocha = require('mocha');
var assert = require('assert');
var _ = require('underscore');

var expect = require('chai').expect;

function flyby(lat, long) {

  if (!lat || !long) {
    console.log('Both Latitude and Longitude are required');
    return null;
  }

  if(isNaN(lat) || isNaN(long)){
    console.log('One or more of the location Coordinates is not a number. Please send valid cordinates');
    return null;
  }
  //generate request
  var url = getURL(lat, long);
  // passing callback named dataReceived to be called after response is received.
  request(url, dataReceived);
}


function getURL(latitude, longitude) {
  var url = 'https://api.nasa.gov/planetary/earth/assets?' + 'lat='+ latitude + '&lon=' + longitude + '&api_key=9Jz6tLIeJ0yY9vjbEUWaH9fsXA930J9hspPchute';
  return url;
}

function dataReceived(error, response, body) {
  var data;
  if (!error && response.statusCode === 200) {

    try {
        var parsedBody = JSON.parse(body);
    } catch(e) {
        console.log('Response received could not be parsed into JSON format');
        return;
    }

    if (Object.keys(parsedBody).length) {
      data = parsedBody;
    }
  } else {
      var msg = 'error while receiving response: ' + error;
      return msg;
  }
  computeDatesAndDeltas(data);

};


function computeDatesAndDeltas(data) {
 if (data && data.results.length) {
    //Get Delta Interval Times
    var deltaIntervalsAndDates = getDeltaIntervalsAndDates(data.results);
    var deltaIntervals = deltaIntervalsAndDates.deltas;
    var dates = deltaIntervalsAndDates.dates;

    // Get Average Delta Interval Time in MilliSecs
    var avgDelta = getAverageInterval(deltaIntervals);

    // Convert Most Probable Delta Interval from Millisecs into days
    var avgDeltaInDays = Math.ceil(avgDelta/(1000*60*24*60));

    var mostRecentDate = getMostRecentDate(dates);

    console.log('Most Recent photo taken = ', mostRecentDate.toUTCString());

   //Calculate Next Time by adding avgDeltaInDays to Last Date
    var nextDate = getNextDate(mostRecentDate, avgDeltaInDays);
    console.log('Next probable photo date = ' , nextDate.toUTCString());
   return nextDate;

  } else {
    return 'API failed to return valid response. Please check back again';
  }
}

// This function calculates Delta Intervals between two DateTime values.
// It returns an array of Delta Intervals in MilliSecs

function getDeltaIntervalsAndDates(results) {

  var date1, date2;
  var deltas = [];
  var dates = [];

  // Get Delta Intervals between two dates in the results
  results.forEach(function(obj, index, results){
    date1 = results[index].date;
    dates.push(getMilliSecsWithoutOffset(date1));
    if (index + 1 < results.length) {
      date2 = results[index+1].date;
      return deltas.push(getMilliSecsWithoutOffset(date2) -                                        getMilliSecsWithoutOffset(date1));
    }
  });
  return {
    deltas: deltas,
    dates: dates
  };
}

// This function converts DateTime values into MilliSecs.
// It returns date in MilliSec format

function getMilliSecsWithoutOffset(dateStr) {
  var date = new Date(dateStr);
  var offset = date.getTimezoneOffset() * 60 * 1000;
  var utcStamp = date.getTime();
  return utcStamp - offset;
}


function getAverageInterval(intervals) {
  var total = 0;
  total = intervals.reduce(function(total, delta) {
    return total + delta;
  });

  return Math.ceil(total/intervals.length);
}


// This function computes most recent photo date by sorting dates
function getMostRecentDate(dates) {
  var lastDate = _.max(dates);
  return new Date(lastDate);

}

// params:
// 1. lastDate - Date type
// 2. delta - in days
// returns: next occurrence date - Date type

function getNextDate(lastDate, delta) {

  //Adding Delta time to last date most frequent delta to last date
  var nextDate = lastDate;
  nextDate.setDate(lastDate.getDate() + delta);
  return nextDate;
}


/*----------------------------

      a) What other prediction methods could you potentially
         use other than using the average?
      b) What test cases would you use to validate the
         solution?

Other alternative to computing average is finding 'Mode' instead of mean.
The below function calculates the most frequent Delta value among all Delta Intervals (instead of calculating the average of the delta intervals).

API response clearly indicates that all delta intervals are not equal. Sometimes NASA hasn't taken photo for few delta intervals.

This function calcuates 'Mode' and returns the most frequent Delta Interval value in MilliSecs.

*/

function getMostFrequentInterval(deltas) {
  var frequencyMap = {};
  var max = 0;
  var frequentItem;

  deltas.forEach(function(item) {
    if(!frequencyMap[item]) {
      frequencyMap[item] = 1;
    } else {
      frequencyMap[item] = frequencyMap[item] + 1;
    }
  });

  console.log('frequencyMap = ', frequencyMap);

  Object.keys(frequencyMap).forEach(function(item) {
    if (frequencyMap[item] > max) {
      max = frequencyMap[item];
      frequentItem = item;
    }
  });

  return frequentItem;
}

/* There more alternatives */
/* As coded above, mode is one alternative.
/* Another alternative to using mode is using Median which is middle value of all the sorted delta intervals) */
/* The best way, of course, is calculating the standard deviation and adding it to the most recent photo taken */


/* ------------------ TEST CASES BELOW------------------------ */

var mocha = new Mocha();
//coderpad asks this be there for mocha to work
mocha.suite.emit('pre-require', this, 'solution', mocha);

describe('flyby test suite', function() {
  it('when both coordinates are absent', function() {
    var nextPhotoDate = flyby();
    expect(nextPhotoDate).to.be.null;
  });
  it('when any of location coordinates is not a number', function() {
    var nextPhotoDate = flyby("foo", "bar");
    expect(nextPhotoDate).to.be.null;
  });
  it('when location coordinates are strings', function() {
    var nextPhotoDate = flyby("1.5", "100.75");
    expect(nextPhotoDate).to.be.undefined;
  });
});

describe('getURL() test suite', function() {
  it('when lat = `1.5` & long = `100.75`', function() {
    var url = 'https://api.nasa.gov/planetary/earth/assets?' + 'lat=1.5&lon=100.75&api_key=9Jz6tLIeJ0yY9vjbEUWaH9fsXA930J9hspPchute';
    var actual = getURL(1.5, 100.75);
    expect(actual).to.equal(url);
  });
});



describe('dataReceived() test suite', function() {
  it('API returns error', function() {
    var error = { code: 'UNAUTHORIZED', msg: 'User is Unauthorized' };
    var response = { statusCode: 201 };
    var actual = dataReceived(error, response, {});
    expect(actual).to.include('error');
  });

  it('API 400 Bad request', function() {
    var error = '';
    var response = { statusCode: 400 };
    var actual = dataReceived(error, response, {});
    expect(actual).to.include('error');
  });
});


describe('computeDatesAndDeltas() test suite', function() {
  it('when data is null', function() {
    var data = null;
    var actual = computeDatesAndDeltas(data);
    expect(actual).to.include('failed');
  });

  it('when dates are empty', function() {
    var data = { results: [] };
    var actual = computeDatesAndDeltas(data);
    expect(actual).to.include('failed');
  });

  it('when dates are valid', function() {
    var data = { count: 2, results: [{ date:'2017-04-01T03:28:34'}, { date:'2017-04-17T03:28:25'}] };
    console.log('Only for the two dates passed: ');
    var actual = computeDatesAndDeltas(data).toUTCString();
    expect(actual).to.equal('Wed, 03 May 2017 03:28:25 GMT');
  });
});


describe('getDeltaIntervalsAndDates() test suite', function() {
  it('when dates and interval data are computed', function() {
    var response = [{date:'2013-05-24T03:31:02'}, {date:'2013-06-09T03:31:01'}];
    var deltasAndDates = getDeltaIntervalsAndDates(response);
    expect(deltasAndDates).to.be.a('Object');
  });
  it('when dates and interval data are computed', function() {
    var response = [{date:'2013-05-24T03:31:02'}, {date:'2013-06-09T03:31:01'}];
    var deltasAndDates = getDeltaIntervalsAndDates(response);
    expect(deltasAndDates.dates).to.be.a('Array');
  });
  it('when dates and interval data are computed', function() {
    var response = [{date:'2013-05-24T03:31:02'}, {date:'2013-06-09T03:31:01'}];
    var deltasAndDates = getDeltaIntervalsAndDates(response);
    expect(deltasAndDates.deltas).to.be.a('Array');
  });
});


describe('getAverageInterval() test suite', function() {
  it('when average interval is returned', function() {
    var intervals = [10, 20, 30, 40, 50];
    console.log('computes average');
    var average = getAverageInterval(intervals);
    expect(average).to.be.equal(30);
  });

});



describe('getMostRecentDate() test suite', function() {
  it('when most recent date is recieved', function() {
    var utcTimeStamps = [1489634922000, 1491017314000, 1492399705000 ];
    var actual = getMostRecentDate(utcTimeStamps);
    expect(actual.toUTCString()).to.be.equal('Mon, 17 Apr 2017 03:28:25 GMT');
  });

});


describe('getNextDate() test suite', function() {
  it('when next date is returned', function() {
    var utcTimeStamps = [1489634922000, 1491017314000, 1492399705000 ];
    var lastDate = getMostRecentDate(utcTimeStamps);
    var actual = getNextDate(lastDate, 16);
    expect(actual.toUTCString()).to.be.equal('Wed, 03 May 2017 03:28:25 GMT');
  });
});

mocha.run();
