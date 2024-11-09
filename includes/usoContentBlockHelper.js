"use strict";
// Copyright (c) 2012-2016 by FAR/RAKUDA All Rights Reserved

/****************************************************************************************************/
/* ContentBlockHelper                                                                               */
/*
	This provides UI
                                                                                                    */
/****************************************************************************************************/

var WHO = WHO || {};
/* WHO.extension = WHO.extension || {};

			WHO.extension.sendRequest = function(type,message,callback)
			{

				var _port = chrome.runtime.connect({name:"request"});

				if(callback)
				{

					var _listener = function(data)
					{
					//	console.log(data);
						callback(data);
						_port.onMessage.removeListener(_listener);
						_port.disconnect();
						_port = undefined;
					};
					_port.onMessage.addListener(_listener);
					window.setTimeout(function()
					{
						if(_port)
						{
						//	console.info("response does not return",type,message);
						//	callback();
							_port.onMessage.removeListener(_listener);
							_port.disconnect();
							_port = undefined;
						}
					},2000);

				}

				_port.postMessage({type:type,message:message});

				if(!callback)
				{
					_port.disconnect();
					_port = undefined;
				}

			}; */

	/**************************************************************************************/

	WHO.ContentBlockHelper = 
	{

		start : function()
		{

			this.maker;                  //フィルターメーカー

			/* 初期設定 */

			this.loaded  = false;   //読み込み済み : ポップアップでむやみにリストが更新されるのを防ぐ
			this.focused = false;	//フォーカスタブかどうか

			/* 設定の読み込み */

			this.getPrefs();

			//------------------------------------------------------------------------------------//

			/* キーボードショートカット UI */

			window.addEventListener('keydown',this.listenKeyboard.bind(this));

			/* ポップアップ UI */

			WHO.extension.addMessageListener('ContentBlockHelper',this.messageListener.bind(this));

			//------------------------------------------------------------------------------------//

			/* フォーカスタブの管理 */

			this.setActivePort(false);

			window.addEventListener('focus',function(e)
			{

				this.loaded = true;
				if(!e.target.nodeType || e.target.nodeType === 9)
				{

					this.setActivePort(true);

				}

			}.bind(this),true);

			window.addEventListener('blur',function(e)
			{

				this.focused = false;
				WHO.ResourceDetector.focused = false;

			}.bind(this),false);

			// 戻る・進む イベント

			window.addEventListener('popstate',function(e)
			{

				this.setActivePort(this.focused);
				WHO.ResourceDetector.sendResourcesWithInterval();

			}.bind(this),false);

		},

		//------------------------------------------------------------------------------------//
		/* フィルターメーカーをロードする */

		startMaker : function()
		{

			if(!this.maker)
			{

				this.maker = new WHO.FilterMaker(this.CSSRules);

			}

		},

		//------------------------------------------------------------------------------------//
		/* 設定取得 */

		getPrefs : function()
		{

			WHO.extension.sendRequest('ContentBlockHelper',{method:"getPrefs"},function(message){this.initPrefs(message.prefs);}.bind(this));

		},

		/* 初期設定 */

		initPrefs : function(prefs)
		{

		//	console.log("Get Prefs",prefs);

			var self = this;

			/* CSS ブロック用 style を適用 */

			this.CSSRules  = prefs.CSSRules||[];//ユーザー Selector フィルター

			if(!this.maker || !this.maker.mode)//ブロックモードじゃないとき
			{

				if(document.documentElement instanceof window.HTMLHtmlElement && document.head instanceof window.HTMLHeadElement)
				{

					WHO.ElementRemover.createCSSBlockStyle(prefs.CSSRules,false);

				}
				else
				{

					document.addEventListener('DOMContentLoaded',function()
					{

						WHO.ElementRemover.createCSSBlockStyle(prefs.CSSRules,false);

					},false);

				}

			// 下の方法では遅延が発生する
			//	if(!document.readyState || document.readyState == "loading")
			//	{
			//		document.addEventListener('DOMContentLoaded',(function(helper){return function()
			//		{
			//			helper.createCSSBlockStyle();
			//		}})(this),false);
			//	}
			//	else
			//	{
			//		this.createCSSBlockStyle();
			//	}

			}

			/* キーボードショートカット */

			this.shortcutkey = prefs.shortcutkey||{};

		},

		/**************************************************************************************/
		//------------------------------------------------------------------------------------//
		/* UI の設定 */

		/* Listen Keyboard Event : キーボード */
		//commands API に換える

		listenKeyboard : function(e)
		{

			var key = this.shortcutkey;

			if(key.button && key.button.altKey === e.altKey && key.button.shiftKey === e.shiftKey && key.button.ctrlKey === e.ctrlKey && key.button.keyCode === e.keyCode)
			{

				WHO.extension.sendRequest('ButtonConfig',{method:"toggle"});

			}
			else
			//コンテンツ追加モード
			if(key.iframe && key.iframe.altKey === e.altKey && key.iframe.shiftKey === e.shiftKey && key.iframe.ctrlKey === e.ctrlKey && key.iframe.keyCode === e.keyCode)
			{

				WHO.extension.sendRequest('ContentBlockHelper',{method:"changeMode",mode:"iframe"});

			}
			else
			//モジュール追加モード
			if(key.module && key.module.altKey === e.altKey && key.module.shiftKey === e.shiftKey && key.module.ctrlKey === e.ctrlKey && key.module.keyCode === e.keyCode)
			{

				WHO.extension.sendRequest('ContentBlockHelper',{method:"changeMode",mode:"module"});

			}
			else
			//スクリプト追加モード
			if(key.script && key.script.altKey === e.altKey && key.script.shiftKey === e.shiftKey && key.script.ctrlKey === e.ctrlKey && key.script.keyCode === e.keyCode)
			{

				WHO.extension.sendRequest('ContentBlockHelper',{method:"changeMode",mode:"script"});

			}
			else
			//CSS 追加モード
			if(key.css && key.css.altKey === e.altKey && key.css.shiftKey === e.shiftKey && key.css.ctrlKey === e.ctrlKey && key.css.keyCode === e.keyCode)
			{

				WHO.extension.sendRequest('ContentBlockHelper',{method:"changeMode",mode:"css"});

			}
			else
			//追加モード終了
			if(key.finish && key.finish.altKey === e.altKey && key.finish.shiftKey === e.shiftKey && key.finish.ctrlKey === e.ctrlKey && key.finish.keyCode === e.keyCode)
			{

				WHO.extension.sendRequest('ContentBlockHelper',{method:"changeMode",mode:""});

			}
			else
			{

				return;

			}

			e.preventDefault();

		},

		//------------------------------------------------------------------------------------//
		/* Listen messages from background : メッセージ */

		messageListener : function(message)
		{

			/* Background の準備が完了したよ */

			if(message.method === "readyBackground")
			{

				/* CSS 規則の読み込み */

				if(!this.CSSRules)
				{

					this.getPrefs();

				}

				this.setActivePort(false);

				/* インラインコンテンツの再読込 */

				if(document.documentElement instanceof window.HTMLHtmlElement && document.body instanceof window.HTMLBodyElement)
				{

					this.reloadElementResources(document.body.querySelectorAll('iframe[src]:not([data-cbh-blocked]),embed[src]:not([data-cbh-blocked]),audio[src]:not([data-cbh-blocked]),video[src]:not([data-cbh-blocked]),object[data]:not([data-cbh-blocked]),img[src]:not([data-cbh-blocked])'));

				}

			}
			else

			//------------------------------------------------------------------------------------//
			/* ページの外部要素の取得 */
			//フォーカスタブになった時に取得

			if(message.method === "getFocusedStatus")
			{

				this.focused = true;
				WHO.ResourceDetector.focused = true;
				if(this.loaded)
				{
					WHO.ResourceDetector.sendResources();
				}
				this.loaded = true;

			}
			else

			//------------------------------------------------------------------------------------//
			/* 規則追加モード */
			//追加モードを開始
			if(message.method === "enterAppendMode")
			{

				this.startMaker();

				WHO.ElementRemover.createCSSBlockStyle(this.CSSRules,true);
				WHO.ResourceDetector.removeCollapseStyle();
				this.maker.enterAppendMode(message.mode,message.URLRules);

			}
			else
			//追加モードを終了
			if(message.method === "leaveAppendMode")
			{

				this.startMaker();

				this.maker.leaveAppendMode();
				WHO.ElementRemover.createCSSBlockStyle(this.CSSRules,false);
				WHO.ResourceDetector.createCollapseStyle();

			}
			else
			//新しい規則が追加された
			if(message.method === "addedNewRule")
			{

				this.CSSRules.push(message.rule);
				WHO.ElementRemover.createCSSBlockStyle(this.CSSRules,false);
				WHO.ResourceDetector.createCollapseStyle();

			}
			else

			//------------------------------------------------------------------------------------//
			/* ポップアップにより変更された規則を適用してリソースの表示状態を変更する */
			if(message.method === "updateResourcesState")
			{

				WHO.ResourceDetector.updateResourcesState(message.resources);

			}

		},

		//------------------------------------------------------------------------------------//
		/* active ページであることを background に知らせる */

		setActivePort : function(focused)
		{

			WHO.extension.postMessage('ActivePort',
			{
				method       : focused ? "focus" : "load",
				mode         : this.maker ? this.maker.mode : null,
				resources    : WHO.ResourceDetector.resourceList,
				loadedScript : WHO.ResourceDetector.loadedScript||0,
			});

		},

		/**************************************************************************************/

		/* リソースを再表示する */

		reloadElementResources : function(elements)
		{

			/* 再表示する */
			for(var i=0,element;element=elements[i];++i)
			{

			//	if(element.hasAttribute('data-cbh-blocked'))
			//	{

					element.removeAttribute('data-cbh-blocked');
					WHO.ResourceDetector.reloadElementResource(element);

			//	}

			}

		},

	};

	/**************************************************************************************/

(function()
{

	WHO.ContentBlockHelper.start();
/* 
	//	DOM 構築を監視する
	var s = document.createElement('script');
	s.textContent = "(" + function()
	{
		var ac = window.Node.prototype.appendChild.valueOf();
		window.Node.prototype.appendChild = function(element)
		{
			var script = document.currentScript;
			if(script && script.src)
			{
				console.log(script.src);
				element.setAttribute('data-generate-script',script.src);
			}
			ac.call(this,element);
		};
	}+")()";
	//document.write
	//Node.prototype.insertBefore
	document.addEventListener('DOMContentLoaded',function()
	{
		document.head.appendChild(s);
	});
*/
})();

/**************************************************************************************/
