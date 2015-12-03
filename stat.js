var statModule = angular.module('stat', []);
var sqlDateFormat = d3.time.format("%Y-%m-%d");

statModule.factory('database', ['$rootScope', function($rootScope) {
  var connection = io('http://localhost:8081');

  $rootScope.startDate = d3.time.day.offset(new Date(), -7);
  $rootScope.endDate = d3.time.day(new Date());

  connection.on('message', function(msg) {
    // trigger angular event
    $rootScope.$broadcast(msg.type, msg.results);
  });

  var getData = function() {
    connection.send({
      type: 'data',
      start: sqlDateFormat($rootScope.startDate),
      end: sqlDateFormat($rootScope.endDate)
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
      date: data.date,
      values: data.values
    });
    setTimeout(getData, 500);
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
        date: sqlDateFormat($scope.datapoint.date),
        values: $scope.tags.map(function(t) { return { tagid: t.tagid, val: t.value }; })
      }

      database.upload(packet);
    }
    $scope.reset = function() {
      $scope.datapoint = { date: new Date() };
    }

    $scope.reset();
  }])
  .directive('datapointSlider', function() {
    return {
      templateUrl: 'datapoint-slider.html'
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
        .style('stroke-width', 2);
      paths.exit().remove();
      paths.each(function(d) { tagToLine[d.tagid] = this; });

      database.getData();
    });

    // process data events [{date, val, tagid},...]
    $scope.$on('data', function(e, data) {

      Object.keys(tagToLine).forEach(function(tagidstr) {
        var tagid = parseInt(tagidstr);
        var tagPoints = data.filter(function(d) { return d.tagid === tagid; });

        // update each line data to use the new points
        d3.select(tagToLine[tagid])
          .attr('d', line(tagPoints));
      });
    });

  }])
  .directive('myDataGraph', ['database', '$rootScope',
  function(database, $rootScope) {
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
          .domain([$rootScope.startDate, $rootScope.endDate])
          .range([50, width-50]);

        // build the time axis
        var xAxis = d3.svg.axis()
          .scale(scope.graphTime)
          .ticks(6)
          .tickSize(8, 0);
        var timeline = svg.append("g")
          .attr("transform", "translate(0, " + (height-30) + ")")
          .attr('class', 'x axis')
          .call(xAxis);

        // this gets called when the date range selector things get updated
        scope.updateDates = function() {
          console.log('updating dates', scope.startDate);
          $rootScope.startDate = scope.startDate;
          $rootScope.endDate = scope.endDate;

          scope.graphTime = scope.graphTime.domain([scope.startDate, scope.endDate]);
          xAxis = xAxis.scale(scope.graphTime);
          timeline = timeline.call(xAxis);

          database.getData();
        }

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
