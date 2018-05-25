/*base html5 template for STAP (v7.10) visualization

	What is STAP? 
		http://vdv7.github.io/stap/


	Logging data:
		to enable logging to console, call logToConsole()
		to enable logging to firebase, instantiate firebase, and then call logToFirebase()
		if this is running on volunteerscience.com, logging via volunteerscience API is automatically enabled
		you can overload logline(direction,data) to set up custom logging of stap messages, for example:
			logline=function(direction,data){fetch('http://myserver.com/log?helloworld',{method:'POST',body:JSON.stringify([direction,data]),headers:{'content-type':'application/json'}})};

*/


"use strict";

//////////////////////////////////////////////////////////////////////////////
// Helper functions
location.params={};location.search.substr(1).split("&").forEach(function(a){var b=a.split("=");location.params[b[0]]=b[1]});
function addCSS(css){document.head.appendChild(document.createElement("style")).innerHTML=css;}
function findCSSrule(selector){
	var rules;
	for(var i=0;i<document.styleSheets.length;++i){
		rules=document.styleSheets[i].rules||document.styleSheets[i].cssRules;
		for(var x=0;x<rules.length;++x){
			if(rules[x].selectorText==selector)
				return rules[x];
		}
	}
}
function urlInDocument(type,urlField,url){
	var x=document.getElementsByTagName(type);
	for(var i=0;i<x.length;++i){
		if(x[i][urlField]==url)return true;
	}
}
function load(urls, callback, onerror, type){
	var url, onload, fileref;
	if(urls.constructor===Array){url=urls[0];urls=urls.slice(1);}
	else{url=urls;urls=[];}
	if(urls.length)onload=function(){load(urls,callback,onerror,type);};
	else onload=callback||function(){};
	if(url && (url.endsWith(".js")||type==='js')){       //if filename is a external JavaScript file
		if(!urlInDocument('script','src',url)){
			fileref=document.createElement('script');
			fileref.setAttribute("type","text/javascript");
			fileref.setAttribute("src", url);
		}
	}else if(url && (url.endsWith(".css")||type==='css')){ //if filename is an external CSS file
		if(!urlInDocument('link','href',url)){
			fileref=document.createElement("link");
			fileref.setAttribute("rel", "stylesheet");
			fileref.setAttribute("type", "text/css");
			fileref.setAttribute("href", url);
		}
	}else{
		try{eval(url);}
		catch(e){
			console.log('Not sure how to handle '+url+'.\nWill try to add as <style>...');
			addCSS(url);
		}
		onload();
		return;
	}
	if(fileref){
		fileref.onreadystatechange=onload;
		fileref.onload=onload;
		fileref.onerror=onerror||function(e){console.error(e);onload();};
		document.head.appendChild(fileref);
	}
}
Math.round2=function(n,r){return Math.round(n/r)*r};
Date.prototype.format=function(format){
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
HTMLElement.prototype._listen=function(event,fun){
	if(!this._listeners)this._listeners={};
	this.addEventListener(event,fun);
	this._listeners[event]=fun;
}
HTMLElement.prototype._removeListeners=function(){
	if(this._listeners)
		for(var event in this._listeners){
			this.removeEventListener(event,this._listeners[event]);
		}
}
//////////////////////////////////////////////////////////////////////////////
// Logging
//    call logToConsole() to log all stap messages to console
//    call logToFirebase() to log all stap messages via Firebase
//    if this code is running via volunteerscience.com, logToVolunteerScience() is automatically called to log all stap messages via the volunteerscience API
var logline=function(){};
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
	logline=function(direction,data){
		submit((new Date()).getTime()+'\t'+direction+'\t'+JSON.stringify(data));
	};
}
if(typeof(submit)!=='undefined'&&location.host==="volunteerscience.com")logToVolunteerScience();
//////////////////////////////////////////////////////////////////////////////


//////////////////////////////////////////////////////////////////////////////
// Global vars
var task={},ws,recv;
//////////////////////////////////////////////////////////////////////////////


function gui(data){
	logline('>',data);
	if(data===null){
		gui.rootContainer._content.innerHTML='';
		gui.rootContainer._childmap={};
	}else if(data.constructor===Array){
		gui.rootContainer._value(data);
	}else if(typeof(data)==="object"){
		if(data.U){		//optional delay
			let delay=data.U-ums();
			delete data.U;
			setTimeout(function(){gui(data);},delay);
			return;
		}
		if(data.T){		//optional delay
			let delay=data.T*1000;
			delete data.T;
			setTimeout(function(){gui(data);},delay);
			return;
		}
		if('$' in data){
			gui.rootContainer._search(data);
		}else{
			//update display properties
			gui.rootContainer._update(data);
		}
	}
}

