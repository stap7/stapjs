/*base html5 template for STAP visualization


	Logging data:
		to enable logging to console, call logToConsole()
		to enable logging to firebase, instantiate firebase, adn then call logToFirebase()
		if this is running on volunteerscience.com, logging via volunteerscience API is automatically enabled
		you can overload logline(direction,data) to set up custom logging of stap messages, for example:
			logline=function(direction,data){fetch('http://myserver.com/log?helloworld',{method:'POST',body:JSON.stringify([direction,data]),headers:{'content-type':'application/json'}})};

*/



//////////////////////////////////////////////////////////////////////////////
// helper functions/constants
location.params={};location.search.substr(1).split("&").forEach(function(a){var b=a.split("=");location.params[b[0]]=b[1]});
var SELECTION = window.getSelection();
var RANGE = document.createRange();
function pass(){}
function same(o){return o;}
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
String.prototype.replaceAll=function(search,replacement){return this.split(search).join(replacement);};
if(String.prototype.startsWith===undefined)String.prototype.startsWith=function(prefix){return this.slice(0,prefix.length)===prefix;};
if(String.prototype.endsWith===undefined)String.prototype.endsWith=function(suffix){return this.slice(this.length-suffix.length)===suffix;};
if(Object.assign===undefined)Object.assign=function(o,o2){for(var k in o2)o[k]=o2[k];return o};
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
function cursorToEnd(e){
	RANGE.selectNodeContents(e);
	RANGE.collapse(false);
	SELECTION.removeAllRanges();
	SELECTION.addRange(RANGE);
}
function urlInDocument(type,urlField,url){
	var x=document.getElementsByTagName(type);
	for(var i=0;i<x.length;++i){
		if(x[i][urlField]==url)return true;
	}
}
function load(urls, callback, onerror, type){
	//TODO: if(url.constructor===Array) try one or the other
	var url, onload, fileref;
	if(urls.constructor===Array){url=urls[0];urls=urls.slice(1);}
	else{url=urls;urls=[];}
	if(urls.length)onload=function(){load(urls,callback,onerror,type);};
	else onload=callback||pass;
	if(url && (url.endsWith(".js")||type==='js') && !urlInDocument('script','src',url)){       //if filename is a external JavaScript file
		fileref=document.createElement('script');
		fileref.setAttribute("type","text/javascript");
		fileref.setAttribute("src", url);
	}else if(url && (url.endsWith(".css")||type==='css') && !urlInDocument('link','href',url)){ //if filename is an external CSS file
		fileref=document.createElement("link");
		fileref.setAttribute("rel", "stylesheet");
		fileref.setAttribute("type", "text/css");
		fileref.setAttribute("href", url);
	}else{
		try{eval(url);}
		catch(e){
			console.log('Not sure how to handle '+url+'.\nWill try to add as <style>...');
			fileref=document.createElement("style");
			fileref.innerHTML=url;
			document.head.appendChild(fileref);
		}
		onload();
		return;
	}
	fileref.onreadystatechange=onload;
	fileref.onload=onload;
	fileref.onerror=onerror||function(e){console.error(e);onload();};
	document.head.appendChild(fileref);
}
var SVGNS="http://www.w3.org/2000/svg";
function keepNumeric(e){
	var numtxt=e.target.innerText.match(/-?\.?\d+.*/)[0];
	e.target.innerText=parseFloat(numtxt)+(numtxt.endsWith('.')?'.':'');
}
//////////////////////////////////////////////////////////////////////////////



//////////////////////////////////////////////////////////////////////////////
// Global vars
var task={},ws,recv;
//////////////////////////////////////////////////////////////////////////////



