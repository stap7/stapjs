var task = {
	
	start: function(){
		//add "Hello, World!" text and a "Press Me" button to user display
		task.updateUI([ "Hello, World!", {"@Press Me":false} ]);
	},
	
	userAction: function([time,element,value]){
		if(element=='Press Me'){
			//when user presses the button, clear screen and add "You pressed the button!" text
			task.updateUI(null);
			task.updateUI([ "You pressed the button!" ]);
			//exit gracefully
			task.end();
		}
	}
	
	//the 2 functions defined above -- task.start() and task.userAction() --
	//	are expected by user-side software, so make sure you don't change their names
	//
	//the 2 functions being called that are NOT defined above -- task.updateUI() and task.end() --
	//	are defined by user-side software, so don't worry about them
}