gui.REQUIRED={
	"S":[
		"https://cdnjs.cloudflare.com/ajax/libs/gsap/1.20.4/TweenLite.min.js",
		"https://cdnjs.cloudflare.com/ajax/libs/gsap/1.20.4/plugins/ColorPropsPlugin.min.js",
		// "https://cdnjs.cloudflare.com/ajax/libs/gsap/1.19.0/plugins/CSSPlugin.min.js",
		// "https://cdnjs.cloudflare.com/ajax/libs/gsap/1.19.0/plugins/AttrPlugin.min.js",
		// "https://cdnjs.cloudflare.com/ajax/libs/gsap/1.19.0/plugins/TextPlugin.min.js",
		"TweenLite.defaultEase = Linear.easeNone;"
	],
	"ease":"https://cdnjs.cloudflare.com/ajax/libs/gsap/1.20.4/easing/EasePack.min.js",
	"easeout":"https://cdnjs.cloudflare.com/ajax/libs/gsap/1.20.4/easing/EasePack.min.js",
};
gui.OPTIONS=new Set(['Q','R','S','T','U']);
gui.EVENTS=new Set();
gui.COLOROPTIONS=new Set(['bg','c','bdc','f']);
gui.ANIMATABLE=new Set(['x','y','w','h','r','bg','bd','bdw','bdc','pad','c','rot']);
gui.EASE={0:'Power0',1:'Power1',2:'Power2',3:'Power3',4:'Power4',back:'Back',elastic:'Elastic',bounce:'Bounce'};
gui.ums=function(){return (new Date()).getTime()-gui.startTime;};
gui.sendAction=function(id,value){
	var time=gui.ums();
	logline('<',[time,id,value]);
	gui.action(time,id,value);
};
gui.getType=function(prop){
	if(prop.type!==undefined){
		var type=prop.type.charAt(0).toUpperCase()+prop.type.slice(1)
		delete prop.type;
		if(type in gui)return gui[type];
	}else if(prop.v!==undefined){
		if(prop.v.constructor===Array)return gui.Container;
		if(prop.v.constructor===String)return gui.Text;
		if(prop.v.constructor===Number)return gui.Number;
		if(prop.v.constructor===Boolean)return gui.Boolean;
	}
};
gui.prop=x=>(x===null||x.constructor!==Object)?{v:x}:x;
gui.getColor=v=>getComputedStyle(document.body).getPropertyValue('--color'+v);
gui.color=v=>gui.getColor(v)?`var(--color${v})`:v;

