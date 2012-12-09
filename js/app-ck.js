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
*////////////////
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

*/var theData=new Lawnchair("Todos"),app=angular.module("todo",[]);app.directive("ngBlur",function(){return function(e,t,n){t.bind("blur",function(){e.$apply(n.ngBlur)})}});app.controller("TodoCtrl",function(e,t,n,r){var i=0;e.todos=[{name:"Attends, ça charge...",completed:!1,key:0}];theData.get("i",function(t){t?i=t.i:alert("Aucune tâche trouvée !");t={key:"i",i:i};theData.save(t);var n=new Array;for(var r=1;r<=i;r++)theData.get(r+".0",function(t){try{n.push({name:t.name,completed:t.completed,key:t.key});e.chargeTodos(n)}catch(r){}})});e.$watch("todos",function(n){e.remaining=t(e.todos,{completed:!1}).length;e.allchecked=!e.remaining},!0);r.path()==""&&r.path("/");e.location=r;e.$watch("location.path()",function(t){e.statusFilter=t=="/active"?{completed:!1}:t=="/done"?{completed:!0}:null});e.chargeTodos=function(t){e.todos=t;console.log(t);e.$digest()};e.updateTodo=function(t){theData.save(e.todos[t]);console.log(e.todos[t])};e.editTodo=function(e){e.editing=!1;theData.save(e)};e.removeTodo=function(t){theData.remove(e.todos[t].key);e.todos.splice(t,1)};e.addTodo=function(){i++;e.todos.push({name:e.newTodo,completed:!1,key:i});var t=document.getElementById("new-todo").value,n={key:i,name:e.newTodo,completed:!1};theData.save(n);var r={key:"i",i:i};theData.save(r);e.newTodo=""};e.checkAllTodos=function(t){e.todos.forEach(function(e){e.completed=t})}});