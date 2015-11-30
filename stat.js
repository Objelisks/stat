var statModule = angular.module('stat', []);

statModule.value('startDate', d3.time.day.offset(new Date(), -7));
statModule.value('endDate', d3.time.day(new Date()));

statModule.factory('database', ['startDate', 'endDate', function(startDate, endDate) {
  var connection = io('http://localhost:8080');
  var sqlDateFormat = d3.time.format("%Y-%m-%d");

  connection.on('message', function(msg) {
    console.log(msg);
    if(msg.type !== 'results') return;
  });

  var getData = function() {
    console.log('send');
    connection.send({
      type: 'get',
      start: sqlDateFormat(startDate),
      end: sqlDateFormat(endDate)
    });
  };

  var uploadData = function(data) {
    connection.send({
      type: 'update',
      data: data
    });
  };

  console.log('ready', sqlDateFormat(startDate), sqlDateFormat(endDate));
  connection.on('connect', function() {
    console.log('connect');
    getData();
  });

  return {
    'get': getData,
    'upload':uploadData
  }
}]);

statModule.controller('DataBuilder', ['$scope', 'database', function($scope, database) {
    $scope.upload = function(data) {
      database.upload(data);
    }
    $scope.reset = function() {
      $scope.datapoint = {};
    }

    $scope.reset();
}]);

statModule
  .controller('DataGraph', [function() {
  }])
  .directive('myDataGraph', ['startDate', 'endDate', function(startDate, endDate) {
    return {
      link: function (scope, element) {
        var width = 800;
        var height = 400;

        var svg = d3.select(element[0])
          .attr("width", width)
          .attr("height", height);

        var line = d3.svg.line();
        svg.append("g")
          .call(line);

        var axis = d3.svg.axis()
          .scale(d3.time.scale()
            .range([50, width-50])
            .domain([startDate, endDate]))
          .ticks(d3.time.days, 1);
        svg.append("g")
          .attr("transform", "translate(0, " + (height-30) + ")")
          .call(axis);
      }
    };
  }]);
