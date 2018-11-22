/*base html5 template for STAP visualization (STAP spec v7.16.201811121)

	What is STAP? 
		http://stap7.github.io/


	Are all optional UI component types and properties from the STAPv7.11 spec implemented in stapjs?
		Not yet.
			The STAP API does not require for all features to be implemented on user-agent software.
			Any features that are required by task-side software (declared via the "require" command)
			that are yet to be implemented will send an {"error":"..."} message back to task-side software.


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
			if(rules[x].selectorText.indexOf(selector)>-1)
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
			console.warn('Not sure how to handle '+url+'.\nWill try to add as <style>...');
			addCSS(url);
		}
		onload();
		return;
	}
	if(fileref){
		fileref.onreadystatechange=onload;
		fileref.onload=onload;
		try{
			var urlo=new URL(url);
			fileref.onerror=function(){
				load(urlo.pathname.split('/').pop(),onload,onerror,type);
			}
		}catch(e){
			fileref.onerror=onerror||function(e){console.error(e);onload();};
		}
		document.head.appendChild(fileref);
	}
}
Math.round2=(n,r)=>Math.round(n/r)*r;
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
function createSVG(type){return document.createElementNS("http://www.w3.org/2000/svg",type);}
function objectify(o){
	var r={};
	for(var key in o)
		if(typeof(o[key])=='object')r[key]=objectify(o[key]);
		else r[key]=o[key];
	return r;
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


function gui(data,log=true){
	if(log)logline('>',data);
	data=Object.assign({},gui.prop(data));
	if('id' in data && data.id.constructor===Array){
		data.id.unshift(0);
	}else{
		data.id=0;
	}
	gui.rootOrigin._processProp(data);
}

gui.REQUIRED={
	S:[
		"https://cdnjs.cloudflare.com/ajax/libs/gsap/2.0.1/TweenLite.min.js",
		"https://cdnjs.cloudflare.com/ajax/libs/gsap/2.0.1/plugins/ColorPropsPlugin.min.js",
		// "https://cdnjs.cloudflare.com/ajax/libs/gsap/1.19.0/plugins/CSSPlugin.min.js",
		// "https://cdnjs.cloudflare.com/ajax/libs/gsap/1.19.0/plugins/AttrPlugin.min.js",
		// "https://cdnjs.cloudflare.com/ajax/libs/gsap/1.19.0/plugins/TextPlugin.min.js",
		"TweenLite.defaultEase = Linear.easeNone;"
	],
	ease:"https://cdnjs.cloudflare.com/ajax/libs/gsap/2.0.1/easing/EasePack.min.js",
	Mkdn:["https://cdn.jsdelivr.net/npm/marked/marked.min.js","gui.markdown=marked;"]
};
gui.OPTIONS=new Set(['*','O','P','Q','R','S','T','U','ease','easeout']);
gui.OPTION_VALUES_IMPLEMENTED={
	select:v=>[-1,0,1,2].indexOf(v)!==-1,
	ease:v=>(v in gui.EASE)
};
gui.COLOROPTIONS=new Set(['bg','c','lc']);
gui.SIZEOPTIONS=['x','y','w','h','lw'];
gui.ANIMATABLE=new Set(['x','y','w','h','bg','lw','lc','c','rot']);
gui.EASE={0:'Power0',1:'Power1',2:'Power2',3:'Power3',4:'Power4',back:'Back',elastic:'Elastic',bounce:'Bounce'};
gui.ums=function(){return (new Date()).getTime()-gui.startTime;};
gui.sendAction=function(id,value){
	var time=gui.ums();
	logline('<',[time,id,value]);
	gui.action(time,id,value);
};
gui.defaultType=function(v){return {object:gui.Bin,string:gui.Txt,number:gui.Num,boolean:gui.Btn}[typeof(v)]};
gui.getType=function(prop){
	//TODO: deal w/ prop==null
	if(prop.type){
		var type=prop.type.charAt(0).toUpperCase()+prop.type.slice(1);
		if(type in gui)return gui[type];
	}
}
gui.prop=x=>(x===null||x.constructor!==Object)?{v:x}:x;
gui.getColor=v=>getComputedStyle(document.body).getPropertyValue('--color'+v);
gui.color=v=>gui.getColor(v)?`var(--color${v})`:v;
gui.queue={};
gui.animations={};

//////////////////////////////////////////////////////////////////////////////
// task (root-level container)
gui.error=function(v){console.error(v);}
gui.require=function(require){
	var errors,errorScreen=[];
	var TYPES=new Set([gui.Item,gui.Txt,gui.Num,gui.Btn,gui.Bin]);
	if(require.type){
		if(require.type.constructor!==Array)require.type=[require.type];
		errors=[];
		for(var i=0;i<require.type.length;++i){
			if(require.type[i]){
				type=require.type[i][0].toUpperCase()+require.type[i].substr(1);
				if(type in gui.REQUIRED){
					delete require.type[i];
					load(gui.REQUIRED[type],
							function(){
								TYPES.add(gui[type]);
								gui.require(require);
							});
					return;
				}else if(gui[type]){
					TYPES.add(gui[type]);
				}else
					errors.push(type);
			}
		}
		if(errors.length){
			gui.sendAction(0,{error:'Sorry, I cannot handle the required value type(s): '+errors});
			errorScreen.push({id:'Cannot handle required value type(s)',v:errors});
		}
		delete require.type;
	}
	//collect all options
	for(var type of TYPES){
		for(var propName of Object.getOwnPropertyNames(type.prototype)){
			if(type.prototype[propName].call && !propName.startsWith("_"))
				gui.OPTIONS.add(propName);
		}
	}
	if(require.options){
		errors=[];
		for(var propName of require.options){
			if(!gui.OPTIONS.has(propName))
				errors.push(propName);
			else if(propName in gui.REQUIRED)
				load(gui.REQUIRED[propName]);
		}
		if(errors.length){
			gui.sendAction(0,{error:'Sorry, I cannot handle the required property option(s): '+errors});
			errorScreen.push({id:'Cannot handle required property option(s)',v:errors});
		}
		delete require.options;
	}
	if(require.emphases){
		errors=[];
		for(var emp in require.emphases){
			if(!gui.Item.prototype.hasOwnProperty(emp)){
				errors.push(emp);
			}else{
				for(var i=1;i<=require.emphases[emp];i++){
					if(!findCSSrule(`[${emp}="${i}"]`))
						errors.push(`${emp}=${i}`);
				}
			}
		}
		if(errors.length){
			gui.sendAction(0,{error:'Sorry, I cannot handle required emphasis type(s): '+errors});
			errorScreen.push({id:'Cannot handle required emphasis type(s)',v:errors});
		}
		delete require.emphases;
	}
	if(require.shape){
		errors=[];
		for(var i=0;i<require.shape.length;i++){
			if(!findCSSrule(`[shape="${require.shape[i]}"]`))
				errors.push(require.shape[i]);
		}
		if(errors.length){
			gui.sendAction(0,{error:'Sorry, I cannot handle required shape(s): '+errors});
			errorScreen.push({id:'Cannot handle required shape(s)',v:errors});
		}
		delete require.shape;
	}
	if(require.shapes){
		errors=[];
		for(var i=1;i<=require.shapes;i++)
			if(!findCSSrule(`[shape="${i}"]`) && !findCSSrule(`[shape=${i}]`))
				errors.push(i);
		if(errors.length){
			gui.sendAction(0,{error:'Sorry, I cannot handle required shape(s): '+errors});
			errorScreen.push({id:'Cannot handle required shape(s)',v:errors});
		}
		delete require.shapes;
	}
	if(require.colors){
		errors=[];
		for(var i=0;i<=require.colors;++i)
			if(!gui.getColor(i))
				errors.push(i);
		if(errors.length){
			gui.sendAction(0,{error:'Sorry, I cannot handle required color(s): '+errors});
			errorScreen.push({id:'Cannot handle required color(s)',v:errors});
		}
		delete require.colors;
	}
	for(var propName in require){
		if(!gui.OPTIONS.has(propName)){
			gui.sendAction(0,{error:'Sorry, I cannot handle required option: '+propName});
			errorScreen.push({id:'Cannot handle required property option(s)',v:[propName]});
		}else{
			if(propName in gui.OPTION_VALUES_IMPLEMENTED){
				if(require[propName].constructor!==Array)require[propName]=[require[propName]];
				for(var v of require[propName]){
					if(!gui.OPTION_VALUES_IMPLEMENTED[propName](v)){
						gui.sendAction(0,{error:'Sorry, I cannot handle required option-value: {'+propName+':'+v+'}'});
						errorScreen.push({id:'Cannot handle required property option(s)',v:['{'+propName+':'+v+'}']});
					}
				}
			}
		}
		if(!errorScreen.length){
			if(propName in gui.REQUIRED){
				load(gui.REQUIRED[propName]);
			}
		}
	}
	if(errorScreen.length){
		gui(null);
		gui([{id:'Error',v:errorScreen}]);
		if(ws)ws.close();
	}
};
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
--color5: red;
--color6: green;
--color7: blue;
}
body {background-color:var(--color0);color:var(--color1);font-size:18pt;}
[level="-1"],[level="0"],[level="-1"]>*,[level="0"]>* {margin:0px;padding:0px;width:100%;height:100%;}
[level] {border:solid 0px var(--color1)}
div {position:relative;box-sizing:border-box;font-size:96%;flex:0 0 auto;flex-direction:column;margin:3px;}
.title:not(empty):not(td) {white-space:nowrap;}
[v] {overflow:auto}
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
		this._prop={id:prop.id};
		this._initDefaults();
		this._update(prop);																	//refresh attributes based on self and parent property values
		for(var propName in this._parent._defaults)
			if(!(propName in this._prop))
				this._refreshProp(propName,this._parent._defaults[propName]);
	}
	_initContent(){
		this._element=document.createElement('div');										//make element
		this._title=this._element.appendChild(document.createElement('div'));
		this._content=this._element.appendChild(document.createElement('div'));				//e.v is a sub-element where content is displayed
		this._parent._placeChildElement(this);
	}
	// _initDefaults(){this._defaults=Object.assign({},this._parent._defaults);}
	_initDefaults(){}
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
	_animatable(propName){return gui.ANIMATABLE.has(propName)}
	_animate(prop){
		var animate=prop.S,aniopt={},curopt={},e=this;
		delete prop.S;
		//check which properties an be animated
		for(var optKey in prop){
			if(this._animatable(optKey)){
				if(gui.COLOROPTIONS.has(optKey)){
					curopt[optKey]=this._prop[optKey]||'rgba(0,0,0,0)';
					aniopt[optKey]=gui.getColor(prop[optKey])||prop[optKey];
				}else{
					curopt[optKey]=this._prop[optKey]||this._defaults[optKey]||0;
					aniopt[optKey]=prop[optKey];
				}
				delete prop[optKey];
			}
		}
		//animate properties
		if(Object.keys(aniopt).length){
			var ani={};
			//check easing options
			if(prop.ease){
				if(prop.easeout==-1)aniopt.ease=window[gui.EASE[prop.ease]].easeIn;
				else if(prop.easeout==0)aniopt.ease=window[gui.EASE[prop.ease]].easeInOut;
				else aniopt.ease=window[gui.EASE[prop.ease]].easeOut;
				delete prop.ease;
				delete prop.easeout;
			}
			//set up animation 
			aniopt.onUpdate=function(prop){
				if(document.body.contains(e._element))e._update(prop);
				else ani.ani.kill();
			};
			aniopt.onUpdateParams=[curopt];
			//remove animation from gui.animations
			aniopt.onComplete=function(){
				e._update(prop);
				if('Q' in prop)
					delete gui.animations[prop.Q];
			}
			//start animation
			ani.ani=TweenLite.to(curopt,animate,aniopt);
			//add animation to gui.animations
			if('Q' in prop){
				gui.animations[prop.Q]=ani.ani;
			}
		}
	}
	_delay(prop,delay){
		var e=this,
			timeoutId=setTimeout(function(){
				if('Q' in prop)delete gui.queue[prop.Q];
				e._update(prop);
			},delay);
		if('Q' in prop)gui.queue[prop.Q]=timeoutId;
	}
	_update(prop){
		if(prop.U){				//optional delay
			let delay=prop.U-gui.ums();
			delete prop.U;
			this._delay(prop,delay);
		}else if(prop.T){		//optional delay
			let delay=prop.T*1000;
			delete prop.T;
			this._delay(prop,delay);
		}else if(prop.S){
			this._animate(prop);
		}else{
			Object.assign(this._prop,prop);
			for(var propName in prop){
				this._refreshProp(propName,prop[propName]);
				if(prop[propName]===null)delete prop[propName];
			}
		}
	}
	_refreshProp(propName,propValue){
		//TODO: move this into try/catch
			if(propName in this && propName!=='type')this[propName](propValue);
		try{
		}catch(e){
			this._sendAction({'error':e.toString()});
		}
	}
	_value(v){
		this._prop.v=v;
		this.v(v);
	}
	_getIndex(){
		var i=0,e=this._outterElement;
		while((e=e.previousElementSibling)!==null)++i;
		return i;
	}
	_match(query){
		if(query.constructor===String){
			if((this._prop.id||'')===query)return true;
			if(this._prop['tags']&&this._prop['tags'].indexOf(query)>-1)return true;
		}else if(query.constructor===Object){
			for(var q in query){
				if(q==='id'){
					if(query.id.constructor===Number){
						if(this._getIndex()!==query.id)return false;
					}else if(!query.id){
						if(this._prop.id)return false;
					}else if(query.id!==this._prop.id)
						return false;
				}else if(q==='type'){
					return this.type===query[q];
				}else if(this._prop[q]&&this._prop[q].constructor===Array){
					// console.log(q,query,this._prop[q],
					return this._prop[q].indexOf(query[q])>-1;
				}else{
					if(query[q]!==this._prop[q])return false;
				}
			}
			return true;
		}else if(query.constructor===Number){
			return this._getIndex()===query;
		}
	}
	_sendAction(v){
		var elementid=this._prop.id||this._getIndex();
		if(this._patronym>0){
			var fullname=[elementid];
			for(var i=0,parent=this._parent;parent && (i++)<this._patronym;parent=parent._parent)
				fullname.push(parent._prop.id||parent._getIndex());
			if(fullname.length>1)elementid=fullname.reverse();
		}
		gui.sendAction(elementid,v);
		this.O(1);
	}
	v(v){this._content.innerText=v;}
	id(){}
	title(v){this._title.innerText=(v===null||v===undefined)?this._prop.id:v;}
	tags(v){
		if(v){
			if(v.constructor!==Array){
				v=[v];
				this._prop.tags=v;
			}
			for(var i=0;i<v.length;i++)
				this._element.classList.add(v[i]);
		}
	}
}
//////////////////////////////////////////////////////////////////////////////
// text items
addCSS(`
[type='txt'] > .title:empty {width:0px;height:0px;overflow:hidden}
[type='txt'] > .title:not(empty) {border-bottom:solid 1px var(--colorBorder);width:25%;}
[type='txt'] > [v] {white-space:pre-wrap;}
`);
gui.Txt=class extends gui.Item{}
gui.Txt.prototype.type='txt';
//////////////////////////////////////////////////////////////////////////////
// number items
addCSS(`
[type='num'] > .title:empty {width:0px;height:0px;overflow:hidden}
[type='num'] > .title:not(empty) {border-bottom:solid 1px var(--colorBorder);vertical-align:top;margin-top:inherit}
[type='num'] > .title:not(empty):after {content:":"}
[type='num'] > [v] {display:inline-block}
`);
gui.Num=class extends gui.Item{
	_animatable(propName){return propName==='v' || gui.ANIMATABLE.has(propName)}
}
gui.Num.prototype.type='num';
//////////////////////////////////////////////////////////////////////////////
// boolean items
addCSS(`
[in="1"] {cursor:pointer;user-select:none;}
[in="0"] {pointer-events:none;opacity:.5;contenteditable:false}
[type='btn']:active {background-color:var(--colorTrue) !important;}
[type='btn'] {text-align:center;display:inline-block;padding:.4em;color:var(--color1);border:1px solid rgba(0,0,0,0.2);background-color:var(--colorFalse);box-shadow: 0 0 5px -1px rgba(0,0,0,0.2);cursor:pointer;vertical-align:middle;}
[type='btn']:not(:empty),[select="0"]:not(:empty) {min-width:100px;border-radius:4px;}
[type='btn'][in]:empty {width:1em;height:1em;border-radius:2em;}
[btnContainer] [type='btn'] {display:none}
[btnContainer]:active {background-color:var(--colorTrue) !important;}
[btnContainer] {border:1px solid rgba(0,0,0,0.2);background-color:var(--colorFalse);box-shadow: 0 0 5px -1px rgba(0,0,0,0.2);cursor:pointer;border-radius:4px;}
`);
gui.Btn=class extends gui.Item{
	_initContent(){
		this._element=document.createElement('div');			//make element inside parent
		this._content=this._element;
		this._title=this._element;
		this._parent._placeChildElement(this);
		this._bind(this);
	}
	_initDefaults(){this._defaults=Object.assign({in:1},this._parent._defaults);}
	v(v){
		if(v){
			var e=this;
			e._prop.v=false;
			setTimeout(function(){e._setAttrC('v',false);},200);
		}
	}
	_bind(item){
		var thisItem=this;
		if(this._unbind)this._unbind();
		item._element.onclick=function(){							//click behavior
			thisItem._sendAction(true);
		}
		this._unbind=function(){item._element.onclick=null;}
	}
}
gui.Btn.prototype.type='btn';
//////////////////////////////////////////////////////////////////////////////
// containers
addCSS(`
[type='bin'] {display:grid;grid-template-rows: auto 1fr;}
[type='bin'] > .title:empty {width:0px;height:0px;overflow:hidden}
[type='bin'] > .title:not(empty) {border-bottom:solid 1px var(--colorBorder);}
[type='bin'] > [v] {display:block}
`);
gui.Bin=class extends gui.Item{
	_initDefaults(){
		this._defaults=Object.assign({},this._parent._defaults);
		this._childmap={};
	}
	*[Symbol.iterator](){
		var i,child;
		for(i=this._content.children.length;i--;){
			child=this._content.children[i]._item;
			if(child)yield child;
		}
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
	_checkContainerBool(){
		var boolItem;
		for(var item of this){
			if(item instanceof gui.Btn)
				if(boolItem)return null;
			else
				boolItem=item;
		}
		if(boolItem && (boolItem._prop.title=='' || (!boolItem._prop.title && !boolItem._prop.id)))
			return boolItem;
	}
	_newChild(prop){
		var type=gui.getType(prop);
		if(!type){
			var defaultType=gui.getType(this._defaults);
			if('v' in prop){
				type=gui.defaultType(prop.v);
				if(defaultType&&(defaultType.prototype instanceof type)){
					type=defaultType;
				}
			}else if(defaultType){
				type=defaultType;
			}else if('v' in this._defaults){
				type=gui.defaultType(this._defaults.v);
			}else{
				type=gui.Bin;
				prop.v=[];
			}
		}
		var child=new type(prop,this);
		if(child._prop.id!==undefined)this._childmap[child._prop.id]=child;
	}
	_processChild(child,prop){
		if(prop.v===null){										//if value is null, remove child
			this._removeChild(child,prop);
		}else{
			var type=gui.getType(prop);
			if(!type || child instanceof type){
				child._update(prop);							//if value compatible, update child properties
			}else if(child._parent){							//if value incompatible, replace child with new one
				this._changeChildType(child,propType,prop);
			}else{
				gui.sendAction(0,{error:'Root element must be a container type.'});
			}
		}
	}
	_changeChildType(child,propType,prop){
		if(child._prop.id)prop.id=child._prop.id;		//correct id type in case prop.id was a number
		var newchild=new propType(Object.assign({},child._prop,prop),this);
		this._content.replaceChild(newchild._outterElement,child._outterElement);
		if(child._prop.id)this._childmap[prop.id]=newchild;
	}
	_removeChild(child){
		if(child._prop.id)delete this._childmap[child._prop.id];
		this._content.removeChild(child._outterElement);
	}
	_search(prop){
		var scope=1;
		if(prop['*'].constructor===Object&&('scope' in prop['*'])){
			scope=prop['*'].scope;
			delete prop['*'].scope;
		}
		for(var child of (scope>1?gui.rootContainer:this)){
			if(child._match(prop['*']))
				this._processChild(child,Object.assign({},prop));
			if(scope && (child instanceof gui.Bin))
				child._search(prop);
		}
	}
	_processProp(prop){
		if('Q' in prop){	//clear and remove prior instances of Q-id in animation and timeout queues
			if(gui.queue[prop.Q]){
				clearTimeout(gui.queue[prop.Q]);
				delete gui.queue[prop.Q];
			}
			if(gui.animations[prop.Q]){
				gui.animations[prop.Q].kill();
				delete gui.animations[prop.Q];
			}
		}
		if('*' in prop){
			this._search(prop);
		}else{
			var child;
			if('id' in prop){
				if(prop.id.constructor===Array && prop.id.length){
					if(prop.id[0]===null){
						if(prop.id.length===1)delete prop.id;
						else prop.id=prop.id.slice(1);
						gui(prop);
						return;
					}else if(prop.id.length===1){
						prop.id=prop.id[0];
					}else{
						var id=prop.id[0];
						prop.id=prop.id.slice(1);
						prop={v:[prop],id:id};
					}
				}
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
	v(updates){
		//cycle through all updates for this container
		for(var i of updates)this._processProp(gui.prop(i));
		//after updates are done, check if there's an untitled boolean value (for a cleaner look&feel)
		if(this._containerBoolean)
			this._containerBoolean._bind(this._containerBoolean);
		this._containerBoolean=this._checkContainerBool();
		if(this._containerBoolean){
			this._containerBoolean._bind(this);
			// this._setAttr('eB',this._containerBoolean._attr('eB')||1);
			this._setAttr('btnContainer',1);
			this._setAttr('v',Boolean(this._containerBoolean._prop.v));
			// this._containerBoolean._setAttr('eB',null);
		}else{
			this._setAttr('btnContainer',null);
			// this._setAttr('select',null);
		}
	}
}
gui.Bin.prototype.type='bin';
//////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////
// onload: initiate rootContainer and connect to task software

(function(){
	//////////////////////////////////////////////////////////////////////////////
	// init window and connect to task
	function init(){
		logToConsole();
		//create foundational element
		document.body._level=-2;
		document.body._content=document.body;
		document.body._placeChildElement=function(child){
			this._content.appendChild(child._element);
			child._outterElement=child._element;
		}
		gui.rootOrigin=new gui.Bin({},document.body);
		gui.rootOrigin._removeChild=function(child){
			gui.rootContainer._content.innerHTML='';
			gui.rootContainer._childmap={};
			gui.rootContainer._prop={select:-1,eB:1,task:gui.rootContainer._prop.task};
		}
		gui.rootContainer=new gui.Bin({df:{su:'px'}},gui.rootOrigin);
		gui.rootContainer._parent=null;
		document.body._item=gui.rootContainer;
		window._item=gui.rootContainer;
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
			gui(['Hey there...',{id:'Intersted in the STAP?',v:"http://stap7.github.io/"}]);
		}
	}
	function onTaskConnect(){
		gui(null);
		gui.startTime=(new Date()).getTime();
		window.addEventListener('unload',function(){gui.sendAction(0,['onunload']);},false);
	}
	function connectToTaskScript(){
		//	connect gui.action to task.userAction
		if(task.userAction)gui.action = task.userAction;
		//	connect task.show to gui.update;
		task.show=function(data){gui(JSON.parse(JSON.stringify(data)));};
		//	define task.end
		task.end=function(){};
		//	start task
		onTaskConnect();
		if(task.start)task.start();
	}
	function connectToTaskHTTP(){
		function onReady(){
			if(this.readyState==4){
				if(this.status==200){
					gui.httpParrotHeader=null;
					gui.httpAppendToURL=null;
					this.getAllResponseHeaders().split('\n').forEach(line=>{
						if(line.substr(0,9).toLowerCase()==('x-parrot:'))gui.httpParrotHeader=line.substr(10);
						if(line.substr(0,16).toLowerCase()==('x-append-to-url:'))gui.httpAppendToURL=line.substr(17);
					});
					try{
						//gui(JSON.parse(this.responseText));
						var arrayOfLines=this.responseText.match(/[^\r\n]+/g);
						if(arrayOfLines){
							for(var i=0;i<arrayOfLines.length;i++){
								gui(JSON.parse(arrayOfLines[i]));
							}
						}
					}
					catch(e){console.error('Could not parse response.\n',this.responseText);}
				}else if(this.status>200 && this.status<400){
					var url=new URL(this.responseText);
					console.log(this.statusText+'\n  '+url.href);
					task.location=url.href;
					gui.sendAction(0,[0]);
				}
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
		function get(url){
			var xhttp = new XMLHttpRequest();
			xhttp.onreadystatechange = onReady;
			if(gui.httpAppendToURL)url+=(url.indexOf('?')==-1?'?':'&')+gui.httpAppendToURL;
			xhttp.open("GET",url, true);
			// if(gui.httpParrotHeader)xhttp.setRequestHeader('X-parrot',gui.httpParrotHeader);
			xhttp.send();
		}
		gui.action=function(time,id,val){
			post(task.location,JSON.stringify([time,id,val]));
		};
		gui.action(0,null,['onload']);
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
//   core STAP text&button features, search & timing (_QRSTU)
//////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////
// below this line are:
//   additional UI features (e.g. checkboxes, tables, inputs, events, graphics, emphases)
//





//////////////////////////////////////////////////////////////////////////////
// additional common options

gui.INFO={
	async ip(){return gui.ip=await fetch('https://api.ipify.org/').then(r=>r.text());},
	userAgent(){return navigator.userAgent;},
	url(){return location.href;},
	screen(){return objectify(screen);},
	id(item){return item._getIndex();},
	mouseX(item){return item._event.clientX-item._element.getBoundingClientRect().left;},
	mouseY(item){return item._event.clientY-item._element.getBoundingClientRect().top;},
	key(item){return item._event.key},
	code(item){return item._event.code},
	keyLocation(item){return item._event.location},
	modKeys(item){
		var e=item._event;
		return e.shiftKey+(2*e.altKey)+(4*e.ctrlKey)+(8*e.metaKey);
	},
	bounds(item){return item._element.getBoundingClientRect()},
}
gui.Item.prototype._getInfo=function(info){
	if(info in gui.INFO)
		return gui.INFO[info](this);
	else
		return this._prop[info];
}
gui.Item.prototype.R=async function(v){
	//TODO: color animation messes with present color values
	var r=[];
	if(v[0]!==null&&v[0]!==undefined)r.push(v[0]);
	for(var i=1;i<v.length;i++)
		r.push(await this._getInfo(v[i]));
	gui.sendAction(this._prop.id||this._getIndex(),r);
}

gui.Item.prototype.P=function(v){
	//TODO: add animated moves
	var insertBefore,parent;
	if(v.constructor===Array){
		parent=gui.rootContainer;
		for(var i=0;i<v.length-1;i++){
			parent=parent._getChild(v[i]);
		}
		v=v[i];
		if(this._prop.id!==undefined)this._parent._childmap[this._prop.id]=undefined;
	}else{
		parent=this._parent;
	}
	if(parent){
		insertBefore=parent._getChild(v);
		if(insertBefore){
			parent._content.insertBefore(this._outterElement,insertBefore._outterElement);
		}else{
			var thisItem=this;
			setTimeout(function(){
				parent._placeChildElement(thisItem)
			},1);
		}
		if(this._prop.id!==undefined)parent._childmap[this._prop.id]=this;
	}
};

gui.Item.prototype.O=function(v){
	var update=v==1?this._onedit:this._prop[v];
	if(update){
		if(update.id||update['*']){
			if(this._processProp)this._processProp(update);
			else (this._parent||gui.rootOrigin)._processProp(update);
		}else{
			(this._parent||gui.rootOrigin)._processChild(this,update);
		}
	}
}

gui.onEvent=function(e){
	if(!e.repeat){
		this._item._event=e;
		this._item.O('on'+e.type);
	}
}
gui.Item.prototype._onEvent=function(eventType,v){
	if(v && v.constructor===Object){
		if(!v.R)this._prop[eventType].R=[eventType];
		(this===gui.rootContainer?document.body:this._element).addEventListener(eventType.substring(2),gui.onEvent);
	}else{
		(this===gui.rootContainer?document.body:this._element).removeEventListener(eventType.substring(2),gui.onEvent);
	}
}
gui.Item.prototype.onkeydown=function(v){this._onEvent('onkeydown',v);};
gui.Item.prototype.onkeyup=function(v){this._onEvent('onkeyup',v);};
gui.Item.prototype.onclick=function(v){this._onEvent('onclick',v);};
gui.Item.prototype.ondblclick=function(v){this._onEvent('ondblclick',v);};
gui.Item.prototype.onmousemove=function(v){this._onEvent('onmousemove',v);};
gui.Item.prototype.onmouseover=function(v){this._onEvent('onmouseover',v);};
gui.Item.prototype.onmouseout=function(v){this._onEvent('onmouseout',v);};
gui.Item.prototype.onmouseenter=function(v){this._onEvent('onmouseenter',v);};
gui.Item.prototype.onmouseleave=function(v){this._onEvent('onmouseleave',v);};
gui.Item.prototype.onmousedown=function(v){this._onEvent('onmousedown',v);};
gui.Item.prototype.onmouseup=function(v){this._onEvent('onmouseup',v);};
gui.Item.prototype.onfocus=function(v){this._onEvent('onfocus',v);};
gui.Item.prototype.onblur=function(v){this._onEvent('onblur',v);};
// gui.Item.prototype.onresize=function(v){this._onEvent('onresize',v);};
// gui.Item.prototype.onscroll=function(v){this._onEvent('onscroll',v);};
// gui.Item.prototype.onselect=function(v){this._onEvent('onselect',v);};
// gui.Item.prototype.oncopy=function(v){this._onEvent('oncopy',v);};
// gui.Item.prototype.oncut=function(v){this._onEvent('oncut',v);};
// gui.Item.prototype.onpaste=function(v){this._onEvent('onpaste',v);};
// gui.Item.prototype.ondragstart=function(v){this._onEvent('ondragstart',v);};
// gui.Item.prototype.ondrag=function(v){this._onEvent('ondrag',v);};
// gui.Item.prototype.ondragend=function(v){this._onEvent('ondragend',v);};

const OVERLAP = new Event('overlap');
const OVEROUT = new Event('overout');
gui.checkForOverlap={};
gui.overlap=function(b1,b2){
	if(b1.left>b2.right||b2.left>b1.right)return false;
	if(b1.top>b2.bottom||b2.top>b1.bottom)return false;
	return true;
}
gui._items=0;
gui.Item.prototype._getUniqueIndex=function(){return this.__uniqueIndex||(this.__uniqueIndex=++gui._items)};
gui.Item.prototype._moveHook=function(){};
gui.Item.prototype._overlapChecking=function(){
	if((this._prop.onoverlap||this._prop.onoverout)){
		if(!gui.checkForOverlap[this._getUniqueIndex()]){
			gui.checkForOverlap[this._getUniqueIndex()]=this;
			this._moveHook=this._checkOverlap;
			this._checkOverlap();
		}
	}else{
		delete gui.checkForOverlap[this._getUniqueIndex()];
		this._moveHook=function(){};
	}
}
gui.Item.prototype.onoverlap=function(v){
	this._onEvent('onoverlap',v);
	this._overlapChecking();
};
gui.Item.prototype.onoverout=function(v){
	this._onEvent('onoverout',v);
	this._overlapChecking();
}
gui.Item.prototype._checkOverlap=function(){
	var oid,item,myBounds=this._element.getBoundingClientRect();
	for(oid in gui.checkForOverlap){
		item=gui.checkForOverlap[oid];
		if(item!=this){
			if(gui.overlap(item._element.getBoundingClientRect(),myBounds)){
				this._element.dispatchEvent(OVERLAP);
				item._element.dispatchEvent(OVERLAP);
				if(!this._priorOverlap)this._priorOverlap={};
				if(!item._priorOverlap)item._priorOverlap={};
				this._priorOverlap[item._getUniqueIndex()]=item;
				item._priorOverlap[this._getUniqueIndex()]=this;
			}else if(this._priorOverlap && this._priorOverlap[item._getUniqueIndex()]){
				delete this._priorOverlap[item._getUniqueIndex()];
				delete item._priorOverlap[this._getUniqueIndex()];
				this._element.dispatchEvent(OVEROUT);
				item._element.dispatchEvent(OVEROUT);
			}
		}
	}
}

gui.Btn.prototype.in=function(v){
	//TODO: unbind and rebind (for the purposes of booldiv)
	if(v==0||v==false){
		this._setAttr('in',0);
	}else{
		this._setAttr('in',1);
	}
};

gui.Item.prototype.onin=function(v){
	if(v && v.constructor===Object)this._onedit=v;
	else this._onedit=undefined;
};

//TODO: this probly isn't necessary; could just use blank function
gui.Item.prototype.patronym=function(v){this._patronym=v;};

gui.Bin.prototype._default=function(propName,propVal){
	if(propVal===null){
		if(propName in this._parent._defaults)
			propVal=this._defaults[propName]=this._parent._defaults[propName];
		else
			delete this._defaults[propName];
	}else{
		this._defaults[propName]=propVal;
	}
	for(var child of this){
		if(!(propName in child._prop)){
			if(propName==='type'){
				if(propVal!==child.type){
					var propType=gui.getType({type:propVal});
					if(propType)
						this._changeChildType(child,propType,{});
					//TODO: check that child val is compatible with type
				}
			}else{
				child._refreshProp(propName,propVal);
			}
		}
		if(child.df && !(propName in child._defaults))
			child._default(propName,propVal);
	}
}
gui.Bin.prototype.df=function(v){
	if(v===null){
		v={};
		for(var propName in this._defaults)v[propName]=null;
	}
	for(var propName in v)this._default(propName,v[propName]);
}

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

gui.Item.prototype.bg=function(v){
	if(this._path){
		this._path.setAttribute('fill',gui.color(this._prop.bg?this._prop.bg:(this._prop.bg===0?0:'none')));
	}else{
		this._element.style.background=gui.color(v);
	}
};

gui.Item.prototype.c=function(v){this._element.style.color=gui.color(v);};

gui.Item.prototype.fnt=function(v){this._element.style.font=v;};

gui.Item.prototype.lc=function(v){
	if(this._path)
		this._path.setAttribute('stroke',gui.color(this._prop.lc?this._prop.lc:(this._prop.lc===0?0:1)));
	else
		this._element.style.borderColor=gui.color(v);
};

gui.Item.prototype.lw=function(v){
	if(this._path){
		this._path.style.strokeWidth=this._getSize(v,{'%w':'%','%h':'%'})||0;
	}else{
		this._element.style.borderWidth=this._getSize(v,{'%':'%w'});
	}
};

// gui.Item.prototype.r=function(v){this._element.style.borderRadius=v+'px';};
addCSS(`
[shape] {text-align:center;}
[shape="rect"],[shape="0"] {border-radius:0px  !important} 
[shape="roundedRect"],[shape="2"] {border-radius:.4em  !important}
[shape="round"],[shape="1"] {border-radius:100%  !important}
[shape="roundTop"],[shape="6"] {border-radius:100% 100% 0px 0px  !important}
[shape="roundBottom"],[shape="3"] {border-radius:0px 0px 100% 100%  !important}
[shape="roundLeft"],[shape="4"] {border-radius:100% 0px 0px 100%  !important}
[shape="roundRight"],[shape="5"] {border-radius:0px 100% 100% 0px  !important}
svg {width:100%;height:100%;left:0px;top:0px;position:absolute;z-index:0 }
`);
//[shape="triangle"],[shape="3"] {clip-path: polygon(50% 0%, 0% 100%, 100% 100%);}
gui.Item.prototype.shape=function(v){
	this._setAttr('shape',v);
	//for irregular shapes
	//	need to remap borderWidth borderColor and background to stroke-width stroke and fill
	if(v.constructor===Array){
		this._element.style.background='';
		this._element.style.borderWidth=0;
		if(!this._svg){
			this._svg=this._element.insertBefore(createSVG('svg'),this._title);
			this._svg.setAttribute('viewBox','0 0 100 100');
			this._svg.setAttribute('preserveAspectRatio','none');
		}
		if(!this._path){
			this._path=this._svg.appendChild(createSVG('path'));
		}
		this._path.setAttribute('d',(isNaN(parseInt(v[0]))?'':'M')+v.join(' '));
	// }else if(v==='triangle'||v===3){
		// this._element.style.background='';
		// this._element.style.borderWidth=0;
		// this._svg=this._element.insertBefore(createSVG('svg'),this._title);
		// this._svg.setAttribute('viewBox','0 0 100 100');
		// this._svg.setAttribute('preserveAspectRatio','none');
		// this._path=this._svg.appendChild(createSVG('polygon'));
		// this._path.setAttribute('points','0 100,50 0,100 100');
		// this._path.setAttribute('clip-path','polygon(0 100,50 0,100 100)');
	}else if(this._svg){
		this._element.removeChild(this._svg);
		delete this._svg;
		delete this._path;
	}
	this.bg(this._prop.bg);
	this.lw(this._prop.lw);
	this.lc(this._prop.lc);
};

gui.Item.prototype.w=function(v,batch){this._element.style.width=this._getSize(v);if(!batch)this._moveHook();};

gui.Item.prototype.h=function(v,batch){this._element.style.height=this._getSize(v);if(!batch)this._moveHook();};

gui.Item.prototype.z=function(v){this._element.style.zIndex=10+v;};

gui.Item.prototype.rot=function(v){this._element.style.setProperty('transform','rotate('+v+'deg)');};

addCSS(`
[x],[y] {position:absolute;margin:0px}
[childPos] > [v] {margin:0px;position:absolute;top:0px;left:0px;width:100%;height:100%;overflow:visible}
`);
gui.Bin.prototype._hasPositionedElements=function(){	//enables Item.x and Item.y behavior
	for(var i of this)
		if(getComputedStyle(i._element).position==='absolute')
			return true;
	return null;
}
gui.Item.prototype.x=function(v,batch){
	this._element.style.left=this._getSize(v);
	this._setAttr('x',v);
	this._parent._setAttr('childPos',this._parent._hasPositionedElements());
	if(!batch)this._moveHook();
};
gui.Item.prototype.y=function(v,batch){
	this._element.style.top=this._getSize(v);
	this._setAttr('y',v);
	this._parent._setAttr('childPos',this._parent._hasPositionedElements());
	if(!batch)this._moveHook();
};

gui.Item.prototype.su=function(v){
	this._su=v;
	for(var propName of gui.SIZEOPTIONS){
		if(propName in this._prop)
			this[propName](this._prop[propName],true);
	}
	this._moveHook();
};

gui.Item.prototype._getSize=function(v,convert){
	var units;
	if(v===undefined||v===null)v=0;
	if(v.constructor===String){
		units=v.match(/[a-zA-Z%]+/);
		units=units?units[0]:this._su;
		v=parseFloat(v);
	}else{
		units=this._su;
	}
	if(convert && (units in convert))units=convert[units];
	//TODO: add hook so that w/h gets updated when w/h changes
	if(units==='%w')return (v*this._element.offsetWidth/100)+'px';
	if(units==='%h')return (v*this._element.offsetHeight/100)+'px';
	return v+units;
}

//////////////////////////////////////////////////////////////////////////////


//////////////////////////////////////////////////////////////////////////////
// additional text options
addCSS(`
[contenteditable=true] {background-color:white;min-width:100px;padding-left:5px;padding-right:5px;border:solid 1px lightgray;font-family:monospace;pointer-events:all}
`);
gui.Txt.prototype.in=function(v){
	var c=this._content;
	c._removeListeners();
	if(v>0){
		c.setAttribute('contenteditable',true);
		var multiline=this._content.innerText.indexOf('\n')+this._content.innerText.indexOf('\r')>-2;
		c._listen('paste',function(e){
			e.preventDefault();
			var txt=e.clipboardData.getData("text/plain");
			document.execCommand("insertText",false,multiline?txt.replace(/\n|\r/g,' '):txt);
		});
		function send(){
			if(c.innerText!=c._item._prop.v){
				c._item._prop.v=c.innerText;
				c._item._sendAction(c.innerText);
			}
		}
		if(multiline){
			if(v==2){
				c._listen('input',send);
			}else{
				c._listen('blur',send);
			}
		}else{
			if(v==2){//TODO: replace keypress with keydown? keyup?
				c._listen('keypress',(e)=>{if(e.keyCode==13){e.preventDefault()}});
				c._listen('input',send);
			}else{
				c._listen('keypress',(e)=>{if(e.keyCode==13){e.preventDefault();send();}});
				c._listen('blur',send);
			}
		}
	}else{
		c.removeAttribute('contenteditable');
	}
};
gui.Txt.prototype.v=function(v){
	this._content.innerText=v;
	var input=this._prop.in||this._parent._defaults.in;
	if(input)this.in(input);
}

//////////////////////////////////////////////////////////////////////////////


//////////////////////////////////////////////////////////////////////////////
// additional number options
addCSS(`
[type='num'] > [unit]:after {content: attr(unit);}
`);
gui.Num.prototype.in=function(v){
	var c=this._content;
	c._removeListeners();
	if(v>0){
		c.setAttribute('contenteditable',true);
		c._listen('paste',(e)=>{
			e.preventDefault();
			var v=parseFloat(e.clipboardData.getData("text/plain"));
			if(!isNaN(v))
				document.execCommand("insertText", false, v);
		});
		function send(){
			if(c.innerText!=c._item._prop.v){
				c._item._value(parseFloat(c.innerText));
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
gui.Num.prototype.unit=function(v){this._setAttrC('unit',v);};
gui.Num.prototype.max=function(v){this._max=(v===null)?undefined:v;this.v(this._prop.v);};
gui.Num.prototype.min=function(v){this._min=(v===null)?undefined:v;this.v(this._prop.v);};
gui.Num.prototype.rnd=function(v){this._rnd=(v===null)?undefined:v;this.v(this._prop.v);};
gui.Num.prototype.time=function(v){this._setAttr('time',v);this.v(this._prop.v);};
gui.Num.prototype.v=function(v){
	if(!v)v=0;
	if(this._min!==undefined)v=Math.max(v,this._min);
	if(this._max!==undefined)v=Math.min(v,this._max);
	if(this._rnd!==undefined)v=Math.round2(v,this._rnd);
	if(this._attr('time'))v=new Date(v*1000).format(this._attr('time'));
	else if(this._rnd<1)v=v.toFixed(this._rnd.toString().split('.')[1].length);
	this._content.innerText=v;
}
//////////////////////////////////////////////////////////////////////////////


//////////////////////////////////////////////////////////////////////////////
// holddown button
addCSS(`
[type='hold']:active {background-color:var(--colorTrue) !important;}
[type='hold'] {text-align:center;display:inline-block;padding:.4em;color:var(--color1);border:1px solid rgba(0,0,0,0.2);background-color:var(--colorFalse);box-shadow: 0 0 5px -1px rgba(0,0,0,0.2);cursor:pointer;vertical-align:middle;}
[type='hold']:not(:empty),[select="0"]:not(:empty) {min-width:100px;border-radius:4px;}
[type='hold'][in]:empty {width:2em;height:2em;border-radius:2em;}
`)
gui.Hold=class extends gui.Btn{
	_bind(item){
		var thisItem=this;
		if(thisItem._unbind)thisItem._unbind();
		item._element.onmousedown=function(){						//onmousedown behavior
			thisItem._value(true);
			thisItem._sendAction(true);
		}
		item._element.onmouseup=function(){							//onmouseup behavior
			thisItem._value(false);
			thisItem._sendAction(false);
		}
		thisItem._unbind=function(){item._element.onmousedown=item._element.onmouseup=null;}
	}
	v(v){
		this._setAttrC('v',v);
	}
}
gui.Hold.prototype.type='hold';


//////////////////////////////////////////////////////////////////////////////
// selectable options (checkboxes/radiobuttons)
addCSS(`
[type='select'] {display:block;text-align:left}
[type='select']:empty {text-align:center}
[v="true"] {background-color:var(--colorTrue) !important;}
[type='select']:not([v="true"]):before {content:"\\2610" " ";display:inline;}
[type='select'][v="true"]:before {content:"\\2611" " ";display:inline;}
[type='select'][group]:not([v="true"]):before {content:"\\029be" " ";display:inline;}
[type='select'][group][v="true"]:before {content:"\\029bf" " ";display:inline;}
`)
gui.Select=class extends gui.Btn{
	_bind(item){
		var thisItem=this;
		if(thisItem._unbind)thisItem._unbind();
		item._element.onclick=function(){							//select/deselect behavior
			if(thisItem._prop.v){
				thisItem._sendAction(false);
				thisItem._value(false);
				item._setAttrC("v","false");
			}else{
				thisItem._sendAction(true);
				thisItem._value(true);
				item._setAttrC("v","true");
			}
		}
		thisItem._unbind=function(){item._element.onclick=null;}
	}
	v(v){
		this._setAttrC('v',v);
		var group=this._attr('group');
		if(group){
			if(v){
				if(gui.selectGroups[group] && gui.selectGroups[group]!==this){
					gui.selectGroups[group]._prop.v=false;
					gui.selectGroups[group]._setAttrC('v',false);
					if(gui.selectGroups[group]._parent._containerBoolean)
						gui.selectGroups[group]._parent._setAttr('v',false);
						//TODO: make sure this isn't just for immediate parent
				}
				gui.selectGroups[group]=this;
			}else if(gui.selectGroups[group]===this){
				gui.selectGroups[group]=undefined;
			}
		}
	}
	group(v){
		this._setAttr('group',v);
	}
}
gui.Select.prototype.type='select';
gui.selectGroups={};

//////////////////////////////////////////////////////////////////////////////
// html
addCSS(`
[type='html'] > .title:not(empty) {border-bottom:solid 1px var(--colorBorder);width:25%;}
[type='html'] > [v] {white-space:normal;}
`);
gui.Html=class extends gui.Txt{
	v(v){this._content.innerHTML=v;}
}
gui.Html.prototype.type='html';
gui.Html.prototype.eT=function(v){
	if(v>0){
		this._content.innerText=this._prop.v;
		gui.Txt.prototype.eT.call(this,v);
	}else if(this._attrC('contenteditable')){
		this._content.removeAttribute('contenteditable');
		this._content.innerHTML=this._prop.v;
	}
};
//////////////////////////////////////////////////////////////////////////////


//////////////////////////////////////////////////////////////////////////////
// mkdn
addCSS(`
[type='mkdn'] > .title:not(empty) {border-bottom:solid 1px var(--colorBorder);width:25%;}
`);
gui.Mkdn=class extends gui.Html{
	v(v){this._content.innerHTML=gui.markdown(v);}
}
gui.Mkdn.prototype.type='mkdn';
gui.Mkdn.prototype.eT=function(v){
	if(v>0){
		this._content.innerText=this._prop.v;
		gui.Txt.prototype.eT.call(this,v);
	}else if(this._attrC('contenteditable')){
		this._content.removeAttribute('contenteditable');
		this._content.innerHTML=gui.markdown(this._prop.v);
	}
};
//////////////////////////////////////////////////////////////////////////////


//////////////////////////////////////////////////////////////////////////////
// popup
addCSS(`
[type='popup'] {position:absolute;top:0px;left:0px;width:99%;height:99%;background-color:rgba(255,255,255,.5);pointer-events:all}
[type='popup'] > div {top:50%;left:50%;transform:translate(-50%,-50%);width:50%;border:solid 1px gray;border-radius:4px;background-color:var(--color0);padding:1em}
[type='popup'] > * > .title:empty {width:0px;height:0px;overflow:hidden}
[type='popup'] > * > .title:not(empty) {border-bottom:solid 1px var(--colorBorder);width:25%;}
`);
gui.Popup=class extends gui.Bin{
	_initContent(){
		this._element=document.createElement('div'); //screen
		this._frame=this._element.appendChild(document.createElement('div')); //popup window
		this._title=this._frame.appendChild(document.createElement('div'));
		this._content=this._frame.appendChild(document.createElement('div'));
		this._content.style.overflow='auto';
		this._parent._placeChildElement(this);
		this._childmap={};
	}
}
gui.Popup.prototype.type='popup';
//////////////////////////////////////////////////////////////////////////////


//////////////////////////////////////////////////////////////////////////////
// table
addCSS(`
[type="table"] > .title:not(empty) {border-bottom:solid 1px var(--colorBorder);width:25%;}
[type="table"] {display:flex;flex-direction:column}
[type="table"] > div {overflow:auto;flex:1 1 auto}
table {border-spacing:0;border-collapse:collapse;}
table[head="1"] > tr:first-child > * {font-weight:bold;background:var(--colorHead);z-index:1;position:relative}
td.title:empty {display:table-cell}
`);
gui.Table=class extends gui.Bin{
	_initContent(){
		this._element=document.createElement('div');
		this._title=this._element.appendChild(document.createElement('div'));
		this._frame=this._element.appendChild(document.createElement('div'));
		this._frame.style.overflow='auto';
		this._content=this._frame.appendChild(document.createElement('table'));
		this._parent._placeChildElement(this);
		this._childmap={};
	}
	_newChild(prop){
		var type=gui.getType(prop);
		if(!type){
			var defaultType=gui.getType(this._defaults);
			if('v' in prop){
				type=gui.defaultType(prop.v);
				if(defaultType&&(type.prototype instanceof defaultType))
					type=defaultType;
			}else if(defaultType){
				type=defaultType;
			}else if('v' in this._defaults){
				type=gui.defaultType(this._defaults.v);
			}else{
				type=gui.Bin;
				prop.v=[];
			}
		}
		if(type==gui.Bin){
			var child=new gui.TableRow(prop,this);
			if(typeof(prop.id)!=='number')this._childmap[prop.id]=child;
		}
	}
}
gui.Table.prototype.type='table';
gui.TableRow=class extends gui.Bin{
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
}
gui.TableRow.prototype.type='tableRow';
gui.Table.prototype._floatRow=function(e){
	var translate=this.scrollTop?"translate(0,"+(this.scrollTop-3)+"px)":null;
	var p=this.firstChild.firstChild.querySelectorAll('td');
	for(var i in p)if(p[i] && p[i].style){
		p[i].style.transform = translate;
	}
}
gui.Table.prototype.head=function(v){
	this._setAttrC('head',v);
	if(v)this._frame.addEventListener('scroll',this._floatRow);
	else{
		this._content.firstChild.style.transform=null;
		this._frame.removeEventListener('scroll',this._floatRow);
	}
}
//////////////////////////////////////////////////////////////////////////////


//////////////////////////////////////////////////////////////////////////////
// ln (link between items)
addCSS(`
[type="ln"] > [v] > * {margin-bottom:1em;}
[type="ln"] div:empty {width:0px;height:0px;margin:0px}
svg {width:100%;height:100%;left:0px;top:0px;position:absolute;z-index:0}
`);
gui.getMarker=function(type,color){
	var id;
	if(type==='arrow' || type==='dot'){
		id='marker.'+type+'.'+color;
		if(!document.getElementById(id)){
			var d;
			if(!gui.svgdefs){
				gui.svgdefs=document.body.appendChild(createSVG('svg')).appendChild(createSVG('defs'));
				gui.svgdefs.parentElement.style.height='0px';
			}
			var m=gui.svgdefs.appendChild(createSVG('marker'));
			m.id=id;
			m.setAttribute('orient','auto-start-reverse');
			m.setAttribute('markerUnits','strokeWidth');
			if(type==='arrow'){
				m.setAttribute('viewBox','0 0 10 10');
				m.setAttribute('refX','9');
				m.setAttribute('refY','5');
				m.setAttribute('markerWidth','6');
				m.setAttribute('markerHeight','4');
				d=m.appendChild(createSVG('path'));
				d.setAttribute('d',"M 0 0 L 10 5 L 0 10 z");
			}else{
				m.setAttribute('refX','2');
				m.setAttribute('refY','2');
				m.setAttribute('markerWidth','5');
				m.setAttribute('markerHeight','5');
				d=m.appendChild(createSVG('circle'));
				d.setAttribute('cx','2');
				d.setAttribute('cy','2');
				d.setAttribute('r','1.1');
			}
			d.setAttribute('fill',gui.color(color));
		}
		id='url(#'+id+')';
	}
	return id;
}
gui.Ln=class extends gui.Bin{
	_initContent(){
		super._initContent();
		this._svg=this._content.appendChild(createSVG('svg'));
		this._path=this._svg.appendChild(createSVG('path'));
		this._path.setAttribute('fill','none');
		this._path.setAttribute('stroke','var(--color1)');
		this._path.setAttribute('stroke-width','1');
	}
	_drawPath(){
		if(!this._prop.lw)this._prop.lw=1;
		if(!this._prop.lc)this._prop.lc=1;
		var d='';
		for(var e of this._content.children){
			if(e._item){
				if(e.offsetHeight){
					if(d)d+=(e.offsetLeft+e.offsetWidth/2)+','+e.offsetTop+' ';
					if(e.nextElementSibling)d+='M'+(e.offsetLeft+e.offsetWidth/2)+','+(e.offsetTop+e.offsetHeight)+' ';
				}else{
					if(!d)d='M';
					d+=e.offsetLeft+','+e.offsetTop+' ';
				}
			}
		}
		this._path.setAttribute('d',d);
	}
	v(v){
		super.v(v);
		this._drawPath();
	}
}
gui.Ln.prototype.type='ln';
gui.Ln.prototype.shape=function(){}
gui.Ln.prototype.dir=function(v){
	if(v==1){
		this._path.setAttribute('marker-start',gui.getMarker('dot',this._prop.lc));
		this._path.setAttribute('marker-mid',gui.getMarker('arrow',this._prop.lc));
		this._path.setAttribute('marker-end',gui.getMarker('arrow',this._prop.lc));
	}else if(v==2){
		this._path.setAttribute('marker-start',gui.getMarker('arrow',this._prop.lc));
		this._path.setAttribute('marker-mid',gui.getMarker('dot',this._prop.lc));
		this._path.setAttribute('marker-end',gui.getMarker('arrow',this._prop.lc));
	}else{
		this._path.removeAttribute('marker-start');
		this._path.removeAttribute('marker-mid');
		this._path.removeAttribute('marker-end');
	}
}
//////////////////////////////////////////////////////////////////////////////

