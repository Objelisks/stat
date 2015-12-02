var statModule = angular.module('stat', []);
var sqlDateFormat = d3.time.format("%Y-%m-%d");

statModule.value('startDate', d3.time.day.offset(new Date(), -7));
statModule.value('endDate', d3.time.day(new Date()));

statModule.factory('database', ['startDate', 'endDate', '$rootScope', function(startDate, endDate, $rootScope) {
  var connection = io('http://localhost:8080');

  connection.on('message', function(msg) {
    // trigger angular event
    $rootScope.$broadcast(msg.type, msg.results);
  });

  var getData = function() {
    connection.send({
      type: 'data',
      start: sqlDateFormat(startDate),
      end: sqlDateFormat(endDate)
    });
  };

  var getTags = function() {
    connection.send({
      type: 'tags'
    });
  }

  var uploadData = function(data) {
    connection.send({
      type: 'update',
      data: data
    });
  };

  return {
    'getData': getData,
    'getTags': getTags,
    'upload':uploadData
  }
}]);

statModule
  .controller('DataBuilder', ['$scope', 'database', function($scope, database) {
    $scope.tags = [];
    $scope.$on('tags', function(e, tags) {
      var colors = d3.scale.category10();
      tags.forEach(function(t, i) { t.enabled = true; t.color = {background: colors(i)}; });
      $scope.tags = tags;
      $scope.$digest();
    });

    $scope.upload = function(data) {
      var packet = {
        date: $scope.datapoint.date,
        values: $scope.tags.map(function(t) { return { tagid: t.tagid, val: t.value }; })
      }

      database.upload(packet);
      console.log($scope.tags);
    }
    $scope.reset = function() {
      $scope.datapoint = { date: new Date() };
    }

    $scope.reset();
  }])
  .directive('datapointSlider', function() {
    return {
      templateUrl: 'datapoints-slider.html'
    };
  });


statModule
  .controller('DataGraph', ['database', '$scope', function(database, $scope) {
    var tagToLine = {};
    var colors = d3.scale.category10();

    var line = d3.svg.line()
      .x(function(d) { return $scope.graphTime(sqlDateFormat.parse(d.date)); })
      .y(function(d) { return $scope.graphValue(parseInt(d.val)); })
      .interpolate('basis');

    // process tag events [{tag, tagid},...]
    $scope.$on('tags', function(e, tags) {

      var paths = $scope.lines.selectAll('path').data(tags);
      paths.enter().append('path')
        .classed('line', true)
        .style('stroke', function(d, i) { return colors(i); })
        .style('stroke-width', function(d, i) { return 6-i; });
      paths.exit().remove();
      paths.each(function(d) { tagToLine[d.tagid] = this; });

      database.getData();
    });

    // process data events [{date, val, tagid},...]
    $scope.$on('data', function(e, data) {

      Object.keys(tagToLine).forEach(function(tagidstr) {
        var tagid = parseInt(tagidstr);
        // TODO: figure out unique tags here
        var tagPoints = data.filter(function(d) { return d.tagid === tagid; });

        // update each line data to use the new points
        d3.select(tagToLine[tagid])
          .attr('d', line(tagPoints));
      });
    });

  }])
  .directive('myDataGraph', ['database', 'startDate', 'endDate',
  function(database, startDate, endDate) {
    return {
      link: function (scope, element) {
        var width = 800;
        var height = 400;

        var svg = d3.select(element[0])
          .attr("width", width)
          .attr("height", height);

        // lines
        scope.lines = svg.append("g");

        scope.graphValue = d3.scale.linear()
          .domain([0, 100])
          .range([height-35, 10]);

        scope.graphTime = d3.time.scale()
          .domain([startDate, endDate])
          .range([50, width-50]);

        // build the time axis
        var xAxis = d3.svg.axis()
          .scale(scope.graphTime)
          .ticks(d3.time.days, 1)
          .tickSize(0);
        svg.append("g")
          .attr("transform", "translate(0, " + (height-30) + ")")
          .call(xAxis);

        // build the value axis
        var yAxis = d3.svg.axis()
          .scale(scope.graphValue)
          .orient('left')
          .ticks(10)
          .tickSize(width, 0);
        svg.append("g")
          .attr("transform", "translate(" + (width+40) + ",0)")
          .attr('class', 'y axis')
          .call(yAxis);

        // initialize graph
        database.getTags();
      }
    };
  }]);
