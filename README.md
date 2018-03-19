# stapjs
JS library for STAP

        var task = {
            start: function(){
                task.updateUI([ "Hello, World!" ]);
            }
        }


<img src="https://raw.githubusercontent.com/vdv7/stap/master/pres/stap-icon.png" width=250 align=right>
STAP (Simple Task-Actor Protocol) is a machine-readable format for specifying user-interface changes. 

More details on STAP may be found at https://github.com/vdv7/stap

stapjs is a javascript library for interpreting STAP messages and displaying them in a web-browser.

Sample tasks that employ stapjs may be found at https://github.com/vdv7/stap/tree/master/tasks/js


## If you are referencing stapjs from your webpage,

### use this during development

* https://rawgit.com/vdv7/stapjs/master/stap.js

### use a specific branch reference in production (to make sure your code is stable)

* https://cdn.rawgit.com/vdv7/stapjs/BRANCH-ID/stap.js

