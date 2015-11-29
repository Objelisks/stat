var statModule = angular.module('stat', []);

statModule.factory('database', [function() {
  var connection = null;
  return {
    'get':null,
    'upload':function(data) {
      connection.send(data);
    }
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

statModule.controller('DataGraph', ['$scope', function($scope) {

}]);