//////////////////////////////////////////////////////////////////////////////
// task (root-level container)
gui.error=function(v){console.log('ERROR: '+v);}
gui.require=function(require){
	var errors,quit=false,errorScreen=[];
	var TYPES=new Set([gui.Item,gui.Text,gui.Number,gui.Boolean,gui.Container]);
	if(require.type){
		errors=[];
		for(var type of require.type){
			type=type[0].toUpperCase()+type.substr(1);
			if(gui[type])TYPES.add(gui[type]);
			else errors.push(type);
		}
		if(errors.length){
			gui.sendAction(0,{error:'Sorry, I cannot handle the required value type(s): '+errors});
			errorScreen.push({id:'Cannot handle required value type(s)',v:errors});
			quit=true;
		}
		delete require.type;
	}
	if(require.options){
		errors=[];
		//collect all options
		for(var type of TYPES){
			for(var propName of Object.getOwnPropertyNames(type.prototype)){
				if(type.prototype[propName].call && !propName.startsWith("_"))
					gui.OPTIONS.add(propName);
			}
		}
		for(var propName of require.options){
			if(!gui.OPTIONS.has(propName))
				errors.push(propName);
			else if(propName in gui.REQUIRED)
				load(gui.REQUIRED[propName]);
			// else if(!markerdefs && require.options[i].startsWith('end'))
				// initMarkers();
		}
		if(errors.length){
			gui.sendAction(0,{error:'Sorry, I cannot handle the required property option(s): '+errors});
			errorScreen.push({id:'Cannot handle required property option(s)',v:errors});
			quit=true;
		}
		delete require.options;
	}
	if(require.e){
		//TODO: make sure EVENTS work and are extendable
		errors=require.e.filter(x=>!gui.EVENTS.has(x));
		if(errors.length){
			gui.sendAction(0,{error:'Sorry, I cannot handle the required event(s): '+errors});
			errorScreen.push({id:'Cannot handle required event(s)',v:errors});
			quit=true;
		}
		delete require.e;
	}
	if(require.emphases){
		errors=[];
		for(var emp in require.emphases){
			if(!gui.Item.prototype.hasOwnProperty(emp)){
				errors.push(emp);
			}else{
				for(var i=1;i<=require.emphases[emp];++i){
					if(!findCSSrule(`[${emp}="${i}"]`))
						errors.push(`${emp}=${i}`);
				}
			}
		}
		if(errors.length){
			gui.sendAction(0,{error:'Sorry, I cannot handle required emphasis type(s): '+errors});
			errorScreen.push({id:'Cannot handle required emphasis type(s)',v:errors});
			quit=true;
		}
		delete require.emphases;
	}
	if(require.colors){
		errors=[];
		for(var i=0;i<=require.colors;++i)
			if(!gui.getColor(i))
				errors.push(i);
		if(errors.length){
			gui.sendAction(0,{error:'Sorry, I cannot handle required color(s): '+errors});
			errorScreen.push({id:'Cannot handle required color(s)',v:errors});
			quit=true;
		}
		delete require.colors;
	}
	for(var propName in require){
		if(!gui.OPTIONS.has(propName)){
			gui.sendAction(0,{error:'Sorry, I cannot handle required option: '+propName});
			errorScreen.push({id:'Cannot handle required property option(s)',v:[propName]});
			quit=true;
		}else if(propName in gui.REQUIRED){
			load(gui.REQUIRED[propName]);
		}// else if(!markerdefs && require.options[i].startsWith('end'))
			// initMarkers();
	}
	if(errorScreen.length){
		gui(null);
		gui([{id:'Error',v:errorScreen}]);
	}
	if(quit && ws)ws.close();
};
gui.agent=function(v){
	for(let i of v){
		if(i==='url'){
			gui.sendAction(0,{url:location});
		}else if(i==='screen'){
			function objectify(o){
				var r={};
				for(var key in o)
					if(typeof(o[key])=='object')r[key]=objectify(o[key]);
					else r[key]=o[key];
				return r;
			}
			gui.sendAction(0,{'screen':objectify(screen)});
		}else if(i==='userAgent'){
			gui.sendAction(0,{'userAgent':navigator.userAgent});
		}else if(i==='ip'){
			load('https://api.ipify.org/?format=jsonp&callback=gui.rootContainer._sendAction',null,null,'js');
		}
	}
}
gui.template=function(v){load(v);}
//////////////////////////////////////////////////////////////////////////////
// prototypical gui item
addCSS(`
	:root {
	  --color0: white;
	  --colorHead: #f0f8f8;
	  --colorBorder: #e8e8e8;
	  --colorFalse: #f8f8f8;
	  --colorTrue: lightblue;
	  --color1: #444444;
	  --color2: #0099ff;
	  --color3: #ff9900;
	  --color4: #99ff99;
	  --color5: blue;
	  --color6: red;
	  --color7: green;
	}
	* {
		white-space:pre-wrap;
		font-size:14pt;
		position:relative;
		box-sizing:border-box;
		font-size:98%;
		flex:0 0 auto;
	}
	body {
		background-color:var(--color0);
		color:var(--color1);
		font-size:16pt;
		white-space:normal;
	}
	div {
		margin:2px;
		margin-top:7px;
	}
	.title:not(empty) {
		white-space:nowrap;
		display:inline-block;
	}
	[v] {margin-left:5px;overflow:auto}
`);
gui.Item=class{
	constructor(prop,parent){
		this._parent=parent;																//pointer to parent
		this._initContent();																//make e.v, the element where content is displayed
		this._setAttrC('v','');																//attribute _ signifies that this is the content (useful for CSS)
		this._title.className='title';
		this._content._item=this._element._item=this._outterElement._item=this;
		this._setAttr('type',this.type);													//attribute type signifies type (useful for CSS)
		this._level=parent._level+1;
		this._setAttr('level',this._level);													//attribute type signifies type (useful for CSS)
		if(prop.id){
			this._setAttr('id',prop.id);													//set id
			this.title(prop.id);
		}
		this._prop={};
		this._update(prop);																	//refresh attributes based on self and parent property values
		prop=this._getParentProps();
		for(var propName in prop)
			this._refreshProp(propName,prop[propName]);
	}
	_initContent(){
		this._element=document.createElement('div');										//make element
		this._title=this._element.appendChild(document.createElement('div'));
		this._content=this._element.appendChild(document.createElement('div'));				//e.v is a sub-element where content is displayed
		this._parent._placeChildElement(this);
	}
	_getParentProps(){
		//TODO: (optimization) store and return stored value based on whether this info is outdated (e.g. based on msg# or time)
		var props={};
		for(var parent=this._parent;parent;parent=parent._parent){
			for(var propName in parent._prop)
				if(!(propName in parent || propName in this._prop || propName in props))
					props[propName]=parent._prop[propName];
		}
		return props;
	}
	_attr(attr){return this._element.getAttribute(attr);}
	_setAttr(attr,val){
		if(val===null)this._element.removeAttribute(attr);
		else this._element.setAttribute(attr,val);
	}
	_attrC(attr){return this._content.getAttribute(attr);}
	_setAttrC(attr,val){
		if(val===null)this._content.removeAttribute(attr);
		else this._content.setAttribute(attr,val);
	}
	_typeCheck(type){return (!type)||(type===this.constructor);}
	_animatable(propName){return gui.ANIMATABLE.has(propName)}
	_animate(prop){
		var animate=prop.S,aniopt={},curopt={},e=this;
		delete prop.S;
		//check which properties an be animated
		for(var optKey in prop){
			if(this._animatable(optKey)){
				if(gui.COLOROPTIONS.has(optKey)){
					curopt[optKey]=this._prop[optKey]||this._getParentProps()[optKey]||'rgba(0,0,0,0)';
					aniopt[optKey]=gui.getColor(prop[optKey])||prop[optKey];
				}else{
					curopt[optKey]=this._prop[optKey]||this._getParentProps()[optKey]||0;
					aniopt[optKey]=prop[optKey];
				}
				delete prop[optKey];
			}
		}
		//animate properties
		if(Object.keys(aniopt).length){
			var ani={};
			aniopt.onUpdate=function(prop){
				if(document.body.contains(e._element))e._update(prop);
				else ani.ani.kill();
			};
			aniopt.onUpdateParams=[curopt];
			if(prop.R&2){
				aniopt.onComplete=function(){gui.sendAction(('Q' in prop)?prop.Q:(e._prop.id||e._getIndex()),[2]);};
			}
			ani.ani=TweenLite.to(curopt,animate,aniopt);
		}
	}
	_update(prop){
		if(prop.R&1)gui.sendAction(('Q' in prop)?prop.Q:(this._prop.id||this._getIndex()),[1]);
		if(prop.S)this._animate(prop);
		Object.assign(this._prop,prop);
		for(var propName in prop){
			this._refreshProp(propName,prop[propName]);
			if(prop[propName]===null)delete prop[propName];
		}
	}
	_refreshProp(propName,propValue){
		if(propName in this)this[propName](propValue);
		else this._default(propValue,propName);
	}
	_value(v){
		this._prop.v=v;
		this.v(v);
	}
	_default(){}
	_getIndex(){
		var i=0,e=this._outterElement;
		while((e=e.previousElementSibling)!==null)++i;
		return i;
	}
	_match(query){
		if(query.constructor===String){
			if(this._prop.id===query)return true;
			if(this._prop['#']&&this._prop['#'].indexOf(query)>-1)return true;
		}else if(query.constructor===Object){
			for(var q in query)
				if(q==='type'){
					if(this.type==='text'){
						if(query.type!=="")return false;
					}else if(this.type==='number'){
						if(query.type.constructor!==Number)return false;
					}else if(this.type==='boolean'){
						if(query.type.constructor!==Boolean)return false;
					}else if(this.type==='container'){
						if(query.type.constructor!==Array)return false;
					}else if(query.type!==this.type){
						return false;
					}
				}else{
					if(query[q]!==this._prop[q])return false;
				}
			return true;
		}
	}
	_sendAction(v){
		var elementid=this._prop.id||this._getIndex();
		if(this._patronym>0){
			var fullname=[elementid];
			for(var i=0,parent=this._parent;parent && (i++)<this._patronym;parent=parent._parent)
				fullname.push(parent._prop.id||parent._getIndex());
			elementid=fullname.length>1?fullname:elementid;
		}
		gui.sendAction(elementid,v);
		this.O();
	}
	v(v){this._setAttrC('v',v);}
	id(){}
	title(v){this._title.innerText=(v===null||v===undefined)?this._prop.id:v;}
}
gui.types={};
//////////////////////////////////////////////////////////////////////////////
// text items
addCSS(`
	[type='text'] > .title:empty {display:none}
	[type='text'] > .title:not(empty) {border-bottom:solid 1px var(--colorBorder);width:25%;}
	[type='text'] > [v]:empty:before {content: attr(v) " ";display:inline-block;}
`);
gui.Text=class extends gui.Item{}
gui.Text.prototype.type='text';
//////////////////////////////////////////////////////////////////////////////
// number items
addCSS(`
	[type='number'] > .title:empty {display:none}
	[type='number'] > .title:not(empty) {border-bottom:solid 1px var(--colorBorder);width:25%;}
	[type='number'] > [v]:empty:before {content: attr(v) " ";display:inline-block;}
`);
gui.Number=class extends gui.Item{
	_animatable(propName){return propName==='v' || gui.ANIMATABLE.has(propName)}
}
gui.Number.prototype.type='number';
//////////////////////////////////////////////////////////////////////////////
// boolean items
addCSS(`
	[type="boolean"]{
		text-align:left;
		cursor:pointer;
	}
	[type="boolean"]:active, [type="boolean"][v="true"] {
		background-color:var(--colorTrue) !important;
	}
	[type="boolean"][select="-1"], [type="boolean"][select="0"] {
		min-width:100px;
		text-align:center;
		display:inline-block;
		padding:.4em;
		color:var(--color1);
		border:1px solid rgba(0,0,0,0.2);
		background-color:var(--colorFalse);
		box-shadow: 0 0 5px -1px rgba(0,0,0,0.2);
		cursor:pointer;
		vertical-align:middle;
		border-radius:4px;
	}
	[type="boolean"][select="1"], [type="boolean"][select="2"] {
		display:block;
	}
	[type="boolean"][select="1"][v="false"]:before {content:"\\029be" " ";display:inline; !important}
	[type="boolean"][select="1"][v="true"]:before {content:"\\029bf" " ";display:inline; !important}
	[type="boolean"][select="2"][v="false"]:before {content:"\\2610" " ";display:inline; !important}
	[type="boolean"][select="2"][v="true"]:before {content:"\\2611" " ";display:inline; !important}
	[type="boolean"][eB="0"] {pointer-events:none; opacity:.5; contenteditable:false}
`);
gui.Boolean=class extends gui.Item{
	_initContent(){
		this._element=document.createElement('div');			//make element inside parent
		this._content=this._element;
		this._title=this._element;
		this._parent._placeChildElement(this);
	}
	v(v){
		this._setAttrC('v',v);
		if(v && this._prop.select==-1){
			var e=this;
			e._prop.v=false;
			setTimeout(function(){e._setAttrC('v',false);},250);
		}
	}
}
gui.Boolean.prototype.type="boolean";
gui.Boolean.prototype.eB=function(v){this._setAttr('eB',v);};
gui.Boolean.prototype.select=function(v){
	this._setAttr('select',v);
	var item=this;
	this.v=this.__proto__.v;
	if(v===0){
		this._element.onclick=null;
		this._element.onmousedown=function(){					//onmousedown behavior
			item._value(true);
			item._sendAction(true);
		}
		this._element.onmouseup=function(){						//onmouseup behavior
			item._value(false);
			item._sendAction(false);
		}
	}else{
		this._element.onmousedown=this._element.onmouseup=null;
		if(v===-1){
			this._element.onclick=function(){						//onclick behavior
				item._sendAction(true);
			}
			this.v=function(v){
				this._setAttrC('v',v);
				if(v){
					this._prop.v=false;
					setTimeout(function(){item._setAttrC('v',false);},250);
				}
			}
		}else if(v===1){
			//TODO: when switch to this from v===2, clear all (but 1?) selections
			this._element.onclick=function(){									//select/deselect behavior
				var selectParent=item._parent;
				while(selectParent._prop.select!==1 && selectParent!==gui.rootContainer)
					selectParent=selectParent._parent;
				if(selectParent._prop.select!==1)selectParent=e._parent;
				if(item._prop.v){
					item._sendAction(false);
					item._value(false);
					selectParent._selected=false;
				}else{
					item._sendAction(true);
					item._value(true);
					if(selectParent._selected)selectParent._selected._value(false);
					selectParent._selected=item;
				}
			};
		}else if(v===2){
			this._element.onclick=function(){									//select/deselect behavior
				if(item._prop.v){
					item._sendAction(false);
					item._value(false);
				}else{
					item._sendAction(true);
					item._value(true);
				}
			};
		}
	}
};
//////////////////////////////////////////////////////////////////////////////
// containers
addCSS(`
	[type='container'] > .title:empty {display:none}
	[type='container'] > .title:not(empty) {border-bottom:solid 1px var(--colorBorder);width:25%;}
`);
gui.Container=class extends gui.Item{
	_initContent(){
		super._initContent();
		this._childmap={};
	}
	*[Symbol.iterator](){
		for(var i=this._content.children.length;i--;)
			yield this._content.children[i]._item;
	}
	_getChild(id){
		if(typeof(id)==='number'){								//find child by order
			var childElement=this._content.children[id];
			if(childElement)return childElement._item;
		}else if(typeof(id)==='string')							//find child by id
			return this._childmap[id];
	}
	_placeChildElement(child){
		this._content.appendChild(child._element);
		child._outterElement=child._element;
	}
	_newChild(prop){
		var type=gui.getType(prop);
		if(!type){
			type=gui.Container;
			prop.v=[];
		}
		var child=new type(prop,this);
		if(typeof(prop.id)!=='number')this._childmap[prop.id]=child;
	}
	_processChild(child,prop){
		if(prop.v===null){										//if value is null, remove child
			if(child._prop.id)delete this._childmap[child._prop.id];
			this._content.removeChild(child._outterElement);
		}else{
			var propType=gui.getType(prop);
			if(child._typeCheck(propType)){
				child._update(prop);							//if value compatible, update child properties
			}else{												//if value incompatible, replace child with new one
				if(child._prop.id)prop.id=child._prop.id;		//correct id type in case prop.id was a number
				var newchild=new propType(Object.assign({},child._prop,prop),this);
				this._content.replaceChild(newchild._outterElement,child._outterElement);
				if(child._prop.id)this._childmap[prop.id]=newchild;
			}
		}
	}
	_search(prop){
		var child;
		if(prop.$===false){
			for(child of this)
				this._processChild(child,Object.assign({},prop));
		}else{
			for(child of this){
				if(child){
					if(prop.$===true||child._match(prop.$))
						this._processChild(child,Object.assign({},prop));
					if(child instanceof gui.Container)
						child._search(prop);
				}
			}
		}
	}
	_processProp(prop){
		if(prop.U){		//optional delay
			let delay=prop.U-gui.ums(),e=this;
			delete prop.U;
			setTimeout(function(){e._processProp(prop);},delay);
			return;
		}
		if(prop.T){		//optional delay
			let delay=prop.T*1000,e=this;
			delete prop.T;
			setTimeout(function(){e._processProp(prop);},delay);
			return;
		}
		if('$' in prop){
			this._search(prop);
		}else{
			var child;
			if('id' in prop){
				child=this._getChild(prop.id);
				if(prop.id.constructor===Number)delete prop.id;
			}
			if(child){										//if child exists
				this._processChild(child,prop);
			}else if(prop.v!==null){						//new child
				this._newChild(prop);
			}
		}
	}
	_default(propValue,propName){
		for(var child of this){
			if(child){
				if(propName in child && !(propName in child._prop))child[propName](propValue);
				else child._default(propValue,propName);
			}
		}
	}
	v(updates){		//cycle through all updates for this container
		for(var i of updates)this._processProp(gui.prop(i));
	}
}
gui.Container.prototype.type='container';
//////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////
// onload: initiate rootContainer and connect to task software
(function(){
	//////////////////////////////////////////////////////////////////////////////
	// init window and connect to task
	function init(){
		//create foundational element
		document.body._level=-1;
		document.body._content=document.body;
		document.body._placeChildElement=function(child){
			this._content.appendChild(child._element);
			child._outterElement=child._element;
		}
		gui.rootContainer=new gui.Container({select:-1},document.body);
		gui.rootContainer._parent=undefined;
		gui.rootContainer.error=gui.error;
		gui.rootContainer.require=gui.require;
		gui.rootContainer.agent=gui.agent;
		gui.rootContainer.template=gui.template;
		//connect to task
		if(task.userAction){
			//if task code is client-side script...
			connectToTaskScript();
		}else if(task.location || location.params.l){
			// load url if one is supplied...
			gui(['Loading...']);
			task.location=task.location || location.params.l;
			if(task.location.startsWith('ws://') || task.location.startsWith('wss://'))
				connectToTaskWS();
			else
				connectToTaskHTTP();
		}else{
			gui(['Hey there...',{id:'Intersted in the STAP?',v:[
				'https://github.com/vdv7/stap',
				'https://github.com/vdv7/stapjs',
				'https://github.com/vdv7/actr-stap']}]);
		}
	}
	function onTaskConnect(){
		gui(null);
		gui.startTime=(new Date()).getTime();
		gui.sendAction(0,[0]);
		window.addEventListener('unload',function(){gui.sendAction(0,[1]);},false);
	}
	function connectToTaskScript(){
		//	connect gui.action to task.userAction
		if(task.userAction)gui.action = task.userAction;
		//	connect task.updateUI to gui.update;
		task.updateUI = gui;
		task.ui=gui;
		//	define task.end
		task.end=function(){};
		//	start task
		onTaskConnect();
		if(task.start)task.start();
	}
	function connectToTaskHTTP(){
		function onReady(){
			if(this.readyState==4 && this.status==200){
				var parrot,append;
				this.getAllResponseHeaders().split('\n').forEach(line=>{
					if(line.substr(0,9).toLowerCase()==('x-parrot:'))parrot=line.substr(10);
					if(line.substr(0,16).toLowerCase()==('x-append-to-url:'))append=line.substr(17);
				});
				gui.httpParrotHeader=parrot;
				gui.httpAppendToURL=append;
				try{gui(JSON.parse(this.responseText));}
				catch(e){console.error('Could not parse response.\n',this.responseText);}
			}
		}
		function post(url,body=''){
			var xhttp = new XMLHttpRequest();
			xhttp.onreadystatechange = onReady;
			if(gui.httpAppendToURL)url+=(url.indexOf('?')==-1?'?':'&')+gui.httpAppendToURL;
			xhttp.open("POST",url, true);
			if(gui.httpParrotHeader)xhttp.setRequestHeader('X-parrot',gui.httpParrotHeader);
			xhttp.send(body);
		}
		gui.action=function(time,id,val){
			post(task.location,JSON.stringify([time,id,val]));
		}
		onTaskConnect();
	}
	function connectToTaskWS(){
		logToConsole();
		if("WebSocket" in window){
			gui.action = function(time,id,val){
				ws.send(JSON.stringify([time,id,val]));
			}
			ws=new window.WebSocket(task.location);
			ws.onerror=function(e){gui(null);gui({'error':'Cannot establish connection to '+task.location});};
			ws.onopen=onTaskConnect;
			ws.onclose=function(event){
				console.log('Connection closed ('+event.code+').');
				//gui(['Connection closed.']);
			};
			ws.onmessage=function(msg){
				gui(JSON.parse(msg.data));
			};
		}else{
			gui(null);
			gui([{id:'Error',v:'Your browser does not support websockets. Please use a modern browser to run this application.'}]);
		}
	}
	//////////////////////////////////////////////////////////////////////////////
	window.addEventListener("load",init);
})();
//////////////////////////////////////////////////////////////////////////////





