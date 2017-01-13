(function(angular) {
  'use strict';
  var app = angular.module('travelerAdmin', ["ngRoute","auth","home","navigation","reportManager",
		"xeditable","angularUtils.directives.dirPagination","metrics","datamanager"])
    app.run(function(editableOptions) {
	  editableOptions.theme = 'bs3'; // bootstrap3 theme. Can be also 'bs2', 'default'
	});

//  app.run(function($rootScope, $templateCache) {
//	    $rootScope.$on('$routeChangeStart', function(event, next, current) {
//	        if (typeof(current) !== 'undefined'){
//	            $templateCache.remove(current.templateUrl);
//	        }
//	    });
//	});

  app.config(function($routeProvider, $httpProvider, $locationProvider) {
		console.log("setting up config::controllers");

		$locationProvider.html5Mode(true);

		$routeProvider.when('/', {
			templateUrl : 'js/report/reportList.html',
			controller : 'reportManager'
		}).when('/login', {
			templateUrl : 'js/navigation/login.html',
			controller : 'navigation'
		}).when('/report', {
			templateUrl : 'js/report/reportList.html',
			controller : 'reportManager'
		}).when('/metrics', {
			templateUrl : 'js/metrics/metrics.html',
			controller : 'metrics'
		}).when('/manageActivities',{
			templateUrl : 'js/datamanager/activityList.html',
			controller : 'activityController'
		}).otherwise('/');

		$httpProvider.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

	}).run(function(auth) {

		// Initialize auth module with the home page and login/logout path
		// respectively
		auth.init('/report', '/login', '/logout', 'metrics');
	});
 
  app.controller('appController',['$scope',function($scope){
		$scope.$on('LOAD',function(){$scope.loading=true});
		$scope.$on('UNLOAD',function(){$scope.loading=false});
	}]);
})(window.angular);