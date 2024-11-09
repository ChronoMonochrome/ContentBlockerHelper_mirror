"use strict";
// Copyright (c) 2015-2016 by FAR/RAKUDA All Rights Reserved

/****************************************************************************************************/
/* ContentBlockHelper UIProtection                                                                 */
/*
	Destroys event listener inhibiting User interfaces.
                                                                                                    */
/****************************************************************************************************/
/* イベントをキャンセルする */
// コンテキストメニューの表示を阻害させない
// テキストの選択を阻害させない
// -webkit-user-select:all;
// onmousedown

var WHO = WHO || {};

WHO.UIProtection =
{

	//設定
	prefs : 
	{
		selectstart : false,// テキストの選択
		contextmenu : false,// コンテキストメニュー
		copy        : false,
		cut         : false,
		paste       : false,
		mousedown   : false,
	//	mouseup     : false,
	//	click       : false,
	},

	start : function()
	{

		this.detectEventFunction = this.detectEvent.bind(this);
		this.getPrefs();

	},

	//設定を取得
	getPrefs : function()
	{
		WHO.extension.sendRequest('UIProtection',{method:"getPrefs"},this.initPrefs.bind(this));
	},
	initPrefs : function(message)
	{

		if(!message.disabled && (!message.rule || message.rule.act !== "ignore"))
		{

			var prefs = message.prefs;

			for(var type in prefs)
			{
				if(!this.prefs[type] && prefs[type])
				{
					window.addEventListener(type,this.detectEventFunction,true);
				}
				else
				if(this.prefs[type] && !prefs[type])
				{
					window.removeEventListener(type,this.detectEventFunction,true);
				}
			}

			if(!this.prefs.selectstart && prefs.selectstart)
			{
				this.disableReturnfalse("mousedown");
			}
			else
			if(this.prefs.selectstart && !prefs.selectstart)
			{
				this.enableReturnfalse("mousedown");
			}

			this.prefs = prefs;

		}

	},

	//イベントをキャンセルする本体
	detectEvent : function(e)
	{

		var type = e.type;

		if(this.prefs[type])
		{

			//イベントの伝搬を禁止する→ページのイベントリスナーを発動させない
			e.stopPropagation();

		}

	},

	/* Destroy On-- handler */
	// return false; するんじゃねーよクソが
	disableReturnfalse : function(type)
	{

		var newScript = document.createElement('script');
			newScript.setAttribute('data-cbh-dummy',"eventhandler");
			newScript.setAttribute('id',"__disableReturnfalse__");

			newScript.textContent = "(" + function _disableReturnfalse(type)
			{
			//	window.addEventListener(type,function()
			//	{
					var elements = document.getElementsByTagName("*");
					for(var i = 0,element;element = elements[i];++i)
					{
						var original = element["_on"+type];
						var handler = element["on"+type];
						if(!original && handler)
						{
							element["_on"+type] = handler;
							if(typeof handler === "string")
							{
								element["on"+type] = "(function(){" + handler + ";return true;})()";
							}
							else
							{
								element["on"+type] = function(e){this["_on"+type](e);return true;};
							}
						}
					}
			var my = document.getElementById('__disableReturnfalse__');
				my.parentNode.removeChild(my);
			//	},true);
			}+")(\""+ type +"\");";

		document.head.appendChild(newScript);

	//	document.body.style.webkitUserSelect = "text !important";
	//	document.body.style.MozUserSelect = "text !important";
	//	document.body.style.userSelect = "text !important";

	},

	enableReturnfalse : function(type)
	{

		var newScript = document.createElement('script');
			newScript.setAttribute('data-cbh-dummy',"eventhandler");
			newScript.setAttribute('id',"__disableReturnfalse__");

			newScript.textContent = "(" + function _disableReturnfalse(type)
			{
			//	window.addEventListener(type,function()
			//	{
					var elements = document.getElementsByTagName("*");
					for(var i = 0,element;element = elements[i];++i)
					{
						var original = element["_on"+type];
						if(original)
						{
							element["on"+type] = original;
							delete element["_on"+type];
						}
					}
			var my = document.getElementById('__disableReturnfalse__');
				my.parentNode.removeChild(my);
			//	},true);
			}+")(\""+ type +"\");";

		document.head.appendChild(newScript);

	},
};

WHO.UIProtection.start();

window.addEventListener('focus',function(e)
{
	if(!e.target.nodeType || e.target.nodeType === 9)
	{
		WHO.UIProtection.getPrefs();

	}

},true);
