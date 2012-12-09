/*
var theData = new Lawnchair('settings');

function displayMessage(theMessage) {
	document.getElementById('theMessage').innerHTML = theMessage;
}

function doSave() {
	// Retrieve the values from the form elements
	theUsername = document.getElementById('Username').value;
	thePassword = document.getElementById('Password').value;
	theAge = document.getElementById('Age').value;
	
	// Construct an object with them
	var theSettings = {key:'settings', Username:theUsername, Password:thePassword, Age:theAge};
	
	// Send them to the data store
	theData.save(theSettings);
	
	displayMessage("Saved!");
}

function doRecall() {
	// Call the get function, giving it the key we used to save with and a return function to populate the form with the values of the object
	theData.get('settings',
		function(theSettings) {
			// Test we actually got a settings object
			if (theSettings) {
				// We did, so put the values in to the form fields
				document.getElementById('Username').value = theSettings.Username;
				document.getElementById('Password').value = theSettings.Password;
				document.getElementById('Age').value = theSettings.Age;
			} else {
				alert("No settings found!");
			}
		} // function(theSettings)
	);
	
	displayMessage("Recalled!");
}

function doDelete() {
	// Tell the data store to delete the record with a key of 'settings'
	theData.remove('settings');
	displayMessage("Deleted!");
}

function doNuke() {
	// Delete all records
	theData.nuke();
	displayMessage("Nuked!");
}
*/

///////////////
/*
var addEvent = (function () {
  if (document.addEventListener) {
    return function (el, type, fn) {
      if (el && el.nodeName || el === window) {
        el.addEventListener(type, fn, false);
      } else if (el && el.length) {
        for (var i = 0; i < el.length; i++) {
          addEvent(el[i], type, fn);
        }
      }
    };
  } else {
    return function (el, type, fn) {
      if (el && el.nodeName || el === window) {
        el.attachEvent('on' + type, function () { return fn.call(el, window.event); });
      } else if (el && el.length) {
        for (var i = 0; i < el.length; i++) {
          addEvent(el[i], type, fn);
        }
      }
    };
  }
})();


var editable = document.getElementsByTagName('label');

addEvent(editable, 'blur', function () {
  // lame that we're hooking the blur event
  localStorage.setItem('contenteditable', this.innerHTML);
  document.designMode = 'off';
});

addEvent(editable, 'focus', function () {
  document.designMode = 'on';
});

addEvent(document.getElementById('clear'), 'click', function () {
  localStorage.clear();
  window.location = window.location; // refresh
});

*/

var theData = new Lawnchair('Todos');


var app = angular.module('todo', []);

app.directive('ngBlur', function(){
	return function(scope, elem, attrs){
		elem.bind('blur', function(){
			scope.$apply(attrs.ngBlur);
		});
	};
});


app.controller('TodoCtrl', function($scope, filterFilter, $http, $location){

	var i = 0;

	$scope.todos =  [
		{"name": "Attends, ça charge...", "completed":false, "key":0}
	];

	//Recupération de i
	theData.get('i',
		function(iObj) {
			if (iObj) {
				i = iObj.i;
			} else {
				alert("Aucune tâche trouvée !");
			}
			iObj = {key:"i", "i":i};
			theData.save(iObj);

			//chargement
			var chargement=new Array();
			for (var a = 1; a <= i; a++) {
				theData.get(a+'.0',	function(theSettings){
					try{
						chargement.push({
							name:theSettings.name,
							completed:theSettings.completed,
							key:theSettings.key
						});
						$scope.chargeTodos(chargement);
					}catch(err){
						//return true;
					}
				} );
			}
		}
	);


	$scope.$watch('todos', function(e){
		$scope.remaining = filterFilter($scope.todos, {completed:false}).length;
		$scope.allchecked = !$scope.remaining;
	}, true);

	if($location.path() == ''){ $location.path('/')}
	$scope.location = $location;
	$scope.$watch('location.path()', function(path){
		$scope.statusFilter =
			(path == '/active') ? {completed : false} :
			(path == '/done') ? {completed : true} :
			null;
	});

	$scope.chargeTodos = function(data){
		$scope.todos = data;
		console.log(data);
		$scope.$digest();
	}

	$scope.updateTodo = function(index){
		theData.save($scope.todos[index]);
		console.log($scope.todos[index])
	};

	$scope.editTodo = function(todo){
		todo.editing = false;
		theData.save(todo);
	};

	$scope.removeTodo = function(index){

		theData.remove($scope.todos[index].key);
		$scope.todos.splice(index,1);
    
	};

	$scope.addTodo = function(){
		i++;
		$scope.todos.push({
			name:$scope.newTodo,
			completed:false,
			key:i
		});
		
		var theTodo = document.getElementById('new-todo').value;
	
		// Construct an object with them
		var theSettings = {key:i, name:$scope.newTodo, "completed":false};
		
		// Send them to the data store
		theData.save(theSettings);

		var iObj = {key:"i", "i":i};
		theData.save(iObj);
		$scope.newTodo = '';
	};

	$scope.checkAllTodos = function(allchecked){
		$scope.todos.forEach(function(todo){
			todo.completed = allchecked;
		});
	};
});
