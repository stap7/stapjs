/*base template for STAP visualization
	
TODO:
	next:
		logging options (console, volunteerscience, function call or hook, url w params)
		clean up (e.g. get rid of unused helper functions)
	high priority:
	bugs:
		call onEdit after editable element has been updated (even tho it's from task-side)
		account for vertical progress bars for tics, clicks
		cancel one tween when starting a new one
		scroll:0 doesn't work on maindiv
	features:
		x of N number format
		options ., ins, @
		scrollH (including autoscroll)
		path options
		ani options
		esu
		table
	futureproof:
		account for multi-touch, e.g.
			two irrespective mouseups can occur which would mess with select:.5

*/

//////////////////////////////////////////////////////////////////////////////
// helper functions
location.params={};location.search.substr(1).split("&").forEach(function(a){var b=a.split("=");location.params[b[0]]=b[1]});
var EMPTYSET=new Set();
var HEAD = document.getElementsByTagName('head')[0];
var SELECTION = window.getSelection();
var RANGE = document.createRange();
function pass(){}
function self(o){return o;}
function round2(n,r){return (Math.round(n/r)*r);}
function ceil2(n,r){return (Math.ceil(n/r)*r);}
Date.prototype.toString=function(format){
	function twodigit(x){return x<10?'0'+x:x;}
	function threedigit(x){return x<10?'00'+x:(x<100?'0'+x:x);}
	var s="";
	if(format.includes("Y"))s+=this.getUTCFullYear();
	if(format.includes("M"))s+=(s.length?"-":"")+twodigit(this.getUTCMonth()+1);
	if(format.includes("D"))s+=(s.length?"-":"")+twodigit(this.getUTCDate());
	if(format.includes("d"))s+=(s.length?" ":"")+["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][this.getUTCDay()];
	if(format.includes("h"))s+=(s.length?" ":"")+twodigit(this.getUTCHours());
	if(format.includes("m"))s+=(s.length?(format.includes("h")?":":" "):"")+twodigit(this.getUTCMinutes());
	if(format.includes("s"))s+=(s.length?":":"")+twodigit(this.getUTCSeconds());
	if(format.includes("."))s+=(s.length?".":"")+threedigit(this.getUTCMilliseconds());
	return s;
};
if(String.prototype.startsWith===undefined)String.prototype.startsWith=function(prefix){return this.slice(0,prefix.length)===prefix;};
if(String.prototype.endsWith===undefined)String.prototype.endsWith=function(suffix){return this.slice(this.length-suffix.length)===suffix;};
String.prototype.replaceAll=function(search,replacement){return this.split(search).join(replacement);};
function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
  var angleInRadians = (angleInDegrees-90) * Math.PI / 180.0;
  return {
	x: centerX + (radius * Math.cos(angleInRadians)),
	y: centerY + (radius * Math.sin(angleInRadians))
  };
}
function describeArc(x, y, radius, startAngle, endAngle, start){
	var startingPt = polarToCartesian(x, y, radius, endAngle);
	var endingPt = polarToCartesian(x, y, radius, startAngle);
	var arcSweep = endAngle - startAngle <= 180 ? "0" : "1";
	var d = [
		start?"M":"L", startingPt.x, startingPt.y, 
		"A", radius, radius, 0, arcSweep, 0, endingPt.x, endingPt.y
	].join(" ");
	return d+' ';       
}
function objectify(o){
	var r={};
	for(var key in o)
		if(typeof(o[key])=='object')r[key]=objectify(o[key]);
		else r[key]=o[key];
	return r;
}
function select(e){
	RANGE.selectNodeContents(e);
	SELECTION.removeAllRanges();
	SELECTION.addRange(RANGE);
}
function inHead(type,thing,url){
	var x=document.getElementsByTagName(type);
	for(var i=0;i<x.length;++i){
		if(x[i][thing]==url)return true;
	}
}
function load(urls, callback, onerror, type){
	var url, onload, fileref;
	if(urls.constructor===Array){url=urls[0];urls=urls.slice(1);}
	else{url=urls;urls=[];}
	if(urls.length)onload=function(){load(urls,callback,onerror,type);};
	else onload=callback||pass;
	if(url && (url.endsWith(".js")||type==='js') && !inHead('script','src',url)){       //if filename is a external JavaScript file
		fileref=document.createElement('script');
		fileref.setAttribute("type","text/javascript");
		fileref.setAttribute("src", url);
	}else if(url && (url.endsWith(".css")||type==='css') && !inHead('link','href',url)){ //if filename is an external CSS file
		fileref=document.createElement("link");
		fileref.setAttribute("rel", "stylesheet");
		fileref.setAttribute("type", "text/css");
		fileref.setAttribute("href", url);
	}else{
		try{eval(url);}
		catch(e){
			console.log('Not sure how to handle '+url+'.\nWill try to add as <style>...');
			fileref=document.createElement("style");
			HEAD.appendChild(fileref);
		}
		onload();
		return;
	}
	fileref.onreadystatechange=onload;
	fileref.onload=onload;
	fileref.onerror=onerror||pass;
	HEAD.appendChild(fileref);
}
function isObj(o){return Object.prototype.toString.call(o)==="[object Object]";}
function getElementIndex(c){
	var i = 0;
	while( (c = c.previousSibling) != null ) ++i;
	return i;
}
var SVGNS="http://www.w3.org/2000/svg";
function keepNumeric(e){
	var numtxt=e.target.innerText.match(/-?\.?\d+.*/)[0];
	e.target.innerText=parseFloat(numtxt)+(numtxt.endsWith('.')?'.':'');
}
//////////////////////////////////////////////////////////////////////////////


var task={},recv,ws;



function connectToTaskScript(){
	//	connect gui.action to task.userAction
	if(task.onUserAction)gui.action = task.onUserAction;
	else if(task.userAction)gui.action = task.userAction;
	//	connect task.updateUI to gui.update;
	task.updateUI = gui.update;
	//	define task.end
	task.end=pass;
	//	start task
	gui.onTaskConnect();
	if(task.start)task.start();
}

