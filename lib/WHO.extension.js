// This file is used in "LinkRedirector" also. You can skip review if this is not "LinkRedirector".
"use strict";
// Common file of QuaBEx Extensions
// Copyright (c) 2012-2015 by FAR/RAKUDA All Rights Reserved

/****************************************************************************************************/
/* Extension API                                                                                    */
/*

	This file wraps APIs of the Extension pages.

	WHO.extension

		Methods

			getURL : string WHO.extension.getURL(string Filename)

			addEventListener    : undefined WHO.extension.addEventListener(string EventType,function EventListener)
			removeEventListener : undefined WHO.extension.removeEventListener(string EventType,function EventListener)

			addMessagerListener   : undefined WHO.extension.addMessageListener(string MessageType,function MessageListener)
				MessageListener(object MessagePort,object Message)

					MessagePort : 

						Methods
							postMessage : undefined MessagePort.postMessage(string MessageType,object Message)

						Properties

							source : object _port of Browser native port
							url    : URL of sender
							tab    : WHO.extension._tab

			removeMEssageListener : undefined WHO.extension.removeMessageListener(string MessageType,function MessageListener)
			broadcastMessage      : undefined WHO.extension.broadcastMessage(string MessageType,object Message)

			addRequestListener    : undefined WHO.extension.addRequestListener(string RequestType,function RequestListener)
			removeRequestListener : undefined WHO.extension.removeRequestListener(string RequestType,function RequestListener)

			addExternalRequestListener    : undefined WHO.extension.addExternalRequestListener(string RequestType,function RequestListener)
			removeExternalRequestListener : undefined WHO.extension.removeExternalRequestListener(string RequestType,function RequestListener)

		Properties

			isBackground   : boolean
			isWebExtension : boolean
			isBlink        : boolean
			isChrome       : boolean
			isOPR          : boolean
			isVivaldi      : boolean
			isFirefox      : boolean
			isSafari       : boolean
			isJetpack      : boolean

			storage :

				Methods

					getItem : 
					setItem : 

	EventTypes

		install    :
		ready      : Occurs when WHO.extension object is ready
		disconnect : 
                                                                                                    */
/****************************************************************************************************/

// Fixed::Bug::Firefox::0001::1217944 - Wildcards don't work in web_accessible_resources
// Fixed::Bug::Firefox::0003 - chrome.runtime.connect/chrome.runtime.sendMessage calls every extensions.
// Bug::Firefox::0005::1213473 - (webext-runtime) Complete the implementation of chrome.runtime - chrome.runtime.getPackageDirectoryEntry is not implemented.
// Fixed::Bug::Firefox::0008::1258360 - Implements runtime.onMessageExternal/onConnectExternal.
// Bug::Firefox::0009 - chrome.runtime.onMessage responseCallback is not work. responseCallback should not be in "if","function" block.
// Fixed::Bug::Firefox::0011::1208874 - localStorage in background script seems to be temporary = Extension's URL is reset every restart.
// Bug::Firefox::0012 - content_script methods called by runtime never access DOM of window.
// Bug::Firefox::0014 - chrome.windows.onCreated and chrome.tabs.onCreated is not fired when a popup window is opened.
// Fixed::Bug::Firefox::0007 - webRequestBlocking API supports only {cancel:true}
// Bug::Firefox::0015::1256122 - Redirecting to moz-extension:// with webRequest.onBeforeSendHeaders fails with Security Error
// Bug::Firefox::0016 - chrome.webRequest addListener does not work well if options are not same.
// Bug::Firefox::0017 - "_port"s in Chrome are same but they in Firefox are not same per connect.

// Bug::Blink::0001 - executeScript is sometimes not executed when navigated from "chrome://" page..
// Bug::Blink::0002 - executeScript does sometimes delay when runAt option is "document_start" and tab is new one.

//console.log(chrome);
//console.log(browser);

