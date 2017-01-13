angular.module('metrics', ['ngAnimate', 'ui.bootstrap']).controller('metrics',
	function($scope, $rootScope, $http, $location, $uibModal, $filter){
		$scope.$emit('LOAD')

		$http({method: 'GET', url: '/api/v1/a/user/getMetrics'}).
		then(function(response) {
			console.log("report list::"+JSON.stringify(response.data));
			$scope.status = response.status;
			$scope.userMetricsList = response.data;
			$scope.statusList=["VERIFIED","INITIATED"]
			$scope.$emit('UNLOAD')
		}, function(response) {
			$scope.data = response.data || "Request failed";
			$scope.status = response.status;
			$scope.$emit('UNLOAD')
		})
	})