function connectToTaskHTTP(){
	
	function urlWithQuery(url){
		var i=url.indexOf('?');
		if(i===-1)return url+'?callback=recv&';
		if(i===url.length-1 || url.endsWith('&'))return url+'callback=recv&';
		return url+'&callback=recv&';
	}

	gui.action = function(data){
		var msg=JSON.stringify(data);
		console.log('<- '+msg);
		var s=document.createElement('script');
		s.src=task.location+'d='+encodeURIComponent(msg)+(typeof(state)==='undefined'?'':('&s='+encodeURIComponent(state)));
		s.onerror=function(e){console.log("Error loading "+task.location,e)}
		if(HEAD._taskscript){
			s.onload=function(){
				HEAD.removeChild(s);
			};
		}else{  //first message
			HEAD._taskscript=true;
			s.onload=function(){
				HEAD.removeChild(s);
				//check if task code is client-side 
				if(task.onUserAction || task.userAction){
					connectToTaskScript();
				}
			};
		}
		HEAD.appendChild(s);
	}
	
	recv = function(data){
		console.log('-> ',data);
		try{								//redirect
			var url=new URL(data);
			task.location=urlWithQuery(url.origin+url.pathname);
			gui.onTaskConnect();
		}catch(e){							//parse task message
			gui.update(data);
		}
	}

	task.location=urlWithQuery(task.location);
	gui.onTaskConnect();

}

function connectToTaskWS(){
	if("WebSocket" in window){
		gui.action = function(data){
			var msg=JSON.stringify(data);
			console.log('<- '+msg);
			ws.send(msg);
		}
		ws=new window.WebSocket(task.location);
		ws.onerror=function(e){gui.update(null);gui.update({'error':'Cannot establish connection to '+task.location});};
		ws.onopen=gui.onTaskConnect;
		ws.onclose=function(event){
			var reason;
			// See http://tools.ietf.org/html/rfc6455#section-7.4.1
			if (event.code == 1000)
				reason = "";
			else if(event.code == 1001)
				reason = "An endpoint is \"going away\", such as a server going down or a browser having navigated away from a page.";
			else if(event.code == 1002)
				reason = "An endpoint is terminating the connection due to a protocol error";
			else if(event.code == 1003)
				reason = "An endpoint is terminating the connection because it has received a type of data it cannot accept (e.g., an endpoint that understands only text data MAY send this if it receives a binary message).";
			else if(event.code == 1004)
				reason = "Reserved. The specific meaning might be defined in the future.";
			else if(event.code == 1005)
				reason = "No status code was actually present.";
			else if(event.code == 1006)
			   reason = "The connection was closed abnormally, e.g., without sending or receiving a Close control frame";
			else if(event.code == 1007)
				reason = "An endpoint is terminating the connection because it has received data within a message that was not consistent with the type of the message (e.g., non-UTF-8 [http://tools.ietf.org/html/rfc3629] data within a text message).";
			else if(event.code == 1008)
				reason = "An endpoint is terminating the connection because it has received a message that \"violates its policy\". This reason is given either if there is no other sutible reason, or if there is a need to hide specific details about the policy.";
			else if(event.code == 1009)
			   reason = "An endpoint is terminating the connection because it has received a message that is too big for it to process.";
			else if(event.code == 1010) // Note that this status code is not used by the server, because it can fail the WebSocket handshake instead.
				reason = "An endpoint (client) is terminating the connection because it has expected the server to negotiate one or more extension, but the server didn't return them in the response message of the WebSocket handshake. <br /> Specifically, the extensions that are needed are: " + event.reason;
			else if(event.code == 1011)
				reason = "A server is terminating the connection because it encountered an unexpected condition that prevented it from fulfilling the request.";
			else if(event.code == 1015)
				reason = "The connection was closed due to a failure to perform a TLS handshake (e.g., the server certificate can't be verified).";
			else
				reason = "Unknown reason";
			console.log('Connection closed. '+reason);
			//gui.update({'error':'Connection closed. '+reason});
			//gui.update(['Connection closed.']);
		};
		ws.onmessage=function(msg){
			console.log('-> '+msg.data);
			gui.update(JSON.parse(msg.data));
		};
	}else{
		gui.update(null);
		gui.update([{'@Error':'Your browser does not support websockets. Please use a modern browser to run this application.'}]);
	}
}