var WHO = WHO || {};

	/********************************************************************************************/

	WHO.extension = WHO.extension || {};
	WHO.extension.isBackground = true;

	/* Sniffs browsers */

	if(window.chrome)
	{

	//	console.log(chrome.runtime);

		WHO.extension.isWebExtension = true;

		if(window.navigator.vendor === "Google Inc.")
		{

			WHO.extension.isBlink = true;
			WHO.extension.BlinkVersion = parseInt(/\bChrome\/(\d+)/.exec(window.navigator.userAgent)[1]);

			if(window.opr || window.navigator.userAgent.indexOf(" OPR/") !== -1)
			{

				WHO.extension.isOPR = true;

			}
			else
			if(window.navigator.userAgent.indexOf(" Vivaldi/") !== -1)
			{

				WHO.extension.isVivaldi = true;

			}
			else
			{

				WHO.extension.isChrome = true;

			}
		}
		else
		if(window.navigator.userAgent.indexOf(" Edge/") !== -1)
		{

			WHO.extension.isEdge = true;
			chrome = browser;

		}
		else
	//	if(window.navigator.userAgent.indexOf(" Firefox/") !== -1)
		{

			WHO.extension.isFirefox = true;

		}

	}
	else
	if(window.safari)
	{

		WHO.extension.isSafari = true;

	}
	else
	{

		WHO.extension.isJetpack = true;

	}

	/********************************************************************************************/

	/* #     # ###### ######  ###### #     # ####### ###### #     #  #####  ###  #####  #     # */
	/* #     # #      #     # #       #   #     #    #      ##    # #     #  #  #     # ##    # */
	/* #     # #      #     # #        # #      #    #      # #   # #        #  #     # # #   # */
	/* #  #  # #####  ######  #####     #       #    #####  #  #  #  #####   #  #     # #  #  # */
	/* #  #  # #      #     # #        # #      #    #      #   # #       #  #  #     # #   # # */
	/* #  #  # #      #     # #       #   #     #    #      #    ## #     #  #  #     # #    ## */
	/*  ## ##  ###### ######  ###### #     #    #    ###### #     #  #####  ###  #####  #     # */

	if(WHO.extension.isWebExtension)
	{

	//	console.log(chrome);
		WHO.extension._isDocumentReady = false;

		WHO.extension._baseDir = window.location.pathname.slice(1,window.location.pathname.lastIndexOf("/") + 1)

		//------------------------------------------------------------------------------------//

		WHO.extension.getURL = function(filename)
		{
			return chrome.extension.getURL(filename);
		};

		/*******************************************************************************/
		/* Storage */

	//	if(WHO.extension.isBlink)
	//	{

			WHO.extension.storage = window.localStorage;
			WHO.extension._isStorageReady = true;

	//	}
	//	// Bug::Firefox::0011//fixed
	//	else
	//	{
    //
	//		WHO.extension._isStorageReady = false;
	//		WHO.extension._storage = window.localStorage;
    //
	//	//	chrome.storage.local.clear(function(){console.info("Clear Storage");});
    //
	//		chrome.storage.local.get(null,function(items)
	//		{
    //
	//			for(var key in items)
	//			{
	//				WHO.extension._storage.setItem(key,items[key]);
	//			}
    //
	//			console.info("Preferences are restored");
    //
	//			WHO.extension._isStorageReady = true;
	//			WHO.extension._ready();
    //
	//		});
    //
	//		WHO.extension.storage =
	//		{
	//			setItem : function(key,value)
	//			{
	//				var data = {};
	//				data[key] = value;
	//				WHO.extension._storage.setItem(key,value);
	//				chrome.storage.local.set(data);
	//			},
	//			getItem : function(key)
	//			{
	//			//	console.log("Get " + key);
    //
	//				return WHO.extension._storage.getItem(key);
	//			},
	//		};
	//	}

		/*******************************************************************************/
		/* class Port */

		WHO.extension._port = function(_port,_tab)
		{

			this.source = _port.sender;
			// Firefox では sender オブジェクトが接続毎に異なるバグ
			if(WHO.extension.isFirefox)
			{
				this.source = _port.sender.contextId;
			}
			this._port  = _port;
			this._tab   = _tab;
			this.url    = _port.sender.url;//_port.sender.tab ? _port.sender.tab.url : "",

			Object.defineProperty(this,"tab",
			{
				get : function()
				{
					var tab = null;
					var _tab = this._tab||this._port.tab;
					if(_tab && _tab.index > -1)//panel は index : -1
					{

						tab = new WHO.extension._tab(_tab);//_port が接続されたときの _tab の状態が取得される

					}
					return tab;
				}
			});

			return this;

		};

		WHO.extension._port.prototype.postMessage = function(type,message)
		{

			if(WHO.extension.isFirefox && this.source.port)
			{

				this.source.port.postMessage({type:type,message:message},"*");

			}
			else
			{

				this._port.postMessage({type:type,message:message});

			}

		};

		/*******************************************************************************/
		/* class Tab */

		WHO.extension._tabPorts = {};    //タブの top frame のポート

		WHO.extension._tab = function(_tab)
		{
			this._tab     = _tab;
			this.id       = _tab.id;
			this.title    = _tab.title;
			this.url      = _tab.url;
			this.favicon  = _tab.favIconUrl;
			this.windowId = _tab.windowId;
  		//	this.port = null;
		//	this.selected = _tab.highlighted;

			Object.defineProperty(this,"selected",
			{

				get : function()
				{

				//	return this._tab.highlighted;//OPR で highlighted が返らない DNA-36731@bugs.opera.com.
					return this._tab.highlighted||this._tab.selected;//_port が接続したときの状態

				}

			});

			/* タブからポートを取得 */

			Object.defineProperty(this,"port",
			{
				get : function()
				{
					var port = null;

					if(WHO.extension._tabPorts[this._tab.id])// && this.url === WHO.extension._tabPorts[this._tab.id].sender.url)//セキュリティ的に URL チェックした方が良さそうなんだが・・・
					{

						port = new WHO.extension._port(WHO.extension._tabPorts[this._tab.id],this._tab);

					}

					return port;

				}
			});

			return this;

		};
		WHO.extension._tab.prototype.remove = function()
		{
			chrome.tabs.remove(this._tab.id,function(){});
		};
		WHO.extension._tab.prototype.reload = function()
		{
			chrome.tabs.reload(this._tab.id,{bypassCache:true});
		};
		WHO.extension._tab.prototype.replace = function(replacedURL)
		{
			chrome.tabs.update(this._tab.id,{url:replacedURL});
		};

		/**************************************************************************************/
		/* Events */

		WHO.extension._readyListener      = [];
		WHO.extension._disconnectListener = [];// disconnect
		WHO.extension.addEventListener = function(type,listener)
		{

			if(type === "install")
			{

				chrome.runtime.onInstalled.addListener(function(dt)
				{
					listener(
					{
						type:"install",
						id  : dt.id,
						previousVersion:dt.previousVersion,
						reason         :dt.reason,
					})
				});

			}
			else
			if(type === "ready")
			{
				WHO.extension._readyListener.push(listener);
				WHO.extension._ready();
			}
			else
			if(type === "disconnect")
			{

				WHO.extension._disconnectListener.push(listener);

			}

		};
		WHO.extension._ready = function()
		{
			if(WHO.extension._isStorageReady/* && WHO.extension._isDocumentReady*/)
			{

				for(var i = 0,listener;listener = WHO.extension._readyListener[i];++i)
				{
					listener(
					{
						type   :"ready",
					});
				}

				WHO.extension._readyListener = [];

			}
		};

	//	WHO.extension._DOMContentLoaded = function(e)
	//	{
	//		WHO.extension._isDocumentReady = true;
	//		WHO.extension._ready();
	//		document.removeEventListener('DOMContentLoaded',WHO.extension._DOMContentLoaded);
	//	};
	//	document.addEventListener('DOMContentLoaded',WHO.extension._DOMContentLoaded);

		/**************************************************************************************/
		/* Messaging */

		WHO.extension.portId_ = 0;

		//------------------------------------------------------------------------------------//
		/* メッセージ受信 */

		WHO.extension.addMessageListener = function(type,listener)
		{

			listener.connectListener = listener.connectListener||{};

			if(listener.connectListener[type])
			{
				return;
			}

			listener.connectListener[type] = function(_port)
			{
				if(_port.name === "connect"/* && _port.sender.id === chrome.runtime.id*/)// Fixed::Bug::Firefox::0003
				{

				// Bug::Firefox::0017 - "_port"s in Chrome are same but they in Firefox are not same per connect.
				//	console.log("message : " , type + " : " , _port.portId_ , _port);
				//	_port.portId_ = _port.portId_ || ++WHO.extension.portId_;//Opera Dev 21 のバグ？ portId_ を補完
				//	console.log(_port);

					// Firefox では sender オブジェクトが接続毎に異なるバグ
				//	if(WHO.extension.isFirefox && _port.sender.tab && _port.sender.frameId === 0 && WHO.extension._tabPorts[_port.sender.tab.id].sender.contextId === _port.sender.contextId)
				//	{
                //
				//		WHO.extension._tabPorts[_port.sender.tab.id].sender = _port.sender;
                //
				//	}

					var messageListener = function(data,__port)
					{
						if(data.type === type)
						{

							var port = __port || _port;//Firefox では接続毎に異なる→同じでなければならない→どう解決する？
							listener(new WHO.extension._port(port,port.sender.tab),data.message);

						}
					};

					_port.onMessage.addListener(messageListener);

					//接続先がアンロードされた時
					//onDisconnect は始めに追加された一つだけ有効。 addListener なのに、その他は無効。なんじゃそれ。

					var disconnectListener = function(_port)
					{
						if(_port)
						{
						//	console.log("disMessage : " + type + _port.portId_);
							_port.onDisconnect.removeListener(disconnectListener);

							_port.onMessage.removeListener(messageListener);
						}

					};

					_port.onDisconnect.addListener(disconnectListener);

				}

			};

			chrome.runtime.onConnect.addListener(listener.connectListener[type]);

		};

		/* メッセージ受信を削除 */

		WHO.extension.removeMessageListener = function(type,listener)
		{
			listener.connectListener = listener.connectListener||{};
			chrome.runtime.onConnect.removeListener(listener.connectListener[type]);
			delete listener.connectListener[type];
		};

		//WHO.extension.addEventListenr('disconnect',...);
		chrome.runtime.onConnect.addListener(function(_port)
		{

			if(_port.name === "connect"/* && _port.sender.id === chrome.runtime.id*/)// Fixed::Bug::Firefox::0003
			{

			//	_port.portId_ = _port.portId_ || ++WHO.extension.portId_;//Opera Dev 21 のバグ？ portId_ を補完

				// ポートがタブの top なら
				if(_port.sender.tab && _port.sender.frameId === 0)
				{

					WHO.extension._tabPorts[_port.sender.tab.id] = _port;

				}

				/* ポートを切断・破棄 */

				var disconnectListener = function()
				{
				//	console.log("dicsonnect : " + _port.portId_);

					// タブのポートを削除
					if(_port.sender.tab && _port.sender.frameId === 0)
					{

						delete WHO.extension._tabPorts[_port.sender.tab.id];

					}

					for(var i = 0,listener;listener = WHO.extension._disconnectListener[i];++i)
					{
						listener(
						{
							type   :"disconnect",
							source : _port.sender,
							origin : _port.sender.url,//_port.sender.tab ? _port.sender.tab.url : "",
						});
					}

					_port.onDisconnect.removeListener(disconnectListener);

				};

				_port.onDisconnect.addListener(disconnectListener);

			}

		});

		//------------------------------------------------------------------------------------//
		/* ポートへの一斉送信 */

		WHO.extension.broadcastMessage = function(type,message)
		{

			chrome.tabs.query({},function(_tabs)
			{
				for(var i = 0,_tab;_tab = _tabs[i];++i)
				{
					chrome.tabs.sendMessage(_tab.id,{type:type,message:message},function(){});
				}
			});

		};

		/****************************************************************************************/

		/* ######  #      ### #     # #    ## */
		/* #     # #       #  ##    # #   #   */
		/* #     # #       #  # #   # #  #    */
		/* ######  #       #  #  #  # # #     */
		/* #     # #       #  #   # # ## #    */
		/* #     # #       #  #    ## #   #   */
		/* ######  ###### ### #     # #    ## */

		if(WHO.extension.isBlink || WHO.extension.isEdge)
		{

			//------------------------------------------------------------------------------------//
			/* リクエスト受信 */

			WHO.extension.addRequestListener = function(type,listener)
			{
				listener.requestListener = listener.requestListener||{};
				if(listener.requestListener[type])
				{
					return;
				}
				listener.requestListener[type] = function(data,_sender,messageCallback)
				{

					if(data.type === type)
					{

						var sender =
						{
							source          : _sender,//後方互換
							tab             : _sender.tab ? new WHO.extension._tab(_sender.tab) : null,
							url             : _sender.tab ? _sender.tab.url : "",
							messageCallback : messageCallback
						}

						listener(sender,data.message);
					}
				};
				chrome.runtime.onMessage.addListener(listener.requestListener[type]);
			};

			/* リクエスト受信を削除 */

			WHO.extension.removeRequestListener = function(type,listener)
			{
				listener.requestListener = listener.requestListener||{};
				chrome.runtime.onMessage.removeListener(listener.requestListener[type]);
				delete listener.requestListener[type];
			};

			//------------------------------------------------------------------------------------//
			/* 外部 Extension からの の単発メッセージ受信 */
			// Chrome 専用

			WHO.extension.addExternalRequestListener = function(type,listener)
			{
				listener.externalRequestListener = listener.externalRequestListener||{};
				if(listener.externalRequestListener[type])
				{
					return;
				}
				listener.externalRequestListener[type] = function(data,_sender,messageCallback)
				{
					if(data.type === type)
					{

						var sender =
						{
							source          : _sender,//後方互換
							tab             : _sender.tab ? new WHO.extension._tab(_sender.tab) : null,
							url             : _sender.tab ? _sender.tab.url : "",
							messageCallback : messageCallback
						}

						listener(sender,data.message);
					}
				};
				chrome.runtime.onMessageExternal.addListener(listener.externalRequestListener[type]);
			};

			/* 外部 Extension からの の単発メッセージ受信を削除 */

			WHO.extension.removeExternalRequestListener = function(type,listener)
			{
				listener.externalRequestListener = listener.externalRequestListener||{};
				chrome.runtime.onMessageExternal.removeListener(listener.externalRequestListener[type]);
				delete listener.externalRequestListener[type];
			};

		}
		else

		/****************************************************************************************/

		/* ###### ### #####  ###### ######  #####  #     # */
		/* #       #  #    # #      #      #     #  #   #  */
		/* #       #  #    # #      #      #     #   # #   */
		/* #####   #  #    # #####  #####  #     #    #    */
		/* #       #  #####  #      #      #     #   # #   */
		/* #       #  #  #   #      #      #     #  #   #  */
		/* #      ### #   ## ###### #       #####  #     # */

		if(WHO.extension.isFirefox)
		{

			//------------------------------------------------------------------------------------//
			/* リクエスト受信 */

			// Bug::Firefox::0009

			WHO.extension._requestListeners = {};

			WHO.extension.addRequestListener = function(type,listener)
			{

				WHO.extension._requestListeners[type] = WHO.extension._requestListeners[type]||[];
				WHO.extension._requestListeners[type].push(listener);

			};

			/* リクエスト受信を削除 */

			WHO.extension.removeRequestListener = function(type,listener)
			{
				for(var i = 0,_listener;_listener = WHO.extension._requestListeners[type][i];++i)
				{
					if(_listener === listener)
					{
						WHO.extension._requestListeners[type].splice(i,1);
						break;
					}
				}
			};

			// Bug::Firefox::0009
			chrome.runtime.onConnect.addListener(function(_port)
			{

				if(_port.name === "request"/* && _port.sender.id === chrome.runtime.id*/)//Fixed::Bug::Firefox:0003
				{

					var messageListener = function(data,__port)
					{

						var sender =
						{
							source          : _port.sender,//後方互換
							tab             : _port.sender.tab ? new WHO.extension._tab(_port.sender.tab) : null,
							url             : _port.sender.url,
							messageCallback : function(message)
							{
								_port.postMessage(message);
							//	_port.disconnect();
							}
						}

						for(var i = 0,listener;listener = WHO.extension._requestListeners[data.type][i];++i)
						{

							listener(sender,data.message);

						}

					};

					_port.onMessage.addListener(messageListener);

					/* ポートを切断・破棄 */

					var disconnectListener = function()
					{

					//	console.log("request port is disconnected");
						_port.onMessage.removeListener(messageListener);
						_port.onDisconnect.removeListener(disconnectListener);

					};

					_port.onDisconnect.addListener(disconnectListener);
				}

			});

			//------------------------------------------------------------------------------------//
			/* 外部 Extension からの の単発メッセージ受信 */

			// Fixed::Bug::Firefox::0008

			WHO.extension._requestExternalListeners = {};

			WHO.extension.addExternalRequestListener = function(type,listener)
			{

				WHO.extension._requestExternalListeners[type] = WHO.extension._requestExternalListeners[type]||[];
				WHO.extension._requestExternalListeners[type].push(listener);

			};

			/* 外部 Extension からの の単発メッセージ受信を削除 */

			WHO.extension.removeExternalRequestListener = function(type,listener)
			{
				// Bug::Firefox::0002
				for(var i = 0,_listener;_listener = WHO.extension._requestExternalListeners[type][i];++i)
				{
					if(_listener === listener)
					{
						WHO.extension._requestExternalListeners[type].splice(i,1);
						break;
					}
				}
			};

			WHO.extension._executeRequestListener = function(type,message,messageCallback,url)
			{

				var sender =
				{
					source          : {url:url},//後方互換
					url             : url,
					messageCallback : messageCallback
				}

				for(var i = 0,listener;listener = WHO.extension._requestListeners[type][i];++i)
				{

					listener(sender,message);

				}

			};

			// Fixed::Bug::Firefox::0008
			chrome.runtime.onConnectExternal.addListener(function(_port)
			{

			//	if(_port.name === chrome.runtime.id)//Fixed::Bug::Firefox:0003
			//	{
					var messageListener = function(data,__port)
					{

						var sender =
						{
							source          : _port.sender,//後方互換
							tab             : _port.sender.tab ? new WHO.extension._tab(_port.sender.tab) : null,
							url             : _port.sender.url,
							messageCallback : function(message)
							{
								_port.postMessage(message);
							//	_port.disconnect();
							}
						}

						for(var i = 0,listener;listener = WHO.extension._requestExternalListeners[data.type][i];++i)
						{

							listener(sender,data.message);

						}

					};

					_port.onMessage.addListener(messageListener);

					/* ポートを切断・破棄 */

					var disconnectListener = function()
					{

					//	console.log("request port is disconnected");
						_port.onMessage.removeListener(messageListener);
						_port.onDisconnect.removeListener(disconnectListener);

					};

					_port.onDisconnect.addListener(disconnectListener);
			//	}

			});
		// Fixed::Bug::Firefox::0008
		//	chrome.runtime.onConnectExternal.addListener(function(_port)
		//	{
		//		console.log(_port);
		//	});
		//	chrome.runtime.onMessageExternal.addListener(function(_port)
		//	{
		//		console.log(_port);
		//	});

		}

	}