//
// above this line are:
//   core STAP text&button features, search ($), timing (QRSTU), and some button/radio/checkbox options (select,eB)
//////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////
// below this line are:
//   additional UI features (e.g. tables, inputs, emphasized text)
//





//////////////////////////////////////////////////////////////////////////////
// additional common options

gui.Item.prototype.P=function(v){
	var insertBefore=this._parent._getChild(v);
	if(insertBefore)this._parent._content.insertBefore(this._outterElement,insertBefore._outterElement);
};

gui.Item.prototype.O=function(){
	//TODO: this currently doesn't account for QRTU
	if(this._onedit!==undefined){
		this._parent._processChild(this,gui.prop(this._onedit));
	}
	for(var parent=this._parent;parent;parent=parent._parent){
		if(parent._prop.onsubedit){
			if(parent._parent)
				parent._parent._processChild(parent,gui.prop(parent._prop.onsubedit));
			else
				gui(gui.prop(parent._prop.onsubedit));
			break;
		}
	}
}

gui.Text.prototype.onedit=function(v){this._onedit=v;};
gui.Number.prototype.onedit=gui.Text.prototype.onedit;
gui.Boolean.prototype.onedit=gui.Text.prototype.onedit;

gui.Container.prototype.onsubedit=function(){}

gui.Text.prototype.patronym=function(v){this._patronym=v;}
gui.Number.prototype.patronym=gui.Text.prototype.patronym;
gui.Boolean.prototype.patronym=gui.Text.prototype.patronym;

