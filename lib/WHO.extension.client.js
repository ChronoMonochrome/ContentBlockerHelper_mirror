// This file is used in "LinkRedirector" also. You can skip review if this is not "LinkRedirector".
"use strict";
// Common file
// Copyright (c) 2012-2015 by FAR/RAKUDA All Rights Reserved

/****************************************************************************************************/
/* Extension API                                                                                    */
/*

	This file wraps APIs of content scripts for all browsers

	WHO.extension

		Methods

			getURL        : string WHO.extension.getURL(string Filename)
			getBackground : backgroundWindow WHO.extension.getBackground()

			postMessage
			addMessageListener
			removeMessageListener

			sendRequest
			sendRequestExternal
			addRequestListener

			notification : 

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
			isEdge         : boolean

/****************************************************************************************************/

var _window   = window;
var _document = document;
var WHO = WHO || {};

//	console.log(window.location.href);

	/**************************************************************************************/

	WHO.extension = WHO.extension || {};
	WHO.extension.isBackground = false;

	/* Sniffs browsers */

	if(this.chrome || this.browser)
	{

		WHO.extension.isWebExtension = true;

		if(window.navigator.vendor === "Google Inc.")
		{

			// 開発版
			if(!chrome.runtime.getManifest().key)
			{
				WHO.extension.isDev = true;
			}

			WHO.extension.isBlink = true;
			WHO.extension.BlinkVersion = parseInt(/\bChrome\/(\d+)/.exec(window.navigator.userAgent)[1]);

			// window.chrome.search : Google 検索する OPR だけに何故かある
			// window.chrome.extension.ViewType.SIDEBAR_PANEL

			if(window.opr || chrome.extension.ViewType.SIDEBAR_PANEL || window.navigator.userAgent.indexOf(" OPR/") !== -1)
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

			// if this is Popup or Preferences
			if(chrome.extension.getURL("") === window.location.protocol+"//"+window.location.host+"/")
			{

				WHO.extension.isExtensionPage = true;

			}

		}
		else
		if(window.navigator.userAgent.indexOf(" Edge/") !== -1)
		{

			WHO.extension.isEdge = true;
			this.chrome = this.browser;

			// if this is Popup or Preferences
			if(chrome.extension.getBackgroundPage)
			{

				WHO.extension.isExtensionPage = true;

			}

		}
		else
	//	if(window.navigator.userAgent.indexOf(" Firefox/") !== -1)
		{

			WHO.extension.isFirefox = true;

			// if this is Popup or Preferences
			if(chrome.extension.getBackgroundPage)
			{

				WHO.extension.isExtensionPage = true;

			}

		}

	}
	else
	if(this.safari)
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
	//Chrome,OPR,Vivaldi and Firefox42+

	if(WHO.extension.isWebExtension)
	{

	//	console.log("isWebExtension");

		//------------------------------------------------------------------------------------//
		/* Extension のリソース URL を取得 */

		WHO.extension.getURL = function(filename)
		{
			return chrome.extension.getURL(filename)
		};

		/**************************************************************************************/
		/* Popup, Options */

		if(WHO.extension.isExtensionPage)
		{

		//	console.log("isExtensionPage");

			//------------------------------------------------------------------------------------//

			/* ページリフレッシュ */

			WHO.extension.refreshOptions = function()
			{
				window.location.reload();
			};

			WHO.extension.refreshPopup = function()
			{
				window.location.reload();
			};

			//------------------------------------------------------------------------------------//
			/* Background への参照 */

			WHO.extension.getBackground = function()
			{
				return chrome.extension.getBackgroundPage();
			};

			/*******************************************************************************/
			/* Storage */

		//	if(WHO.extension.isBlink)
		//	{
				WHO.extension.storage = window.localStorage;
		//	}
		// Fixed::Bug::Firefox::0011::1208874 - localStorage in background script seems to be temporary = Extension's URL is reset every restart.
		//	else
		//	{
        //
		//		WHO.extension._storage = window.localStorage;
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
		//				return WHO.extension._storage.getItem(key);
		//			},
		//		};
		//	}

			//------------------------------------------------------------------------------------//
			/* 設定ページの初期化 */
			//Options

			WHO.extension.initializeOptions = function()
			{

				/* ツールバーボタンの表示切り替え設定 */
				document.addEventListener('DOMContentLoaded',function(e)
				{

					if(chrome.runtime.getManifest().browser_action)
					{

						var container = document.getElementById('BottonConfigContainer');
						if(container)
						{
							container.parentNode.removeChild(container);
						}

					}
					else
					{

						var buttonConfig = JSON.parse(WHO.extension.storage.getItem('buttonConfig'))||{view:true};
						var button = document.getElementById('ButtonView');
						if(button)
						{
							button.checked = buttonConfig.view;
							button.addEventListener('change',function(e)
							{
								WHO.extension.sendRequest("ButtonConfig",{method:"set",view:button.checked});
							},false);
						}

					}

					window.location.hash = window.location.hash;

				},false);

			};

			//------------------------------------------------------------------------------------//
			/* タブ作成 */

			WHO.extension.openTab = function(para)
			{

				chrome.tabs.create({url:para.url})

			};

			/**************************************************************************************/

		}

		/**************************************************************************************/
		/* Messaging */

		//------------------------------------------------------------------------------------//
		/* バックグラウンドと接続する */

		WHO.extension._port = chrome.runtime.connect({name:"connect"});

		/* メッセージ送信 */

		WHO.extension.postMessage = function(type,message)
		{

			WHO.extension._port.postMessage({type:type,message:message});

		};

		/* メッセージ取得を追加 */

		WHO.extension.addMessageListener = function(type,listener)
		{
			listener.messageListener = listener.messageListener||{};
			if(listener.messageListener[type])
			{
				return;
			}
			listener.messageListener[type] = function(data)
			{
				if(data.type === type)
				{
					listener(data.message);
				}
			}
			WHO.extension._port.onMessage.addListener(listener.messageListener[type]);
			chrome.runtime.onMessage.addListener(listener.messageListener[type]);//broadcastMessage
		};

		/* メッセージ取得を削除 */

		WHO.extension.removeMessageListener = function(type,listener)
		{
			listener.messageListener = listener.messageListener||{};
			WHO.extension._port.onMessage.removeListener(listener.messageListener[type]);
			chrome.runtime.onMessage.removeListener(listener.messageListener[type]);//broadcastMessage
			delete listener.messageListener[type];
		};

		//------------------------------------------------------------------------------------//

		/* リクエスト送信 */

		if(WHO.extension.isBlink || WHO.extension.isEdge)
		{

			WHO.extension.sendRequest = function(type,message,callback)
			{
				if(callback)
				{
					chrome.runtime.sendMessage({type:type,message:message},callback);
				}
				else
				{
					chrome.runtime.sendMessage({type:type,message:message});
				}
			};

			//------------------------------------------------------------------------------------//

			/* エクステンション連携 */

			// type     : エクステンション名
			// message  : 送信メッセージデータ
			// callback : メッセージ返信受信時のコールバック メッセージデータを引数として受け取る

			WHO.extension.sendRequestExternal = function(id,type,message,callback)
			{

				if(callback)
				{
					chrome.runtime.sendMessage(id,{type:type,id:id,message:message},
					function(data)
					{
					//	if(!data)
					//	{
					//		var extensionID = WHO.extension._extensionID.development[type];
					//		chrome.runtime.sendMessage(extensionID,{type:type,id:extensionID,message:message},callback);
					//	}
					//	else
					//	{
							callback(data);
					//	}
					});
				}
				else
				{
					chrome.runtime.sendMessage(id,{type:type,id:id,message:message});
				}
			};

		}
		else
		//if(WHO.extension.isFirefox)
		{

			// Bug::Firefox::0009 : chrome.runtime.onMessage responseCallback is not work. responseCallback should not be in "if","function" block.
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

			};

			// Fixed::Bug::Firefox::0008 : chrome.runtime.onConnectExternal/chrome.runtime.onMessageExternal is not implemented.

			WHO.extension.sendRequestExternal = function(id,type,message,callback)
			{

				var _port = chrome.runtime.connect(id,{name:id});

				if(callback)
				{

					var _listener = function(data)
					{
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
							callback();
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

			};
		}

		//------------------------------------------------------------------------------------//

		/* リクエスト受信 */

		WHO.extension.addRequestListener = function(type,listener)
		{
			chrome.runtime.onMessage.addListener(function(data,source,messageCallback)
			{
				if(data.type === type)
				{
					var sender =
					{
						source         :source,
						messageCallback:messageCallback,
					};
					listener(sender,data.message);
				}
			});
		};

	}
	// WebExtension
	/********************************************************************************************/