var gui=(function(){

	//////////////////////////////////////////////////////////////////////////////
	// constants
	var STAPCSS = "https://rawgit.com/vdv7/stapjs/master/stap.css";
	// var STAPCSS = "stapjs/stap.css";
	var OPTIONS=new Set([".","S","T","R","onsubedit","patronym"]),
		TYPES=new Set([]);

	var REQUIRED={
		"T":[
			"https://cdnjs.cloudflare.com/ajax/libs/gsap/1.19.0/TweenLite.min.js",
			// "https://cdnjs.cloudflare.com/ajax/libs/gsap/1.19.0/plugins/AttrPlugin.min.js",
			// "https://cdnjs.cloudflare.com/ajax/libs/gsap/1.19.0/plugins/CSSPlugin.min.js",
			"https://cdnjs.cloudflare.com/ajax/libs/gsap/1.19.0/plugins/ColorPropsPlugin.min.js",
			"https://cdnjs.cloudflare.com/ajax/libs/gsap/1.19.0/plugins/TextPlugin.min.js",
			"TweenLite.defaultEase = Linear.easeNone;"
		],
		"ease":"https://cdnjs.cloudflare.com/ajax/libs/gsap/1.19.0/easing/EasePack.min.js",
		"easeout":"https://cdnjs.cloudflare.com/ajax/libs/gsap/1.19.0/easing/EasePack.min.js",
		"pwd":"https://cdnjs.cloudflare.com/ajax/libs/js-sha256/0.3.2/sha256.min.js",
	};

	var ANIMATABLE={'x':'left','y':'top','w':'width','h':'height','r':'borderRadius','bg':'backgroundColor','bd':'borderStyle','bdw':'borderWidth','bdc':'borderColor','pad':'padding','col':'color','rot':'rotation'};

	var COMPATIBLE=new Proxy({
			path:new Set(['string','object']),
			table:new Set(['object']),
		},
		{get:function(t,key){
			return (key in t)?t[key]:EMPTYSET;
		}});

	var COLOROPTIONS=new Set(['bg','col','bdc']);

	var EASE={0:'Power0',1:'Power1',2:'Power2',3:'Power3',4:'Power4',back:'Back',elastic:'Elastic',bounce:'Bounce'};


	//////////////////////////////////////////////////////////////////////////////
	// vars
	var startTime,maindiv,ipAddress,markerdefs,stylesheet,tables=0,focused=false,
		taskOptions={},msgTimeouts={},txtReplace={},
		updateContainers=new Set();


	//////////////////////////////////////////////////////////////////////////////
	// for client:ip option
	function gotip(o){
		ipAddress=o.ip;
		sendAction(0,{client:{ip:ipAddress}});
	}

	//////////////////////////////////////////////////////////////////////////////
	// for replace option
	function replaceShorthand(s){
		for(var shorthand in txtReplace){
			s=s.replaceAll(shorthand,txtReplace[shorthand]);
		}
		return s;
	}

	//////////////////////////////////////////////////////////////////////////////
	// for S option
	function waitTime(t){return t-ums();}

	//////////////////////////////////////////////////////////////////////////////
	// for T option
	function getEaseSpec(options){
		var easeSpec=Linear.easeNone;
		if(typeof(options)==='object'){
			var ease=Linear;
			if(options.ease)ease=window[EASE[options.ease]];
			if(options.easeout==-1)easeSpec=ease.easeIn;
			else if(options.easeout==0)easeSpec=ease.easeInOut;
			else easeSpec=ease.easeOut;
		}
		return easeSpec;
	}

	//////////////////////////////////////////////////////////////////////////////
	// for arrow option (path elements)
	function initMarkers(){	//create marker definitions
		var style = document.createElement("style");
		style.appendChild(document.createTextNode(""));// WebKit hack
		document.head.appendChild(style);
		markerdefs=document.body.appendChild(document.createElementNS(SVGNS,'svg')).appendChild(document.createElementNS(SVGNS,'defs'));
		markerdefs.parentElement.style.height='0px';
	}

	function getMarker(type,color){
		var id,d;
		if(type==='arrow' || type==='circle' || type==='square'){
			if(!markerdefs)initMarkers();
			id='marker.'+type+'.'+color;
			if(!document.getElementById(id)){
				var m=markerdefs.appendChild(document.createElementNS(SVGNS,'marker'));
				m.id=id;
				m.setAttribute('orient','auto');
				m.setAttribute('markerUnits','strokeWidth');
				m.setAttribute('refX','1');
				if(type==='arrow'){
					m.setAttribute('viewBox','0 0 10 10');
					m.setAttribute('refY','5');
					m.setAttribute('markerWidth','4');
					m.setAttribute('markerHeight','3');
					d=m.appendChild(document.createElementNS(SVGNS,'path'));
					d.setAttribute('d',"M 0 0 L 10 5 L 0 10 z");
				}else{
					m.setAttribute('refY','1');
					m.setAttribute('markerWidth','2');
					m.setAttribute('markerHeight','2');
					if(type==='square'){
						d=m.appendChild(document.createElementNS(SVGNS,'rect'));
						d.setAttribute('x','0');
						d.setAttribute('y','0');
						d.setAttribute('width','2');
						d.setAttribute('height','2');
					}else if(type==='circle'){
						d=m.appendChild(document.createElementNS(SVGNS,'circle'));
						d.setAttribute('cx','1');
						d.setAttribute('cy','1');
						d.setAttribute('r','1');
					}
				}
				d.setAttribute('fill',color);
			}
			id='url(#'+id+')';
		}
		else id='';
		return id;
	}

	//////////////////////////////////////////////////////////////////////////////
	// for min/max option display (numeric elements)
	progressbar={
		percent:function(c,v){
			return (100*(v-c._prop.minval)/(c._prop.maxval-c._prop.minval))+'%';
		},
		init:function(c){
			if(!c._progressbar){	//add progressbar
				//c._content.innerHTML="";
				c._content.classList.add("progress");
				c._progressbar=addDiv(c._content,["progressbar"]);
				// c._progressval=addDiv(c._content,["progressval"]);
				if(parseInt(c._content.offsetWidth)>parseInt(c._content.offsetHeight)){
					c._progressbar.style.height='100%';
					c._prop.display=function(){
						c._progressbar.style.width=progressbar.percent(c,c._value);
						c._prop.valueSpan.innerHTML=c._prop.fmt(c._value);
					}
				}else{
					c._progressbar.style.width='100%';
					c._progressval.style.setProperty('transform','rotate(270deg)');
					//c._progressval.style.setProperty('transform-origin','left top');
					c._prop.display=function(){
						c._progressbar.style.height=progressbar.percent(c,c._value);
						c._prop.valueSpan.innerHTML=c._prop.fmt(c._value);
					}
				}
				if(c._prop.eN)setOption.number.eN(c,c._prop.eN);
			}
			if(c._prop.rndval)progressbar.maketics(c);
		},
		getValue:function(e){
			var rect=this.getBoundingClientRect();
			var c=this.parentElement;
			var v=c._prop.minval+(c._prop.maxval-c._prop.minval)*(e.pageX-rect.left)/rect.width;
			c._setValue(c._prop.rndval?ceil2(v,c._prop.rndval):v);
			sendAction(c,c._value);
		},
		maketics:function(c){
			//instead of changing bg size, maybe i can change the following:
			//	background: repeating-linear-gradient(to left, gray, gray 1px, white 1px, white 10%);
			// if(isChrome && getComputedStyle(c).getPropertyValue('box-sizing')!=='content-box')
				// c._content.style.backgroundSize="calc("+progressbar.percent(c,c._prop.rndval+c._prop.minval)+" + 1px) 1px";
			// else
				// c._content.style.backgroundSize=progressbar.percent(c,c._prop.rndval+c._prop.minval)+" 1px";
			//c._prop.rnd=function(){c._value=round2(c._value,v);};
			c._content.style.background="repeating-linear-gradient(to left, gray, gray 1px, white 2px, white "+progressbar.percent(c,c._prop.rndval+c._prop.minval)+")";
		},
		removetics:function(c){
			c._content.style.backgroundSize="0px 0px";
		},
		destroy:function(c){
			if(c._progressbar){
				progressbar.removetics(c);
				c._progressbar.remove();
				c._content.classList.remove("progress");
				c._prop.display=function(){c._prop.valueSpan.innerHTML=c._prop.fmt(c._value);};
				c._progressbar=null;
			}
		}
	}


	//////////////////////////////////////////////////////////////////////////////

	function ums(){return (new Date()).getTime()-startTime;}
	
	function onEdit(element,elementid,parent){
		if(element._prop.onedit!==undefined){
			let val,opt;
			if(element._prop.onedit && element._prop.onedit.constructor===Array && element._prop.onedit[1].constructor===Object){
				val=element._prop.onedit[0];
				opt=element._prop.onedit[1];
			}else if(element._prop.onedit && element._prop.onedit.constructor===Object){
				opt=element._prop.onedit;
			}else{
				val=element._prop.onedit;
				opt={};
			}
			processElement(parent,elementid,val,opt,{});
		}
		if(parent._prop.onsubedit!==undefined){
			let val,opt;
			if(parent._prop.onsubedit && parent._prop.onsubedit.constructor===Array && parent._prop.onsubedit[1].constructor===Object){
				val=parent._prop.onsubedit[0];
				opt=parent._prop.onsubedit[1];
			}else if(parent._prop.onsubedit && parent._prop.onsubedit.constructor===Object){
				opt=parent._prop.onsubedit;
			}else{
				val=parent._prop.onsubedit;
				opt={};
			}
			processElement(parent._parentState,parent.id||getElementIndex(parent.parentElement),val,opt,{});
		}
	}
	
	function sendAction(element,val){
		if(typeof(element)==='object'){
			var elementid=element.id || element._getIndex(),
				parent=element._parentState;
			onEdit(element,elementid,parent);
			var fullname=[elementid];
			for(var i=0;parent!==maindiv && i<(element._prop.patronym||0);++i){
				fullname.push(parent.id || parent._getIndex());
				parent=parent._parentState;
			}
			gui.action([ums(),fullname.length>1?fullname:elementid,val]);
		}else{
			gui.action([ums(),element,val]);
			//gui.action([ums(),element.id || element,val]);
		} //TODO: figure out why element.id is in bottom clause, cause if it had a .id, wouldn't it be object, and thus in top clause?
		//	and check that getElementIndex gets called
	}

	var sendText={
		all:function(e){sendAction(e.target.parentElement,e.target.innerHTML);},
		pwd:function(e){
			var c=e.target.parentElement;
			sendAction(c,sha256(c._pwd+e.target.innerText));
		},
	}

	var sendEvent={
		e:function(c,v){return function(){sendAction(c,[v]);};},
		exy:function(c,v){return function(e){
			var rect=c._content.getBoundingClientRect();
			sendAction(c,[v,e.clientX-rect.left,e.clientY-rect.top]);
		};},
		ek:function(c,v){return function(e){sendAction(c,[v,e.keyCode]);};},
	};

	var EVENTS={
		30:['keypress',sendEvent.ek],
		31:['keydown',sendEvent.ek],
		32:['keyup',sendEvent.ek],
		40:['click',sendEvent.exy],
		41:['dblclick',sendEvent.exy],
		42:['mousedown',sendEvent.exy],
		43:['mouseup',sendEvent.exy],
		44:['mousemove',sendEvent.exy],
		45:['mouseenter',sendEvent.exy],
		46:['mouseleave',sendEvent.exy],
		47:['mouseover',sendEvent.exy],
		48:['mouseout',sendEvent.exy]
	};

	//////////////////////////////////////////////////////////////////////////////

	function addDiv(container,classes,type){
		var c=container.appendChild(document.createElement(type||'div'));
		for(var i=0;i<classes.length;++i)c.classList.add(classes[i].replace(/[^\w-_]/gi, '_'));
		return c;
	}

	function addElement(container,type,level,key){
		var c,cf,cs;
		if(container.parentElement._type==='table'){ //tableRow
			type='tableRow';
			c=addDiv(container,[type,'lvl_'+level,'id_'+key,'main'],'tr');
			c._frame=c;
			c._parentState=container.parentElement;
			c._realkey=key;
			if(typeof(key)==='string'){
				c.id=key;
				c._parentState._childmap[key]=c;
			}
			c._key=addDiv(c,[type,'lvl_'+level,'id_'+key,'key'],'td');
			c._content=c;
		}else{                                       //everything else
			if(container._type==='tableRow'){
				//type='tableCell';
				cf=addDiv(container,[type,'lvl_'+level,'id_'+key,'frame'],'td');
				cf._parentState=container;
			}else{
				cf=addDiv(container,[type,'lvl_'+level,'id_'+key,'frame']);
				cf._parentState=container.parentElement;
			}
			c=addDiv(cf,[type,'lvl_'+level,'id_'+key,'main']);
			cf._main=c;
			c._frame=cf;
			c._parentState=cf._parentState;
			c._realkey=key;
			if(typeof(key)==='string'){
				c.id=key;
				c._parentState._childmap[key]=c;
			}
			c._key=addDiv(c,[type,'lvl_'+level,'id_'+key,'key']);
			cs=addDiv(c,[type,'lvl_'+level,'id_'+key,'sep']);
			c._content=addDiv(c,[type,'lvl_'+level,'id_'+key,'content'],type==='table'?'table':'div');
		}
		c._main=c;
		c._type=type;
		c._level=level;
		c._childmap={};
		c._options={};
		c._prop={};
		c._setValue=setValue[type];
		// c._hide=function(){cf.style.visibility='hidden';};
		// c._unhide=function(){cf.style.visibility='visible';};
		c._getIndex=function(){
			return getElementIndex(c._frame);
		}
		c._clear=function(){
			c._content.innerHTML='';
			c._childmap={};
			// c._type=undefined;
			// c._options={};
			c._value=0;
			c._select=undefined;
			c._selected=undefined;
			c._prop.selectedDiv=undefined;
		};
		c._remove=function(){
			cf.parentElement.removeChild(cf);
			if(key in container.parentElement._childmap)delete container.parentElement._childmap[key];
			c._type=undefined;
		};
		c._changeType=function(type){
			c._clear();
			cf.classList.remove(c._type);
			c.classList.remove(c._type);
			c._key.classList.remove(c._type);
			cs.classList.remove(c._type);
			c._content.classList.remove(c._type);
			cf.classList.add(type);
			c.classList.add(type);
			c._key.classList.add(type);
			cs.classList.add(type);
			c._content.classList.add(type);
			c._type=type;
			c._setValue=setValue[type];
			initElement[type](c);
		};
		initElement[type](c);
		return c;
	}

	function processElement(parent,key,val,options){
		// console.log(parent,key,val,options);
		if(options.R&1)sendAction(key,{R:1});
		if(options.S){		//optional delay
			var delay=waitTime(options.S);
			delete options.S;
			setTimeout(function(){processElement(parent,key,val,options);},delay);
			return;
		}
		var child,typeofval,displaykey,optKey;
		if(typeof(key)==='number'){
			child=parent._content.children[key];	//find frame by numeric key
			if(child.classList.contains('frame'))child=child.children[0];		//get main div of child
		}else
			child=parent._childmap[key];
		if(val===null){							//remove element
			if(child)child._remove();
		}else{
			if(child===undefined){				//new element
				typeofval=options['type'];
				if(!typeofval){
					if(val===undefined){ //default behavior (maybe think this through for boxes that arent buttons)
						if(options.eT)val=""; // !!TODO: this was changed, should change it back or change stap.txt (currently specifying only options defaults to <<state>>)
						else if(options.eN)val=0;
						else val=[];
					} 
					typeofval=typeof(val);
				}
				child=addElement(parent._content,typeofval,parent._level+1,key);
				child._key.innerHTML=key||'';
				for(optKey in parent._prop)
					if(!(optKey in options))
						updateOption(child,optKey,parent._prop[optKey]);
			}else{								//edit element
				typeofval=options['type'] || ((val===undefined || val.constructor === Object)?'undefined':typeof(val));
				if(typeofval!=='undefined' && child._type!==typeofval && !COMPATIBLE[child._type].has(typeofval)){
					child._changeType(typeofval);
					var allOptions=Object.assign({},parent._prop,child._options);
					for(optKey in allOptions)
						if(!(optKey in options))
							updateOption(child,optKey,allOptions[optKey]);
				}
			}
			delete options.type;
			if(options.R&2)sendAction(key,{R:2});
			if(options.T){						//animation
				var animate=options.T,aniopt={},curopt={};
				delete options.T;
				//check which options an be animated
				for(optKey in options){
					if(optKey in ANIMATABLE){
						curopt[optKey]=child._options[optKey]||(COLOROPTIONS.has(optKey)?'rgba(0,0,0,0)':0);
						aniopt[optKey]=options[optKey];
						delete options[optKey];
					}
				}
				//animate options
				if(Object.keys(aniopt).length){
					aniopt.onUpdate=function(options){
						for(let optKey in options){
							child._options[optKey]=options[optKey];
							updateOption(child,optKey,options[optKey]);
						}
					};
					aniopt.onUpdateParams=[curopt];
					if(options.R&4){
						aniopt.onComplete=function(){sendAction(child,{R:4});};
						delete options.R;
					}
					TweenLite.to(curopt,animate,aniopt);
				}
				//animate value
				if(typeof(val)==='number'){
					let curopt={v:child._value};
					let aniopt={v:val,onUpdate:function(o){
							child._setValue(o.v);
						},onUpdateParams:[curopt]};
					val=undefined;
					if(options.R&4)aniopt.onComplete=function(){sendAction(child,{R:4});};
					TweenLite.to(curopt,animate,aniopt);
				}
			}
			Object.assign(child._options,options);
			for(optKey in options)
				updateOption(child,optKey,options[optKey]);
			if(val!==undefined)
				child._setValue(val);
			if(child._options.scroll&2)
				child._content.scrollTop=child._content.scrollHeight;
		}
	}

	function updateOption(child,option,value){
		(setOption.all[option]||setOption[child._type][option]||pass)(child,value);
	}

	initElement={
		object:pass,
		number:function(c){
			c._value=0;
			if(!c._prop.prefixSpan)c._prop.prefixSpan=c._content.appendChild(document.createElement('span'));
			if(!c._prop.valueSpan)c._prop.valueSpan=c._content.appendChild(document.createElement('span'));
			if(!c._prop.suffixSpan)c._prop.suffixSpan=c._content.appendChild(document.createElement('span'));
			if(!c._prop.min)c._prop.min=pass;
			if(!c._prop.max)c._prop.max=pass;
			if(!c._prop.rnd)c._prop.rnd=pass;
			if(!c._prop.fmt)c._prop.fmt=self;
			if(!c._prop.display)c._prop.display=function(){c._prop.valueSpan.innerHTML=c._prop.fmt(c._value);};
		},
		string:function(c){c._sendText=function(e){sendAction(e.target.parentElement,e.target.innerHTML);}},
		boolean:pass,
		table:pass,
		tableRow:pass,
		tableCell:pass,
		path:function(c){
			c._svg=c._content.appendChild(document.createElementNS(SVGNS,'svg'));
			c._path=c._svg.appendChild(document.createElementNS(SVGNS,'path'));
			c._path.setAttribute('stroke-width',1);
			c._path.setAttribute('stroke','black');
			c._path.setAttribute('fill','none');
		}
	}

	function spreadOptionsToChildren(t,optKey){
		return (optKey in t)?t[optKey]:
			function(c,v){
				c._prop[optKey]=v; //TODO: is this necessary? what for?
				var child;
				for(var i=0;i<c._content.childElementCount;++i){
					child=c._content.children[i]._main;
					if(child && child._options[optKey]===undefined){
						(setOption[child._type][optKey]||pass)(child,v);
					}
				}
			}
	}
	
	setOption={
		all:{
			e:function(c,v){
				if(v.constructor!==Array)v=[v];
				if(c._clearEvents)c._clearEvents();
				var functions=[];
				for(var i=0;i<v.length;++i){
					functions[i]=EVENTS[v[i]][1](c,v[i]);
					c._content.addEventListener(EVENTS[v[i]][0],functions[i]);
				}
				c._clearEvents=function(){
					for(var i=0;i<v.length;++i){
						c._content.removeEventListener(EVENTS[v[i]][0],functions[i]);
					}
				}
			},
			scroll:function(c,v){c._content.style.overflowY=v&1?'auto':null;},
			title:function(c,v){c._key.innerHTML=v===null?c._realkey:v;},
			emp:function(c,v){
				var i,e;
				if(c._prop.emp)
					for(i=0;i<c._prop.emp.toString().length;++i){
						e=10**i;
						c._content.classList.remove('emp'+(Math.floor(c._prop.emp/e)%10)*e);
					}
				c._prop.emp=v;
				for(i=0;i<v.toString().length;++i){
					e=10**i;
					c._content.classList.add('emp'+(Math.floor(v/e)%10)*e);
				}
			},
			bg:function(c,v){c._content.style.backgroundColor=v;},
			col:function(c,v){c._content.style.color=v;},
			fnt:function(c,v){c._content.style.font=v;},
			bd:function(c,v){c._content.style.borderStyle=v;},
			bdc:function(c,v){c._content.style.borderColor=v;},
			bdw:function(c,v){c._content.style.borderWidth=v;},
			pad:function(c,v){c._content.style.padding=v;},
			r:function(c,v){c._content.style.borderRadius=v+'px';},
			x:function(c,v){c._frame.style.left=v;},
			y:function(c,v){
				c._frame.style.top=v;
				if(v===null){
					c._frame.classList.remove('xy');
					c.classList.remove('xy');
				}else{
					c._frame.classList.add('xy');
					c.classList.add('xy');
				}
			},
			z:function(c,v){c._frame.style.zIndex=v;},
			w:function(c,v){c._content.style.width=v;},
			h:function(c,v){c._content.style.height=v;},
			rot:function(c,v){c._content.style.setProperty('transform','rotate('+v+'deg)');}
		},
		object:new Proxy({},{get:spreadOptionsToChildren}),
		number:{
			rnd:function(c,v){
				if(c._prop.rndval!==v){
					c._prop.rndval=v;
					if(v){
						c._prop.rnd=function(){c._value=round2(c._value,v);};
						if(c._progressbar)progressbar.maketics(c);
						updateContainers.add(c);
					}else{
						c._prop.rnd=pass;
						if(c._progressbar)progressbar.removetics(c);
					}
				}
			},
			'>=':function(c,v){
				if(c._prop.minval!==v){
					c._prop.minval=v;
					if(v!==null){
						c._prop.min=function(){if(c._value<v)c._value=v;};
						if(c._prop.max!==pass)
							progressbar.init(c);
						// else
							// c._prop.display=function(){c._content.innerHTML=c._prop.fmt(c._value);};
						updateContainers.add(c);
					}else{
						c._prop.min=pass;
						progressbar.destroy(c);
						// c._prop.display=function(){c._content.innerHTML=c._prop.fmt(c._value);};
						updateContainers.add(c);
					}
				}
			},
			'<=':function(c,v){
				if(c._prop.maxval!==v){
					c._prop.maxval=v;
					if(v!==null){
						c._prop.max=function(){if(c._value>v)c._value=v;};
						if(c._prop.min!==pass)
							progressbar.init(c);
						// else
							// //c._prop.
							// c._prop.display=function(){c._content.innerHTML=c._value+" of "+c._prop.fmt(c._prop.maxval);};
						//TODO: add n of X display to suffix -- maybe use fmt() to change suffix
						updateContainers.add(c);
					}else{
						c._prop.max=pass;
						progressbar.destroy(c);
						// c._prop.display=function(){c._content.innerHTML=c._prop.fmt(c._value);};
						updateContainers.add(c);
					}
				}
			},
			unit:function(c,v){
				var dollarsign=v.indexOf('$');
				if(dollarsign>-1){
					v=v.replace('$',' ').trim();
					c._prop.prefixSpan.innerHTML='$';
				}
				c._prop.suffixSpan.innerHTML=v;
			},
			time:function(c,v){
				if(v){
					c._prop.prefixSpan.innerHTML='';
					c._prop.suffixSpan.innerHTML='';
					c._prop.fmt=function(x){
						return new Date(x*1000).toString(v);
					};
				}else{
					c._prop.fmt=self;
				}
				updateContainers.add(c);
			},
			eN:function(c,v){
				//TODO: account for progressbar and x of n
				//	may be nice to have a sep div for value, and a sep div for styling (e.g. styling can be the progressbar or the "of N")
				//
				c._prop.eN=v;
				if(v&1 || v&2 || v&4){
					if(c._progressbar){
						c._prop.valueSpan.setAttribute('contenteditable',false);
						c._prop.valueSpan.removeEventListener("keyup", keepNumeric);
						c._prop.valueSpan.onkeypress=null;
						c._prop.valueSpan.onblur=null;
						c._prop.valueSpan.oninput=null;
						c._content.addEventListener('click',progressbar.getValue,false);
					}else{
						c._content.removeEventListener('click',progressbar.getValue,false);
						c._prop.valueSpan.setAttribute('contenteditable',true);
						if(!document.activeElement.getAttribute('contenteditable')){
							c._prop.valueSpan.focus();
							setTimeout(()=>{select(c._prop.valueSpan)},1);
						}
						c._prop.valueSpan.addEventListener("keyup", keepNumeric, false);
						if(v&1)c._prop.valueSpan.onkeypress=function(e){if(e.keyCode==13){sendAction(c,parseFloat(c._content.innerText));return false;}};
						else c._prop.valueSpan.onkeypress=null;
						if(v&2)c._prop.valueSpan.onblur=function(){sendAction(c,parseFloat(c._content.innerText));};
						else c._prop.valueSpan.onblur=null;
						if(v&4)c._prop.valueSpan.oninput=function(){sendAction(c,parseFloat(c._content.innerText));};
						else c._prop.valueSpan.oninput=null;
					}
				}else{
					c._content.setAttribute('contenteditable',false);
					c._content.removeEventListener("keyup", keepNumeric);
				}
			},
			onedit:function(c,v){c._prop.onedit=v;},
			patronym:function(c,v){c._prop.patronym=v;}
		},
		string:{
			eT:function(c,v){
				if(v&1 || v&2 || v&4){
					c._content.setAttribute('contenteditable',true);
					if(!document.activeElement.getAttribute('contenteditable'))c._content.focus()
					if(v&1){ //on enter
						c._content.onkeypress=function(e){if(e.keyCode==13){c._sendText(e);return false;}};
					}
					if(v&2){ //on blur
						c._content.onblur=this._sendText;
					}
					if(v&4){ //on any change
						//TODO: this will conflict with v&1, specifically in that enter key will be allowed
						c._content.oninput=this._sendText;
					}
				}else{
					c._content.setAttribute('contenteditable',false);
				}
			},
			pwd:function(c,v){
				if(v){
					this._sendText=function(e){
						sendAction(e.target.parentElement,sha256(v+e.target.innerText));
					}
				}else
					this._sendText=function(e){
						sendAction(e.target.parentElement,e.target.innerHTML);
					}
			},
			onedit:function(c,v){c._prop.onedit=v;},
			patronym:function(c,v){c._prop.patronym=v;}
		},
		boolean:{
			select:function(c,v){
				if(v==0){
					c.setAttribute('_select','0');
					c.setAttribute('onclick',null);
					c.onmousedown=function(){sendAction(c,true);};
					c.onmouseup=function(){sendAction(c,false);};
				}else if(v==1){
					c.setAttribute('_select','1');
					c._prop.selectContainer=c._parentState;
					if(c._options.select===undefined){
						while(c._prop.selectContainer._options.select===undefined){
							c._prop.selectContainer=c._prop.selectContainer._parentState;
						}
					}
					c._prop.selectContainer._prop.selectedDiv=undefined;
					if(c.getAttribute('_selected')==1)c.setAttribute('_selected',0);
					c.setAttribute('onmousedown',null);
					c.setAttribute('onmouseup',null);
					c.onclick=function(){
						if(c.getAttribute("_selected")==1){
							c.setAttribute("_selected",0);
							c._prop.selectContainer._prop.selectedDiv=undefined;
							sendAction(c,false);
						}else{
							c.setAttribute("_selected",1);
							if(c._prop.selectContainer._prop.selectedDiv!=undefined)
								c._prop.selectContainer._prop.selectedDiv.setAttribute("_selected",0);
							c._prop.selectContainer._prop.selectedDiv=c;
							sendAction(c,true);
						}
					}
				}else if(v==2){
					c.setAttribute('_select','2');
					c.setAttribute('onmousedown',null);
					c.setAttribute('onmouseup',null);
					c.onclick=function(){
						if(c.getAttribute("_selected")==1){
							c.setAttribute("_selected",0);
							sendAction(c,false);
						}else{
							c.setAttribute("_selected",1);
							sendAction(c,true);
						}
					}
				}else if(v==.5){
					c.setAttribute('_select','0.5');
				}else{
					c.setAttribute('_select','-1');
					c.setAttribute('onmousedown',null);
					c.setAttribute('onmouseup',null);
					c.onclick=function(){sendAction(c,true);};
				}
			},
			eB:function(c,v){
				if(v)c.classList.remove('disabled');
				else c.classList.add('disabled');
			},
			onedit:function(c,v){c._prop.onedit=v;},
			patronym:function(c,v){c._prop.patronym=v;}
		},
		path:{},
		table:new Proxy({
			head:function(c,v){
				c.setAttribute('_head',v);
			}
		},{get:spreadOptionsToChildren}),
		tableRow:new Proxy({},{get:spreadOptionsToChildren}),
		tableCell:new Proxy({},{get:spreadOptionsToChildren}),
	}

	setValue={
		object:function(data){
			var i,key,val,options;
			for(i=0;i<data.length;++i){
				key=undefined;
				val=undefined;
				options={};
				if(data[i].constructor===Object){	//get key,val,opt
					for(var k in data[i]){
						if(k.startsWith('@')){
							if(data[i][k].constructor!==Object)
								val=data[i][k];
							key=k.substr(1);
						}else if(!key && !val && k.startsWith('#')){
							if(!key && !val){
								if(data[i][k].constructor!==Object)
									val=data[i][k];
								key=parseInt(k.substr(1));
							}
						}else if(!key && !val && k.constructor===Number){
							if(data[i][k].constructor!==Object)
								val=data[i][k];
							key=k;
						}else options[k]=data[i][k];
					}
				}else{
					val=data[i];
				}
				// if(key===true){  wildcard key processing
					// for(key=this._content.childElementCount-1;key>=0;--key){
						// processElement(this,key,val,options);
					// }
				// }else{
					// processElement(this,key,val,options);
				// }
				processElement(this,key,val,options);
			}
			updateContainers.delete(this);
		},
		number:function(data){
			if(typeof(data)==='number')this._value=data;
			this._prop.min();
			this._prop.max();
			this._prop.rnd();
			this._prop.display();
			updateContainers.delete(this);
		},
		string:function(data){
			this._content.innerHTML=replaceShorthand(data);
			updateContainers.delete(this);
		},
		boolean:function(data){
			if(data===true){
				this.setAttribute("_selected",1);
				if(this.getAttribute('_select')=='-1'){
					var container=this;
					setTimeout(function(){container.setAttribute("_selected",0)},250);
				}else if(this.getAttribute('_select')=='1'){
					if(this._prop.selectContainer._prop.selectedDiv!==undefined)
						this._prop.selectContainer._prop.selectedDiv.setAttribute("_selected",0);
					this._prop.selectContainer._prop.selectedDiv=this;
				}
			}else{
				this.setAttribute("_selected",0);
				if(this.getAttribute('_select')=='1' && this._prop.selectContainer._prop.selectedDiv===this)
					this._prop.selectContainer._prop.selectedDiv=undefined;
			}
			updateContainers.delete(this);
		},
		path:function(data){
			if(data.constructor==Array){
				var d=this._path.getAttribute('d');
				if(d)this._path.setAttribute('d',d+" "+data.join(' '));
				else if(data[0].constructor===Number)this._path.setAttribute('d',"M"+data.join(' '));
				else this._path.setAttribute('d',data.join(' '));
			}else if(data.constructor==String)
				this._path.setAttribute('d',data);
		}
	}
	setValue.table=setValue.object;
	setValue.tableRow=setValue.object;
	setValue.tableCell=setValue.object;

	//////////////////////////////////////////////////////////////////////////////

	function processData(data){
		if(data===null){
			maindiv._content.innerHTML='';
			maindiv._childmap={};
		}else if(data.constructor===Array){
			maindiv._setValue(data);
		}else if(typeof(data)==="object"){
			if(data.R&1)sendAction(0,{R:1});
			if(data.S){		//optional delay
				var delay=waitTime(data.S);
				delete data.S;
				setTimeout(function(){processData(data);},delay);
				return;
			}
			if(data.R&2)sendAction(0,{R:2});
			// process special root directives
			if('error' in data){console.log('ERROR: '+data.error);delete data.error;}
			if('require' in data){
				var errors,quit=false;
				for(var key in data.require){
					if(key=='options'){
						errors=[];
						for(var i=0;i<data.require.options.length;++i){
							if(!OPTIONS.has(data.require.options[i]))
								errors.push(data.require.options[i]);
							else if(data.require.options[i] in REQUIRED)
								load(REQUIRED[data.require.options[i]]);
							// else if(!markerdefs && data.require.options[i].startsWith('arrow'))
								// initMarkers();
						}
						if(errors.length){
							sendAction(0,{error:'Sorry, I cannot handle the required directive(s): '+errors});
							document.write('ERROR: Cannot handle required task directive(s): '+errors+'<br><br>');
							quit=true;
						}
					}else if(key=='events'){
						errors=data.require.events.filter(function(x){return !(x in EVENTS)});
						if(errors.length){
							sendAction(0,{error:'Sorry, I cannot handle the required event(s): '+errors});
							document.write('ERROR: Cannot handle required task event(s): '+errors+'<br><br>');
							quit=true;
						}
					}else if(key=='types'){
						errors=data.require.types.filter(function(x){return !TYPES.has(x)});
						if(errors.length){
							sendAction(0,{error:'Sorry, I cannot handle the required type(s): '+errors});
							document.write('ERROR: Cannot handle required task type(s): '+errors+'<br><br>');
							quit=true;
						}
					}else if(key=='emphases'){
						var selectors=[],i,e,rules,x;
						for(i = 0; i < document.styleSheets.length; i++){
							rules = document.styleSheets[i].rules || document.styleSheets[i].cssRules;
							for(x in rules) {
								if(typeof rules[x].selectorText == 'string')
									selectors.push(rules[x].selectorText);
							}
						}
						for(i=0;i<data.require.emphases.toString().length;++i){
							e=10**i;
							x=(Math.floor(data.require.emphases/e)%10)*e;
							if(selectors.indexOf('.emp'+x)<0)errors.push(x);
						}
						if(errors.length){
							sendAction(0,{error:'Sorry, I cannot handle the required emphases: '+errors});
							document.write('ERROR: Cannot handle required emphases: '+errors+'<br><br>');
							quit=true;
						}
					}else{
						sendAction(0,{error:'Sorry, I cannot handle "require" directive: '+key+':'+data.require[key]});
						document.write('ERROR: Cannot handle "require" directive: '+key+':'+data.require[key]+'<br><br>');
						quit=true;
					}
				}
				if(quit)ws.close();
				delete data.require;
			}
			if('client' in data){
				var reply={};
				for(var i=0;i<data.client.length;++i){
					if(data.client[i]=='url'){
						reply['url']=objectify(location);
					}else if(data.client[i]=='screen'){
						reply['screen']=objectify(screen);
					}else if(data.client[i]=='ip'){
						if(ipAddress)reply['ip']=ipAddress;
						else
							load('https://api.ipify.org/?format=jsonp&callback=gotip',
								null,
								function(){
									if(!ipAddress)
										sendAction(0,{error:"could not get IP address"});
								},
								'js');
					}else if(data.client[i]=='userAgent'){
						reply['userAgent']=clientInformation.userAgent;
					}
				}
				if(Object.keys(reply).length)
					sendAction(0,{client:reply});
				delete data.client;
			}
			if('template' in data){
				var url=data.template;
				delete data.template;
				load(url,function(){processData(data);}); //refreshNumerics(maindiv);});
				return;
			}
			if('replace' in data){
				Object.assign(txtReplace,data.replace);
				delete data.replace;
			}
			if('task' in data){
				for(var taskThing in data.task){
					for(var cond of data.task[taskThing]){
						if(!(cond[0] in taskOptions))taskOptions[cond[0]]=[];
						//if(!(taskThing in taskOptions[cond[0]]))taskOptions[cond[0]][taskThing]=[];
						taskOptions[cond[0]].push(cond.length==2?['==',cond[1],taskThing]:[cond[1],cond[2],taskThing]);
					}
				}
				//taskInstructions(data.task);
				delete data.task;
			}
			if('.' in data && data['.'].constructor===Array && data['.'].length>1){
				let key=data['.'][0],e=document.getElementById(key);
				if(e){
					let val,options;
					if(data['.'].length==2){
						if(isObj(data['.'][1])){
							options=data['.'][1];
						}else{
							val=data['.'][1];
							options={};
						}
					}else{
						val=data['.'][1];
						options=data['.'][2];
					}
					processElement(e._parentState,key,val,options);
				}
			}
			// process other optional element directives
			Object.assign(maindiv._options,data);
			for(var optKey in data){
				updateOption(maindiv,optKey,data[optKey]);
			}
		}
		for(var element of updateContainers)element._setValue();
		if(maindiv._options.scroll&2)window.scrollTo(0,document.body.scrollHeight);
	}

	function init(){
		//check and make sure basic stap.css template is loaded
		var x=document.getElementsByTagName('link');
		for(var i=0;i<x.length;++i){if(x[i]['href'].endsWith('stap.css'))break;}
		if(i==x.length){load(STAPCSS,init);return;}
		//create foundational element
		document.body.parentElement._childmap={};
		maindiv=addElement(document.body,'object',0,"__main__");
		maindiv._prop.select=-1;
		//collect all options
		for(var key in setOption){
			TYPES.add(key);
			for(var optKey in setOption[key])
				OPTIONS.add(optKey);
			TYPES.delete('all');
		}
		if(task.onUserAction || task.userAction){
			//if task code is client-side script...
			connectToTaskScript();
		}else if(task.location=(task.location || location.params['l'])){
			// load url if one is supplied...
			gui.update(['Loading...']);
			if(task.location.startsWith('ws://') || task.location.startsWith('wss://'))
				connectToTaskWS();
			else
				connectToTaskHTTP();
		}else{
			gui.update(['Hey there...',{'@Intersted in the STAP?':['<a href=https://github.com/vdv7/stap>https://github.com/vdv7/stap</a>','<a href=https://github.com/vdv7/stapjs>https://github.com/vdv7/stapjs</a>']}]);
		}
	}

	function onTaskConnect(){
		processData(null);
		startTime=(new Date()).getTime();
		sendAction(0,[0]);
		window.addEventListener('unload',function(){sendAction(0,[1]);},false);
	}

	return {
		// OPTIONS:OPTIONS,
		// e:setOption,
		init:init,
		onTaskConnect:onTaskConnect,
		update:processData
	}
})();

onload=gui.init;