addCSS(`
	[emp="1"] {font-weight:bold}
	[emp="2"] {font-weight:bold;font-style:italic}
	[emp="3"] {font-weight:bold;font-style:italic;text-decoration:underline}
	[emp="4"] {font-weight:bold;font-style:italic;text-decoration:underline;font-size:110%}
	[emp="5"] {font-weight:bold;font-style:italic;text-decoration:underline;font-size:120%}
	[emp2="1"] {background-color:rgba(255,255,0,.2);box-shadow: 0 0 0px 4px rgba(255,255,0,0.2);}
	[emp2="2"] {background-color:rgba(255,255,0,.4);box-shadow: 0 0 0px 4px rgba(255,255,0,0.3);}
	[emp2="3"] {background-color:rgba(255,255,0,.6);box-shadow: 0 0 0px 4px rgba(255,255,0,0.4);}
	[emp2="4"] {background-color:rgba(255,255,0,.8);box-shadow: 0 0 0px 4px rgba(255,255,0,0.5);}
	[emp2="5"] {background-color:rgba(255,255,0,1);box-shadow: 0 0 5px -1px rgba(255,255,0,0.6);}
`);
gui.Item.prototype.emp=function(v){this._setAttr('emp',v)};
gui.Item.prototype.emp2=function(v){this._setAttr('emp2',v)};