//////////////////////////////////////////////////////////////////////////////
// Logging
//    call logToConsole() to log all stap messages to console
//    call logToFirebase() to log all stap messages via Firebase
//    if this code is running via volunteerscience.com, logToVolunteerScience() is automatically called to log all stap messages via the volunteerscience API
var logline=pass;
function logToConsole(){
	logline=function(direction,data){
		console.log((new Date()).getTime()+'\t'+direction+'\t'+JSON.stringify(data));
	};
}
function logToFirebase(){
	function _logToFirebase(){
		firebase.stapTask='tasks/'+(location.host+location.pathname).replace(/\/|\./g,'-');
		firebase.stapSession='/'+firebase.stapTask+'/'+firebase.database().ref().child(firebase.stapTask).push().key;
		var stapMsgCnt=-1;
		logline=function(direction,data){
			firebase.database().ref(firebase.stapSession+'/'+(++stapMsgCnt)+'/'+direction).set(JSON.stringify(data));
		};
	}
	if(typeof(firebase)!=='undefined')_logToFirebase();
	else load("https://www.gstatic.com/firebasejs/4.11.0/firebase.js",
		function(){
			firebase.initializeApp({apiKey:"AIzaSyCy-9xDsJ5_xYF0iBA9sLcPgmERFgd2JyM",authDomain:"stap-5a32d.firebaseapp.com",databaseURL:"https://stap-5a32d.firebaseio.com",projectId:"stap-5a32d",storageBucket:"stap-5a32d.appspot.com",messagingSenderId:"944783602225"});
			_logToFirebase();
		});
}
function logToVolunteerScience(){
	//TODO: throw error if there's no submit
	logline=function(direction,data){
		submit((new Date()).getTime()+'\t'+direction+'\t'+JSON.stringify(data));
	};
}
if(typeof(submit)!=='undefined'&&location.host==="volunteerscience.com")logToVolunteerScience();
//////////////////////////////////////////////////////////////////////////////


const S={
	clear:null,
	startTime:'S',
	waitTime:'W',
	animationTime:'T',
	//receipts
	receipt:'R',
	onRecieve:1,
	onEdit:2,
	onComplete:4,
	//buttons
	button:function(name,props){props=props||{};props['@'+name]=false;return props;},
	buttons:-1,
	holddown:0,
	radio:1,
	checkboxes:2,
	//events
	event:{
		load:0,
		unload:1,
		// focus:10,
		// blur:11,
		// scroll:12,
		// resize:13,
		// collision:14,
		// select:20,
		// copy:21,
		// cut:22,
		// paste:23,
		keypress:30,
		keydown:31,
		keyup:32,
		click:40,
		dblclick:41,
		mousedown:42,
		mouseup:43,
		mousemove:44,
		mouseenter:45,
		mouseleave:46,
		mouseover:47,
		mouseout:48
	}
};

