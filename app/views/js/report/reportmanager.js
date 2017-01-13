angular.module('reportManager', ['ngAnimate', 'ui.bootstrap']).controller('reportManager',
	function($scope, $rootScope, $http, $location, $uibModal) {
		$scope.$emit('LOAD')
	    $scope.code = null;
	    $scope.response = null;
	    $scope.data = null;
		$scope.reportList = null;

	    $http({method: 'GET', url: '/api/v1/a/report/list?status=unresolved'}).
	      then(function(response) {
	    	console.log("report list::"+response.data);
	        $scope.status = response.status;
	        $scope.reportList = response.data;
	        $scope.$emit('UNLOAD')
	      }, function(response) {
	        $scope.data = response.data || "Request failed";
	        $scope.status = response.status;
	        $scope.$emit('UNLOAD')
	    });
	    
	    $scope.animationsEnabled = true;

			$scope.updateReport = function(reportId, report){
				var headers = {"Content-Type":"application/json"};

				$http({method: "POST", url: "/api/v1/a/report/resolve", data:report, config: headers}).
				then(function(response) {
					$scope.status = response.status;
					if(response.data.reportStatus == "resolved") {
						var idx = $scope.reportList.indexOf(report)
						console.log("idx = " + idx)
						$scope.reportList.splice(idx, 1);
					}
				}, function(response) {
					$scope.data = response.data || "Request failed";
					$scope.status = response.status;
					$scope.inputTrack3 = "Unable to update the offer"
				});
			};

	    $scope.openCustomerDetails = function (offerId,offer) {
	      var modalInstance = $uibModal.open({
	        animation: $scope.animationsEnabled,
	        templateUrl: 'myModalContent.html',
	        controller: 'ModalInstanceCtrl',
	        size: 'lg',
	        resolve: {
	          items: function () {
	            return $http.get('/api/v1/a/offer/'+offerId);
	          }
	        }
	      });

	      modalInstance.result.then(function (offerStatusUpdated) {
			  console.log("in result offerStatusUpdated="+offerStatusUpdated)
			  if(offerStatusUpdated == "Fulfilled") {
				  var idx = $scope.acceptedOffers.indexOf(offer)
				  console.log("idx = "+idx)
				  $scope.acceptedOffers.splice(idx, 1);
			  }else{
				  offer.offerStatus=offerStatusUpdated
			  }
	      }, function () {
	      });
	    };

	    $scope.toggleAnimation = function () {
			$scope.animationsEnabled = !$scope.animationsEnabled;
	    };
});

angular.module('reportManager').controller('ModalInstanceCtrl', function ($scope, $http, $compile, $window, $uibModalInstance, items) {
  
	$scope.offerDetails = items.data;
	
	console.log("cust oder data::"+items.data);
	
	$scope.ok = function () {
		$uibModalInstance.close();
	};

	$scope.updateOffer = function (){
		items.data.amazonOrderNum= $scope.inputOrder3
		items.data.trackingNum= $scope.inputTrack3
		//items.data.offerStatus="FulFilled"
		//console.log("updated offer "+JSON.stringify(items.data))
		//console.log("amazon offer::"+$scope.inputOrder3)
		var headers = {"Content-Type":"application/json"};
		$http({method: "POST", url: "/api/v1/a/offer/bo/save", data:items.data, config: headers}).
		then(function(response) {
			//console.log("response "+JSON.stringify(response.data))
			$scope.status = response.status;
			//$scope.inputTrack3 = response.data;
			console.log("response.data.offerStatus = "+response.data.offerStatus)
			$scope.offerStatusUpdated=response.data.offerStatus
			console.log("$scope.offerStatusUpdated="+$scope.offerStatusUpdated)
			$uibModalInstance.close(response.data.offerStatus);
		}, function(response) {
			$scope.data = response.data || "Request failed";
			$scope.status = response.status;
			$scope.inputTrack3 = "Unable to update the offer"
		});

	};

	$scope.cancel = function () {
		$uibModalInstance.dismiss('cancel');
	};

	$scope.openProductWindow = function(productId){
		console.log("opening product"+productId)
		$window.open("http://www.amazon.com/gp/product/"+productId)
	}

});