gui.Item.prototype.opc=function(v){this._element.style.opacity=v;};

gui.Item.prototype.bg=function(v){this._element.style.background=gui.color(v);};

gui.Item.prototype.c=function(v){this._element.style.color=gui.color(v);};

gui.Item.prototype.fnt=function(v){this._element.style.font=v;};

gui.Item.prototype.bd=function(v){this._element.style.borderStyle=v;};

gui.Item.prototype.bdc=function(v){this._element.style.borderColor=gui.color(v);};

gui.Item.prototype.bdw=function(v){this._element.style.borderWidth=v;};

gui.Item.prototype.pad=function(v){this._element.style.padding=v;};

gui.Item.prototype.r=function(v){this._element.style.borderRadius=v+'px';};

gui.Item.prototype.w=function(v){this._element.style.width=v;};

gui.Item.prototype.h=function(v){this._element.style.height=v;};

gui.Item.prototype.z=function(v){this._element.style.zIndex=10+v;};

gui.Item.prototype.rot=function(v){this._element.style.setProperty('transform','rotate('+v+'deg)');};

addCSS(`
	[x],[y] {position:absolute;margin:0px}
	[childPos] > [v] {margin:0px;position:absolute;top:0px;left:0px;overflow:visible}
`);
gui.Container.prototype._hasPositionedElements=function(){	//enables Item.x and Item.y behavior
	for(var i of this)
		if(getComputedStyle(i._element).position==='absolute')
			return true;
	return null;
}
gui.Item.prototype.x=function(v){
	this._element.style.left=v;
	this._setAttr('x',v);
	this._parent._setAttr('childPos',this._parent._hasPositionedElements());
};
gui.Item.prototype.y=function(v){
	this._element.style.top=v;
	this._setAttr('y',v);
	this._parent._setAttr('childPos',this._parent._hasPositionedElements());
};