var gui=(function(){

	//////////////////////////////////////////////////////////////////////////////
	// constants
	var STAPCSS = "https://rawgit.com/vdv7/stapjs/master/stap.css";
	// var STAPCSS = "stapjs/stap.css";
	var OPTIONS=new Set([".","S","W","T","R","onsubedit","patronym"]),
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

	var COMPATIBLE={
			path:new Set(['string','object']),
			table:new Set(['object']),
			tableRow:new Set(['object'])
		};

	var COLOROPTIONS=new Set(['bg','c','bdc']);

	var ANIMATABLE={'x':'left','y':'top','w':'width','h':'height','r':'borderRadius','bg':'backgroundColor','bd':'borderStyle','bdw':'borderWidth','bdc':'borderColor','pad':'padding','c':'color','rot':'rotation'};

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
	// for table with header
	function floatRow(){
		var translate = "translate(0,"+(this.scrollTop-1)+"px)";
		var p=this.firstChild.querySelectorAll('.main');
		for(var i in p)if(p[i] && p[i].style)p[i].style.transform = translate;
	}

	//////////////////////////////////////////////////////////////////////////////

	function ums(){return (new Date()).getTime()-startTime;}
	
	function changeElement(element,parent,valopt){
		if(valopt && valopt.constructor===Object){	//get val,opt
			var val=valopt['@'];
			processElement(parent,element,val===undefined?{}:val,valopt);
		}else{
			processElement(parent,element,valopt,{});
		}
	}
	
	function onEdit(element,parent){ //TODO: account for maindiv
		if(element._prop.onedit!==undefined){
			changeElement(element,parent,element._prop.onedit);
		}
		if(parent && parent._prop.onsubedit!==undefined){
			changeElement(parent,parent._parentContainer,parent._prop.onsubedit);
		}
	}
	
	function sendAction(element,val){
		if(typeof(element)==='object'){
			var elementid=element.id || element._getIndex(),
				parent=element._parentContainer;
			if(typeof(val)!=='object')onEdit(element,parent);
			var fullname=[elementid];
			for(var i=0;parent!==maindiv && i<(element._prop.patronym||0);++i){
				fullname.push(parent.id || parent._getIndex());
				parent=parent._parentContainer;
			}
			element=fullname.length>1?fullname:elementid;
		}
		var time=ums();
		logline('<',[time,element,val]);
		gui.action(time,element,val);
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
			// c=addDiv(container,[type,'lvl_'+level,'id_'+key,'main'],'div');
			// c.style.display='table-row';
			//testing: two lines above
			c._frame=c;
			c._parentContainer=container.parentElement;
			c._realkey=key;
			if(typeof(key)==='string'){
				c.id=key;
				c._parentContainer._childmap[key]=c;
			}
			c._key=addDiv(c,[type,'lvl_'+level,'id_'+key,'key'],'td');
			c._content=c;
		}else{                                       //everything else
			if(container._type==='tableRow'){
				cf=addDiv(container,[type,'lvl_'+level,'id_'+key,'frame'],'td');
				// cf=addDiv(container,[type,'lvl_'+level,'id_'+key,'frame'],'div');
				// cf.style.display='table-cell';
				//testing: two lines above
				cf._parentContainer=container;
			}else{
				cf=addDiv(container,[type,'lvl_'+level,'id_'+key,'frame']);
				cf._parentContainer=container.parentElement;
			}
			c=addDiv(cf,[type,'lvl_'+level,'id_'+key,'main']);
			cf._main=c;
			c._frame=cf;
			c._parentContainer=cf._parentContainer;
			c._realkey=key;
			if(typeof(key)==='string'){
				c.id=key;
				c._parentContainer._childmap[key]=c;
			}
			c._key=addDiv(c,[type,'lvl_'+level,'id_'+key,'key']);
			cs=addDiv(c,[type,'lvl_'+level,'id_'+key,'sep']);
			// c._content=addDiv(c,[type,'lvl_'+level,'id_'+key,'content'],type==='table'?'table':'div');
			c._content=addDiv(c,[type,'lvl_'+level,'id_'+key,'content'],'div');
			//if(type==='table')c._content.style.display='table';
			//testing: two lines above
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
			var i=0,me=c._frame;
			while( (me=me.previousSibling)!=null ) ++i;
			return i;
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
		//console.log('------\n',parent,key,val,options,'\n==============');
		if(options.R&1)sendAction(key,{R:1});
		if(options.S){		//optional delay
			let delay=waitTime(options.S);
			delete options.S;
			setTimeout(function(){processElement(parent,key,val,options);},delay);
			return;
		}
		if(options.W){		//optional delay
			let delay=options.W;
			delete options.W;
			setTimeout(function(){processElement(parent,key,val,options);},delay*1000);
			return;
		}
		var child;
		if(key && key._type){
			child=key;
		}else if(typeof(key)==='number'){
			child=parent._content.children[key];	//find frame by numeric key
			if(child.classList.contains('frame'))child=child.children[0];		//get main div of child
		}else{
			child=parent._childmap[key];
		}
		if(val===null){							//remove element
			if(child)child._remove();
		}else{
			var typeofval,optKey;
			if(child===undefined){				//new element
				typeofval=options.type;
				if(!typeofval){
					if(val===undefined){ //default behavior (maybe think this through for boxes that arent buttons)
						if(options.eT)val=""; // !!TODO: this was changed, should change it back or change stap.txt (currently specifying only options defaults to <<container>>)
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
				typeofval=options.type || ((val===undefined || val.constructor === Object)?'undefined':typeof(val));
				if(typeofval!=='undefined' && child._type!==typeofval && !(COMPATIBLE[child._type] && COMPATIBLE[child._type].has(typeofval))){
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
					ani={};
					aniopt.onUpdate=function(options){
						if(document.body.contains(child))
							for(var optKey in options){
								child._options[optKey]=options[optKey];
								updateOption(child,optKey,options[optKey]);
							}
						else
							ani.ani.kill();
					};
					aniopt.onUpdateParams=[curopt];
					if(options.R&4){
						aniopt.onComplete=function(){sendAction(child,{R:4});};
						delete options.R;
					}
					ani.ani=TweenLite.to(curopt,animate,aniopt);
				}
				//animate value
				if(typeof(val)==='number'){
					ani={};
					curopt={v:child._value};
					aniopt={v:val,onUpdate:function(o){
							if(document.body.contains(child))
								child._setValue(o.v);
							else
								ani.ani.kill();
						},onUpdateParams:[curopt]};
					val=undefined;
					if(options.R&4)aniopt.onComplete=function(){sendAction(child,{R:4});};
					ani.ani=TweenLite.to(curopt,animate,aniopt);
					val=undefined;
				}
			}
			Object.assign(child._options,options);
			for(optKey in options)
				updateOption(child,optKey,options[optKey]);
			if(val!==undefined){
				child._setValue(val);
				//onEdit(child,parent);
			}
			if(child._options.scroll&2)
				child._content.scrollTop=child._content.scrollHeight;
		}
	}
	
	function processProperties(props,parent){
		var key,val,options={};
		for(var k in props){
			if(k.startsWith('@')){
				if(props[k].constructor!==Object)
					val=props[k];
				key=k.substr(1);
				if(key==='')key=undefined;
			}else if(!key && !val && k.startsWith('#')){
				if(!key && !val){
					if(props[k].constructor!==Object)
						val=props[k];
					key=parseInt(k.substr(1));
				}
			}else if(!key && !val && k.constructor===Number){
				if(props[k].constructor!==Object)
					val=props[k];
				key=k;
			}else options[k]=props[k];
		}
		if(parent){
			processElement(parent,key,val,options);
		}else{
			var e=document.getElementById(key);
			if(e)processElement(e._parentContainer,e,val,options);
		}
	}

	function updateOption(child,option,value){
		(setOption.all[option]||setOption[child._type][option]||setOption[child._type].default||pass)(child,value,option);
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
			if(!c._prop.fmt)c._prop.fmt=same;
			if(!c._prop.display)c._prop.display=function(){c._prop.valueSpan.innerHTML=c._prop.fmt(c._value);};
		},
		string:function(c){
			c._sendText=function(e){sendAction(e.target.parentElement,e.target.innerHTML);}
			c._checkText=pass;
			c._content.addEventListener('input',function(e){
				c._checkText(e);
			});
		},
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

	function spreadOptionsToChildren(c,v,option){
		c._prop[option]=v;
		var child;
		for(var i=0;i<c._content.childElementCount;++i){
			child=c._content.children[i]._main;
			if(child && child._options[option]===undefined){
				(setOption[child._type][option]||pass)(child,v);
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
						e=Math.pow(10,i);
						c._content.classList.remove('emp'+(Math.floor(c._prop.emp/e)%10)*e);
					}
				c._prop.emp=v;
				for(i=0;i<v.toString().length;++i){
					e=Math.pow(10,i);
					c._content.classList.add('emp'+(Math.floor(v/e)%10)*e);
				}
			},
			bg:function(c,v){c._content.style.backgroundColor=v;},
			c:function(c,v){c._content.style.color=v;},
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
		object:{
			default:spreadOptionsToChildren
		},
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
					c._prop.fmt=same;
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
							setTimeout(function(){select(c._prop.valueSpan)},1);
						}
						// c._prop.valueSpan.addEventListener("keyup", keepNumeric, false);
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
			maxchars:function(c,v){
				if(v){
					c._checkText=function(e){
						if(c._content.innerText.length>c._options.maxchars){
							//e.preventDefault();
							// c._content.focus();
							//v=c._content.innerText.substr(0,c._options.maxchars);
							// c._content.innerText='';
							// c._content.innerText=v;
							// c._content.setSelectionRange(1000,1000);
							c._content.innerText=c._content.innerText.substr(0,c._options.maxchars);
							// moveCursorToEnd(c._content);
							setTimeout(function(){
								cursorToEnd(c._content);
								// c._content.selectionStart = c._content.selectionEnd = 100000;
							},1);
						}
					};
				}else{
					c._checkText=pass;
				}
			},
			eT:function(c,v){
				if(v&1 || v&2 || v&4){
					c._content.setAttribute('contenteditable',true);
					if(!document.activeElement.getAttribute('contenteditable'))c._content.focus()
					if(v&1){ //on enter
						c._content.onkeypress=function(e){if(e.keyCode==13){c._sendText(e);return false;}};
					}
					if(v&2){ //on blur
						c._content.onblur=c._sendText;
					}
					if(v&4){ //on any change
						//TODO: this will conflict with v&1, specifically in that enter key will be allowed
						c._content.oninput=c._sendText;
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
					c._prop.selectContainer=c._parentContainer;
					if(c._options.select===undefined){
						while(c._prop.selectContainer._options.select===undefined){
							c._prop.selectContainer=c._prop.selectContainer._parentContainer;
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
				}else if(v==0.5){
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
		table:{
			head:function(c,v){
				c.setAttribute('_head',v);
				if(v)c._content.addEventListener('scroll',floatRow);
			},
			default:spreadOptionsToChildren
		},
		tableRow:{
			default:spreadOptionsToChildren
		},
		tableCell:{
			default:spreadOptionsToChildren
		}
	}

	setValue={
		object:function(data){
			var i,props;
			for(i=0;i<data.length;++i){
				props={};
				if(data[i].constructor===Object){	//get key,val,opt
					processProperties(data[i],this);
				}else{
					processElement(this,undefined,data[i],{});
				}
				// if(key===true){  wildcard key processing
					// for(key=this._content.childElementCount-1;key>=0;--key){
						// processElement(this,key,val,options);
					// }
				// }else{
					// processElement(this,key,val,options);
				// }
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
	// main function call to update the gui

	function update(data){
		logline('>',data);
		if(data===null){
			maindiv._content.innerHTML='';
			maindiv._childmap={};
		}else if(data.constructor===Array){
			maindiv._setValue(data);
		}else if(typeof(data)==="object"){
			if(data.R&1)sendAction(0,{R:1});
			if(data.S){		//optional delay
				let delay=waitTime(data.S);
				delete data.S;
				setTimeout(function(){update(data);},delay);
				return;
			}
			if(data.W){		//optional delay
				let delay=data.W;
				delete data.W;
				setTimeout(function(){update(data);},delay);
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
						for(let i=0;i<data.require.options.length;++i){
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
						errors=data.require.events.filter(function(x){return (x in EVENTS)});
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
						let selectors=[],i,e,rules,x;
						for(i = 0; i < document.styleSheets.length; i++){
							rules = document.styleSheets[i].rules || document.styleSheets[i].cssRules;
							for(x in rules) {
								if(typeof rules[x].selectorText == 'string')
									selectors.push(rules[x].selectorText);
							}
						}
						for(i=0;i<data.require.emphases.toString().length;++i){
							e=Math.pow(10,i);
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
				if(quit && ws)ws.close();
				delete data.require;
			}
			if('client' in data){
				var reply={};
				for(let i=0;i<data.client.length;++i){
					if(data.client[i]=='url'){
						reply.url=objectify(location);
					}else if(data.client[i]=='screen'){
						reply.screen=objectify(screen);
					}else if(data.client[i]=='ip'){
						if(ipAddress)reply.ip=ipAddress;
						else
							load('https://api.ipify.org/?format=jsonp&callback=gotip',
								null,
								function(){
									if(!ipAddress)
										sendAction(0,{error:"could not get IP address"});
								},
								'js');
					}else if(data.client[i]=='userAgent'){
						reply.userAgent=navigator.userAgent;
					}
				}
				if(Object.keys(reply).length)
					sendAction(0,{client:reply});
				delete data.client;
			}
			if('template' in data){
				var url=data.template;
				delete data.template;
				load(url,function(){update(data);}); //refreshNumerics(maindiv);});
				return;
			}
			if('replace' in data){
				Object.assign(txtReplace,data.replace);
				delete data.replace;
			}
			if('task' in data){
				var cond;
				for(var taskThing in data.task){
					for(var condi in data.task[taskThing]){
						cond=data.task[taskThing][condi];
						if(!(cond[0] in taskOptions))taskOptions[cond[0]]=[];
						//if(!(taskThing in taskOptions[cond[0]]))taskOptions[cond[0]][taskThing]=[];
						taskOptions[cond[0]].push(cond.length==2?['==',cond[1],taskThing]:[cond[1],cond[2],taskThing]);
					}
				}
				//taskInstructions(data.task);
				delete data.task;
			}
			if('.' in data && data['.'].constructor===Object){
				processProperties(data['.']);
			}
			// process other optional element directives
			Object.assign(maindiv._options,data);
			for(var optKey in data){
				updateOption(maindiv,optKey,data[optKey]);
			}
		}
		for(var i in updateContainers)updateContainers[i]._setValue();
		if(maindiv._options.scroll&2)window.scrollTo(0,document.body.scrollHeight);
	}

	//////////////////////////////////////////////////////////////////////////////
	// init window and connect to task

	function init(){
		//check and make sure basic stap.css template is loaded
		var x=document.getElementsByTagName('link');
		for(var i=0;i<x.length;++i){if(x[i].href.endsWith('stap.css'))break;}
		if(i==x.length){load(STAPCSS,init);return;}
		//add stylesheet to head
		var style = document.createElement("style");
		style.appendChild(document.createTextNode(""));// WebKit hack
		document.head.appendChild(style);
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
		if(task.userAction){
			//if task code is client-side script...
			connectToTaskScript();
		}else if(task.location || location.params.l){
			// load url if one is supplied...
			gui.update(['Loading...']);
			task.location=task.location || location.params.l;
			if(task.location.startsWith('ws://') || task.location.startsWith('wss://'))
				connectToTaskWS();
			else
				connectToTaskHTTP();
		}else{
			gui.update(['Hey there...',{'@Intersted in the STAP?':['<a href=https://github.com/vdv7/stap>https://github.com/vdv7/stap</a>','<a href=https://github.com/vdv7/stapjs>https://github.com/vdv7/stapjs</a>']}]);
		}
	}

	function onTaskConnect(){
		update(null);
		startTime=(new Date()).getTime();
		sendAction(0,[0]);
		window.addEventListener('unload',function(){sendAction(0,[1]);},false);
	}

	function connectToTaskScript(){
		//	connect gui.action to task.userAction
		if(task.userAction)gui.action = task.userAction;
		//	connect task.updateUI to gui.update;
		task.updateUI = gui.update;
		//	define task.end
		task.end=pass;
		//	start task
		onTaskConnect();
		if(task.start)task.start();
	}

	function connectToTaskHTTP(){
		
		function urlWithQuery(url){
			var i=url.indexOf('?');
			if(i===-1)return url+'?callback=recv&';
			if(i===url.length-1 || url.endsWith('&'))return url+'callback=recv&';
			return url+'&callback=recv&';
		}
		
		function urijson(data){return encodeURIComponent(JSON.stringify(data));}

		gui.action = function(time,id,val){
			var s=document.createElement('script');
			s.src=task.location+'d='+urijson([time,id,val])+(task.callbackState===undefined?'':('&s='+urijson(task.callbackState)));
			s.onerror=function(e){console.log("Error loading "+task.location,e)}
			if(document.head._taskscript){
				s.onload=function(){
					document.head.removeChild(s);
				};
			}else{  //first message
				document.head._taskscript=true;
				s.onload=function(){
					document.head.removeChild(s);
					//check if task code is client-side 
					if(task.userAction){
						connectToTaskScript();
					}
				};
			}
			document.head.appendChild(s);
		}
		
		recv = function(data,state){
			try{								//redirect
				var url=new URL(data);
				task.location=urlWithQuery(url.origin+url.pathname);
				onTaskConnect();
			}catch(e){							//parse task message
				task.callbackState=state;
				gui.update(data);
			}
		}

		task.location=urlWithQuery(task.location);
		onTaskConnect();

	}

	function connectToTaskWS(){
		if("WebSocket" in window){
			gui.action = function(time,id,val){
				ws.send(JSON.stringify([time,id,val]));
			}
			ws=new window.WebSocket(task.location);
			ws.onerror=function(e){gui.update(null);gui.update({'error':'Cannot establish connection to '+task.location});};
			ws.onopen=onTaskConnect;
			ws.onclose=function(event){
				console.log('Connection closed ('+event.code+').');
				//gui.update(['Connection closed.']);
			};
			ws.onmessage=function(msg){
				gui.update(JSON.parse(msg.data));
			};
		}else{
			gui.update(null);
			gui.update([{'@Error':'Your browser does not support websockets. Please use a modern browser to run this application.'}]);
		}
	}

	//////////////////////////////////////////////////////////////////////////////
	
	return {
		// m:maindiv,
		R:REQUIRED,
		O:OPTIONS,
		init:init,
		update:update,
		edit:function(key,val,options){
			var e=document.getElementById(key);
			if(e)processElement(e._parentContainer,e,val,options||{});
		}
	}
})();

window.addEventListener("load",gui.init);
