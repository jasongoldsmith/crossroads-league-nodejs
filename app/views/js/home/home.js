angular.module('home', []).controller('home', function($scope, $http) {
	$http.get('/api/v1/auth/bo/user/').success(function(data) {
		$scope.user = data.authId;
	});
});