/*
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
*/
//////////////////////////////////////////////////////////////////////////////


//////////////////////////////////////////////////////////////////////////////
// additional text options
addCSS(`
	[contenteditable=true] {background-color:white;min-width:100px;padding-left:5px;padding-right:5px;border:solid 1px lightgray;font-family:monospace}
`);
gui.Text.prototype.eT=function(v){
	var c=this._content;
	c._removeListeners();
	if(v>0){
		c.setAttribute('contenteditable',v>0);
		c._listen('paste',function(e){
			e.preventDefault();
			var txt=e.clipboardData.getData("text/plain");
			document.execCommand("insertText",false,(v&1)?txt.replace(/\n|\r/g,' '):txt);
		});
		c._listen('input',()=>{c.setAttribute('v',c.innerText);c._item._prop.v=c.innerText;});
		if(v==4){
			c._listen('input',()=>{c._item._sendAction(c.innerText)});
		}else if(v==3){
			c._listen('keypress',(e)=>{if(e.keyCode==13){e.preventDefault()}});
			c._listen('input',()=>{c._item._sendAction(c.innerText)});
		}else if(v==2){
			c._listen('blur',()=>{c._item._sendAction(c.innerText)});
		}else{
			c._listen('blur',()=>{c._item._sendAction(c.innerText)});
			c._listen('keypress',(e)=>{if(e.keyCode==13){e.preventDefault();c._item._sendAction(c.innerText)}});
		}
	}else{
		c.removeAttribute('contenteditable');
	}
};
//////////////////////////////////////////////////////////////////////////////


