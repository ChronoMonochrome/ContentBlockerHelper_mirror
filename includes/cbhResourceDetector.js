"use strict";
// Copyright (c) 2012-2016 by FAR/RAKUDA All Rights Reserved

/****************************************************************************************************/
/* ContentBlockHelper ResourceDetector                                                              */
/*
	Detects resources state.
	Collapses the blocked elements.
                                                                                                    */
/****************************************************************************************************/

var WHO = WHO || {};

	/**************************************************************************************/

	WHO.ResourceDetector = 
	{
		selectorOfType :
		{
			"script"    : "script",
			"stylesheet": "style",
			"sub_frame" : "iframe",
			"image"     : "img",
			"object"    : "object,embed",
			"audio"     : "audio,audio source",
			"video"     : "video,video source",
		},
		start : function()
		{

			this.focused = false;
			this.collapseStyle = null;

			//------------------------------------------------------------------------------------//

			this.resourceList     = {};    //リソースのリスト
			this.pageList         = [];   //フレーム

			this.addExternalTimer = null; //外部コンテンツを一定間隔で確認する

			this.schemetest       = /^(data|widget|chrome|chrome-extension|moz-extension|javascript|about|opera|file):/i;//外部コンテンツの確認から除外する

			this.metacontent      = /^(\d+)(?:\s*?;\s*?url\s*?=\s*?(.+))?$/i;//refresh-meta の content 要素を解析する

			//------------------------------------------------------------------------------------//

			/* Collapse スタイルを注入 */

			if(document.documentElement instanceof window.HTMLHtmlElement && document.head instanceof window.HTMLHeadElement)
			{

				this.createCollapseStyle();

			}
			else
			{

				document.addEventListener('DOMContentLoaded',this.createCollapseStyle.bind(this),false);

			}

			//------------------------------------------------------------------------------------//

			/* インラインコンテンツを検出 */

			if(!document.readyState || document.readyState === "loading")
			{

				document.addEventListener('DOMContentLoaded',this.detectInlineContents.bind(this),false);

			}
			else
			{

				this.detectInlineContents();

			}

			//------------------------------------------------------------------------------------//

			/* リソースのリストを取得 */

			//既に読み込み済みのリソースのリストを取得
			WHO.extension.sendRequest('urlfilter',{method:"getResources"},function(message)
			{

				message.resources.forEach(this.registerResource,this);//フィルタリングされたりソースを登録

				this.sendResourcesWithInterval();

			}.bind(this));

			/* WHO.urlfilter.js からの読み込み情報 */
			// 戻る・進む等でキャッシュから読み込む時は出ない
			WHO.extension.addMessageListener('urlfilter',function(message)
			{

				if(message.method === "onRequest")
				{

					this.registerResource(message.resource);

					this.sendResourcesWithInterval();

				}

			}.bind(this));

			//------------------------------------------------------------------------------------//

			/* Register Cache Resource : キャッシュのリソースを解析 */

			document.addEventListener('load'    ,this.detectCacheResource.bind(this),true);

			/* 読み込みエラーのリソースを解析 */

			document.addEventListener('error'    ,function(e)
			{

				var element = e.target;

			//	console.log("error:",e);

				this.registerCacheResource(element,"failed");
				this.sendResourcesWithInterval();

			}.bind(this),true);

			/* Collapse blocked Cache iframe : キャッシュの iframe を縮める */
			// Firefox では機能しない
			// Bug::Firefox::0015::1257781 - Redirecting to moz-extension:// with webRequest.onBeforeSendHeaders fails with Security Error
			// about:blank なページでは message を受け取れない

			window.addEventListener('message',function(e)
			{

				var message = e.data;

				if(e.origin + "/" === WHO.extension.getURL("") && message.method === "setBlockedFrame")
				{

					var elements = document.getElementsByTagName('iframe');

					for(var i = 0,element;element = elements[i];++i)
					{
						if(element.contentWindow === e.source)
						{
						//	console.log(element);
							this.registerCacheResource(element,"blocked");
						}
					}

					this.sendResourcesWithInterval();

				}

			}.bind(this),false);

			return this;

		},

		/**************************************************************************************/

		//------------------------------------------------------------------------------------//
		/* Detect Inline Contents */

		detectInlineContents : function()
		{

			// Detect Inline-scripts : インラインスクリプトを検出
			this.seekInlineScripts("script","","*[data-cbh-handler]");

			// Detect Inline-stypesheets
			this.seekInlineScripts("stylesheet","*[style]","*[data-cbh-style]");

			// Detect Redirect : リダイレクトを検出
			if(WHO.extension.isBlink)
			{
				this.seekRefreshMetas();
			}

			this.sendResourcesWithInterval();

		},

		/* Detect Inline-scripts : インラインスクリプトを検出 */
		//script,stylesheet

		seekInlineScripts : function(type,att,cbhAtt)
		{

			var loaded;

			var elements = document.getElementsByTagName(this.selectorOfType[type]);

			for(var i = 0,element;element = elements[i];++i)
			{

				//インラインスクリプトの時
				if(!element.src && !element.hasAttribute('data-cbh-dummy'))
				{

					if(element.hasAttribute('data-cbh-blocked'))
					{

						loaded = "blocked";

					}
					else
					{

						loaded = "loaded";

					}

					break;

				}
			}

			if(!loaded)
			{
				if(att)
				{
					var loadedAttributes = document.querySelectorAll(att);
					if(loadedAttributes.length > 0)
					{

						loaded = "loaded";

					}
				}

				var blockedAttributes = document.querySelectorAll(cbhAtt);
				if(blockedAttributes.length > 0)
				{

					loaded = "blocked";

				}
			}

			if(loaded)
			{
				this.resourceList[window.location.href + "$" + type] =
				{
					type    : type,
					url     : window.location.href,
					page    : window.location.href,
					loaded  : loaded,
				};
			}

		},

		/* Detect Redirect by Meta refresh : リダイレクトメタ検出 */
		//only works on Blink
		//Firefox does not use : should set on browser Configuration.

		seekRefreshMetas : function()
		{

			var meta = document.querySelector('meta[http-equiv="refresh"]');

			if(meta)
			{

				var content = this.metacontent.exec(meta.getAttribute('content')||"");
				var url     = (content[2]||window.location.href).replace(/(^https?:\/\/[^\/]+$)/i,"$1/");

				/* ブロックされるべきリダイレクトかどうか */
				WHO.extension.sendRequest('ContentBlockHelper',
				{
					method:"testSrc",
					src   :
					{
						type : "redirect",//"redirect",
						url  : url,//リダイレクト先
					}
				},function(message)
				{

					var loaded = "loaded";

					if(message && message.act === "block")
					{
						loaded = "blocked";

						//遷移を中止
						//document.write は怒られる
						if(message.act === "block")
						{
							// only works on Blink
							meta.parentNode.removeChild(meta);
							document.write(document.documentElement.outerHTML);
							document.close();

						}
					}

					this.resourceList[url] =
					{
						type    : "redirect",
						url     : url,
						page    : window.location.href,
						loaded  : loaded,
					};

					this.sendResourcesWithInterval();

				}.bind(this));

			}

		},

		//------------------------------------------------------------------------------------//

		/* Detect Cache Resource */

		detectCacheResource : function(e)
		{

			var element = e.target;

		//	console.log("load : ",element);

			/* ブロックした部分を縮める : Collapse blocked elements */
			if(element && element.nodeType === 1)
			{

				//読み込まれたら表示する
				if(element.localName !== "style")
				{

					element.removeAttribute("data-cbh-blocked");

				}

				// ブロックされた画像のスペーサー
				// Bug::Firefox::0015::1257781 - Redirecting to moz-extension:// with webRequest.onBeforeSendHeaders fails with Security Error
				if(element.localName === "img" && element.naturalWidth === 7 && element.naturalHeight === 2)
				{
				//	console.log(e.type + " : " + element.src);
					this.registerCacheResource(element,"blocked");
				}
				else
				{

					this.registerCacheResource(element,"unknown");//loaded,allowed,blocked の可能性あり→unknown

				}

				this.sendResourcesWithInterval();

			}

		},

		//------------------------------------------------------------------------------------//

		/* 読み込まれたリソースを登録する */

		registerResource : function(resource)
		{

			this.resourceList[resource.url + (resource.type === "main_frame" ? "$document" : "")] =
			{
				type  :resource.type,
				url   :resource.url,
				src   :resource.src,//element の src 属性
				page  :resource.page,
				loaded:resource.loaded,
			};

			/* ページを登録 */
			if(
				(resource.type === "top" || resource.type === "main_frame" || resource.type === "subdocument" || resource.type === "sub_frame")
			&&
				this.pageList.indexOf(resource.url) < 0
			)
			{
				this.pageList.push(resource.url);
			}

			// メインフレームのリソースのみ解析

			if(resource.page === window.location.href)
			{

				/* Coppase blocked resource : ブロックした部分を縮める */

				if(resource.loaded === "blocked")
				{

					if(resource.type === "sub_frame" || resource.type === "image" || resource.type === "object" || resource.type === "audio" || resource.type === "video")
					{
						this.collapseResource(resource);
					}

				}

			}

		},

		/* キャッシュのリソースを登録する */
		// loaded  : 読み込まれた
		// failed  : 読み込まれなかった
		// blocked : 規則によって禁止された
		// allowed : 規則によって許可された
		// ignored : 規則が無視されて読み込まれた
		// unknown : 読み込まれたかどうか不明

		registerCacheResource : function(element,loaded)
		{

			var src = element.src || element.data || element.href || "";
if(element.localName === "source")
{
	console.log(element);
}
			//svg の href は object
			if(src && typeof src === "string" && !this.schemetest.test(src) && (!this.resourceList[src] || this.resourceList[src].loaded === "unknown"))
			{

				var type;

				switch(element.localName)
				{
					case "script" : type = "script"      ;break;
					case "object" : type = "object"      ;break;
					case "embed"  : type = "object"      ;break;
					case "img"    : type = "image"       ;break;
					case "link"   : type = "stylesheet"  ;break;
					case "video"  :
					case "audio"  : type = "media"       ;break;
					case "iframe" :
					case "frame"  : type = "subdocument" ;break;
					default       : type = "other"
				}

				this.registerResource(
				{
					type   : type,
					url    : src,
					src    : src,
					page   : window.location.href,
					loaded : loaded,
				});

			}

			if(loaded === "blocked")
			{
				element.setAttribute("data-cbh-blocked","blocked");
			}

		},

		//------------------------------------------------------------------------------------//

		/* 読み込まれたリソースをバックグラウンドに登録 */

		sendResources : function()
		{

		//	console.log(this.resourceList);

			WHO.extension.postMessage('ContentBlockHelper',
			{
				method       :"setResources",
				pages        : this.pageList,
				resources    : this.resourceList,
			});

		},

		/* インターバルを置いて読み込まれたリソースをバックグラウンドに登録 */

		sendResourcesWithInterval : function()
		{

			if(!this.addExternalTimer && this.focused)
			{

				this.addExternalTimer = setTimeout(function(self)
				{

					self.sendResources();

					self.addExternalTimer = null;

				},1000,this);

			}

		},

		//------------------------------------------------------------------------------------//

		/* 規則の変更でリソースの状態を変える */

		updateResourcesState : function(resources)
		{

			// 変更されたリソースの状態を登録
			Object.keys(resources).forEach(function(url,i,myArray)
			{

				var resource = resources[url];
				this.resourceList[url] = resource;

				if(resource.type === "script")
				{

					window.location.reload(false);

				}
				else
				if(resource.type === "stylesheet")
				{

					this.reloadLinkedStylesheet(resource);

				}
				else
				if(resource.type === "sub_frame" || resource.type === "subdocument" || resource.type === "image" || resource.type === "object" || resource.type === "audio" || resource.type === "video")
				{
					this.switchResourceView(resource);
				}

			},this);

			//インラインスタイルを再構築
			if(WHO.removeInlineStylesheet)
			{
				WHO.removeInlineStylesheet.getPrefs();
			}

			this.sendResources();

		},

		//------------------------------------------------------------------------------------//

		/* スタイルを適用し直す */

		reloadLinkedStylesheet : function(resource)
		{

			var styles = document.querySelectorAll('link[rel="stylesheet"]');
			for(var i = 0,style;style = styles[i];++i)
			{

				var href = style.getAttribute('data-cbh-href') || style.href;
				if(href === resource.src)
				{
					if(resource.loaded === "blocked")
					{
						style.setAttribute('data-cbh-href',href);
						style.removeAttribute('href');
					}
					else
					{
						style.setAttribute('href',href);
					}
				}

			}

		},

		/* ブロックされたリソースを縮める */

		collapseResource : function(resource)
		{

			var elements = document.querySelectorAll(this.selectorOfType[resource.type]);

			for(var i = 0,element;element = elements[i];++i)
			{

				//currentSrc -> video,audio
				var src = element.src || element.data || element.href || element.currentSrc || "";

				if(src === resource.src)
				{
					element.setAttribute('data-cbh-blocked',"blocked");
				}

			}

		},

		/* 規則の変更されたリソースの表示状態を変える */

		switchResourceView : function(resource)
		{

			var elements = document.querySelectorAll(this.selectorOfType[resource.type]);

			for(var i = 0,element;element = elements[i];++i)
			{

				var src = element.getAttribute('data-cbh-src')||element.getAttribute('data-cbh-data')||element.src||element.data||element.href|| element.currentSrc||"";

				if(src === resource.src)
				{

					/* Collapse blocked resource : 遮断されたリソースを隠す */
					if(resource.loaded === "blocked")
					{

						element.setAttribute('data-cbh-blocked',"blocked");

					}
					else
					/* Enlarge allowed resource : 許可されたリソースを再表示する */
					if(element.hasAttribute('data-cbh-blocked'))
					{

						element.removeAttribute('data-cbh-blocked');
						this.reloadElementResource(element);//再読み込み

					}

				}

			}

		},

		/* リソースを再読み込みする */

		reloadElementResource : function(element)
		{

			var src  = element.getAttribute('data-cbh-src')||element.src;
			var data = element.getAttribute('data-cbh-data')||element.data;

			/* iframe */
			if(element.contentWindow)
			{

				element.contentWindow.location.replace(src);

			}
			else
			{

				if(src)
				{
					element.setAttribute('data-cbh-src',src);
					element.setAttribute('src',src.replace(/(\?|$)/,"?reloadedbycbh&"));
				}

				if(data)
				{
					element.setAttribute('data-cbh-data',data);
					element.setAttribute('data',data.replace(/(\?|$)/,"?reloadedbycbh&"));
				}

			}

		},

		//------------------------------------------------------------------------------------//

		createCollapseStyle : function()
		{

			if(!this.collapseStyle)
			{

				this.collapseStyle = document.createElement('style');
				this.collapseStyle.setAttribute("data-cbh-dummy","dummy");
				this.collapseStyle.type = "text/css";
				document.head.appendChild(this.collapseStyle);

				var style = this.collapseStyle;

				style.appendChild(document.createTextNode("*[data-cbh-blocked]{display:none !important;}\n"));

			}

		},

		removeCollapseStyle : function()
		{

			if(this.collapseStyle)
			{

				this.collapseStyle.parentNode.removeChild(this.collapseStyle);
				delete this.collapseStyle;

			}

		},

	};

/**************************************************************************************/

WHO.ResourceDetector.start();

/**************************************************************************************/
