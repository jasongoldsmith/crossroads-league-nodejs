angular.module('datamanager', ['ngRoute', 'auth']).controller('activityController',
		function($scope,$http, $uibModal) {
				$scope.$emit('LOAD')
				$scope.code = null;
				$scope.response = null;
				$scope.data = null;
				$scope.reportList = null;

				$http({method: 'GET', url: '/api/v1/activity/listAll'}).
				then(function(response) {
					console.log("activity list::"+response.data);
					$scope.status = response.status;
					$scope.activityList = response.data;
					$scope.$emit('UNLOAD')
				}, function(response) {
					$scope.data = response.data || "Request failed";
					$scope.status = response.status;
					$scope.$emit('UNLOAD')
				});

			$scope.getSchema = function(schemaType,objectName){

				var userSchema = {
					editorSchema:[{lable:objectName+"._id",model:objectName+"._id"},
						{lable:objectName+".userName",model:objectName+".userName"},
						{lable:objectName+".imageUrl",model:objectName+".imageUrl"},
						{lable:objectName+".consoles._id",model:objectName+".consoles._id"},
						{lable:objectName+".consoles.consoleType",model:objectName+".consoles.consoleType"}
					],
					tableSchema:[{lable:"Id",model:objectName+"._id"},
						{lable:"UserName",model:objectName+".userName"},
						{lable:"ImageUrl",model:objectName+".imageUrl"},
						{lable:"Console Type",model:objectName+".consoles.consoleType"}
					]
				}

				if(schemaType == "userSchema") return userSchema;
				else return {}
			}

			$scope.animationsEnabled = true;

			$scope.updateActivity = function (activityId,activity) {
				var modalInstance = $uibModal.open({
					animation: $scope.animationsEnabled,
					templateUrl: 'editActivityDetail.html',
					controller: 'ModalInstanceCtrl',
					size: 'lg',
					resolve: {
						items: activity
					}
				});

				modalInstance.result.then(function (activityDetails) {
					activity = activityDetails
				}, function () {
				});
			};

			$scope.toggleAnimation = function () {
				$scope.animationsEnabled = !$scope.animationsEnabled;
			};
		}
		).controller('userController',
				function($scope, $route, auth){

				}
		);


angular.module('datamanager').controller('ModalInstanceCtrl', function ($scope, $http, $compile, $window, $uibModalInstance, items) {

	$scope.activityDetails = items;

	$scope.ok = function () {
		$uibModalInstance.close();
	};

	$scope.updateActivity = function (){
		var activityObj = $scope.activityDetails
		activityObj.id = $scope.activityDetails._id

		if($scope.activityDetails.modifiers && $scope.activityDetails.modifiers != "")
			activityObj.modifiers = $scope.activityDetails.modifiers.split(',')
/*		var activityObj = {
			id:$scope.activityDetails._id,
			aType: $scope.activityDetails.aType,
			aSubType: $scope.activityDetails.aSubType,
			aCheckpoint: $scope.activityDetails.aCheckpoint,
			aDifficulty: $scope.activityDetails.aDifficulty,
			aLevel: $scope.activityDetails.aLevel,
			aIconUrl: $scope.activityDetails.aIconUrl,
			aLight: $scope.activityDetails.aLight,
			minPlayers: $scope.activityDetails.minPlayers,
			maxPlayers: $scope.activityDetails.maxPlayers,
			isActive: $scope.activityDetails.isActive,
			isFeatured: $scope.activityDetails.isFeatured,
			adCard: {
				isAdCard: $scope.activityDetails.adCard.isAdCard,
				adCardBaseUrl: $scope.activityDetails.adCard.adCardBaseUrl,
						adCardImagePath: $scope.activityDetails.adCard.adCardImagePath,
						adCardHeader: $scope.activityDetails.adCard.adCardHeader,
						adCardSubHeader: $scope.activityDetails.adCard.adCardSubHeader,
			},
			location: $scope.activityDetails.location
		}*/
		console.log("updated activity::"+JSON.stringify(activityObj))
		var headers = {"Content-Type":"application/json"};
		$http({method: "POST", url: "/api/v1/activity/update", data:activityObj, config: headers}).
		then(function(response) {
			console.log('updated activity'+JSON.stringify(response.data))
			$scope.status = response.status;
			$uibModalInstance.close($scope.activityDetails);
		}, function(response) {
			$scope.data = response.data || "Request failed";
			$scope.status = response.status;
		});
	};

	$scope.cancel = function () {
		$uibModalInstance.dismiss('cancel');
	};

});