//////////////////////////////////////////////////////////////////////////////
// additional number options
addCSS(`
	[type='number'] > [unit]:after {content: attr(unit);}
`);
gui.Number.prototype.eN=function(v){
	var c=this._content;
	c._removeListeners();
	if(v>0){
		c.setAttribute('contenteditable',v>0);
		c._listen('paste',(e)=>{
			e.preventDefault();
			var v=parseFloat(e.clipboardData.getData("text/plain"));
			if(!isNaN(v))
				document.execCommand("insertText", false, v);
		});
		function send(){
			if(c.innerText && c.innerText!=c.getAttribute('v')){
				c._value(parseFloat(c.innerText));
				c.innerText='';
				c._item._sendAction(c._item._prop.v);
			}
		}
		c._listen('blur',send);
		c._listen('keypress',(e)=>{
			if(e.keyCode==13){
				e.preventDefault();
				send();
			}else if(e.key && '0123456789e.'.indexOf(e.key)==-1){
				e.preventDefault();
			}
		});
	}else{
		c.removeAttribute('contenteditable');
	}
};
gui.Number.prototype.unit=function(v){this._setAttrC('unit',v);};
gui.Number.prototype.max=function(v){this._max=(v===null)?undefined:v;this.v(this._prop.v);};
gui.Number.prototype.min=function(v){this._min=(v===null)?undefined:v;this.v(this._prop.v);};
gui.Number.prototype.rnd=function(v){this._rnd=(v===null)?undefined:v;this.v(this._prop.v);};
gui.Number.prototype.time=function(v){this._setAttr('time',v);this.v(this._prop.v);};
gui.Number.prototype.v=function(v){
	if(this._min!==undefined)v=Math.max(v,this._min);
	if(this._max!==undefined)v=Math.min(v,this._max);
	if(this._rnd!==undefined)v=Math.round2(v,this._rnd);
	if(this._attr('time'))v=new Date(v*1000).format(this._attr('time'));
	this._setAttrC('v',v);
}
//////////////////////////////////////////////////////////////////////////////


//////////////////////////////////////////////////////////////////////////////
// html
gui.Html=class extends gui.Text{
	v(v){this._content.innerHTML=v;}
}
gui.Html.prototype.type='html';
gui.Html.prototype.eT=function(v){
	var c=this._content;
	c._removeListeners();
	if(v>0){
		c.setAttribute('contenteditable',v>0);
		c.innerText=c.innerHTML;
		c._listen('paste',function(e){
			e.preventDefault();
			var txt=e.clipboardData.getData("text/plain");
			document.execCommand("insertText",false,(v&1)?txt.replace(/\n|\r/g,' '):txt);
		});
		c._listen('input',()=>{c.setAttribute('v',c.innerText);c._item._prop.v=c.innerText;});
		if(v==4){
			c._listen('input',()=>{c._item._sendAction(c.innerText)});
		}else if(v==3){
			c._listen('keypress',(e)=>{if(e.keyCode==13){e.preventDefault()}});
			c._listen('input',()=>{c._item._sendAction(c.innerText)});
		}else if(v==2){
			c._listen('blur',()=>{c._item._sendAction(c.innerText)});
		}else{
			c._listen('blur',()=>{c._item._sendAction(c.innerText)});
			c._listen('keypress',(e)=>{if(e.keyCode==13){e.preventDefault();c._item._sendAction(c.innerText)}});
		}
	}else if(c.getAttribute('contenteditable')){
		c.removeAttribute('contenteditable');
		c.innerHTML=c.innerText;
	}
};
//////////////////////////////////////////////////////////////////////////////


//////////////////////////////////////////////////////////////////////////////
// table
addCSS(`
	[type="table"] {display:flex;flex-direction:column}
	[type="table"] > div {overflow:auto;flex:1 1 auto}
	table { 
		border-spacing: 0;
		border-collapse: collapse;
	}
	table[head="1"] > tr:first-child > * {
		font-weight:bold;
		background:var(--colorHead);
		z-index:1;
	}
`);
gui.Table=class extends gui.Container{
	_initContent(){
		this._element=document.createElement('div');											//make element inside parent
		this._title=this._element.appendChild(document.createElement('span'));
		this._tableFrame=this._element.appendChild(document.createElement('div'));
		this._tableFrame.style.overflow='auto';
		this._content=this._tableFrame.appendChild(document.createElement('table'));				//e.v is a sub-element where content is displayed
		this._parent._placeChildElement(this);
		this._childmap={};
	}
	_newChild(prop){
		var type=gui.getType(prop);
		if(!type){
			type=gui.Container;
			prop.v=[];
		}
		if(type==gui.Container){
			var child=new gui.TableRow(prop,this);
			if(typeof(prop.id)!=='number')this._childmap[prop.id]=child;
		}
	}
	_typeCheck(type){return (!type)||(type===this.constructor)||(type===gui.Container);}
}
gui.Table.prototype.type='table';
gui.TableRow=class extends gui.Container{
	_initContent(){
		this._element=document.createElement('tr');				//e.v is a sub-element where content is displayed
		this._title=this._element.appendChild(document.createElement('td'));
		this._content=this._element;
		this._parent._placeChildElement(this);
		this._childmap={};
	}
	_placeChildElement(child){
		var td=this._content.appendChild(document.createElement('td'));
		td.appendChild(child._element);
		child._outterElement=td;
	}
	_typeCheck(type){return (!type)||(type===this.constructor)||(type===gui.Container);}
}
gui.TableRow.prototype.type='tableRow';
gui.Table.prototype._floatRow=function(e){
	var translate=this.scrollTop?"translate(0,"+(this.scrollTop-3)+"px)":null;
	var p=this.firstChild.firstChild.querySelectorAll('td');
	for(var i in p)if(p[i] && p[i].style)p[i].style.transform = translate;
}
gui.Table.prototype.head=function(v){
	this._setAttrC('head',v);
	if(v)this._tableFrame.addEventListener('scroll',this._floatRow);
	else{
		this._content.firstChild.style.transform=null;
		this._tableFrame.removeEventListener('scroll',this._floatRow);
	}
}
//////////////////////////////////////////////////////////////////////////////


