# stapjs
JS library for STAP

<html><head>
<script src="https://cdn.jsdelivr.net/gh/stap7/stapjs@7.16/stap.min.js"></script>
<script src="1stGradeMath.js"></script>
</head><body></body></html>


        <html><head><script src="https://cdn.jsdelivr.net/gh/stap7/stapjs/stap.min.js"></script><script>
        var task = {
            start: function(){
                task.show([ "Hello, World!" ]);
            }
        }
        </script></head><body></body></html>


<img src="https://stap.github.io/img/stap-icon.png" width=250 align=right>
STAP (Simple Task-Actor Protocol) is a machine-readable format for specifying user-interface changes. 

More details on STAP may be found at https://github.com/stap7/stap

stapjs is a javascript library for interpreting STAP messages and displaying them in a web-browser.

Sample tasks that employ stapjs may be found at https://github.com/stap7/stap/tree/master/tasks


## If you are referencing stapjs from your webpage, you can use jsdelivr CDN:

### use this during development

* https://cdn.jsdelivr.net/gh/stap7/stapjs/stap.js

or minified

* https://cdn.jsdelivr.net/gh/stap7/stapjs/stap.min.js

### use a specific version reference in production (to make sure your code remains stable)

* https://cdn.jsdelivr.net/gh/stap7/stapjs@7.16/stap.js

or minified

* https://cdn.jsdelivr.net/gh/stap7/stapjs@7.16/stap.min.js
