// This file is used in "LinkRedirector" also. You can skip review if this is not "LinkRedirector".
/****************************************************************************************************/
/* Popup API                                                                                        */
/*

// This file provides the Popup API.

	WHO.panel

		Methods

			setPage    : undefined WHO.popup.setPage(path page,WHO,tab)
			setSize    : undefined WHO.popup.setSize(object windowSize)

			enable     : undefined WHO.popup.enable(WHO.tab)
			disable    : undefined WHO.popup.disable(WHO.tab)

			addEventListener    : undefined WHO.popup.addEventListener(string EventType,function EventListener)
			removeEventListener : undefined WHO.popup.removeEventListener(string EventType,function EventListener)

		Properties

			port       : WHO.port
			size       : object windowSize
				width  : integer
				height : integer

	EventTypes

		click      :
		activate   : (focus)
		deactivate : (blur)
		update     : 
                                                                                                    */
/****************************************************************************************************/

var WHO = WHO || {};

	/**************************************************************************************/

	/* WHO.panel.port の取得 */

	WHO.extension.addMessageListener('__Popup__',function(port,message)
	{

		if(message.method === "setPort")
		{
			WHO.popup.port     = port;
			WHO.popup.port.url = message.url;
		}

	});

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

		WHO.popup =
		{

			port   : null,

			_action : null,

			_page : "popup.html",
			_size :
			{
				width  : 150,
				height : 150,
			},

			_eventListener :
			{
				click     : {},
				update    : {},
				activate  : {},
				deactivate: {},
			},
			_eventListenerId : 0,

			//------------------------------------------------------------------------------------//
			/* 設定 */

			setPage : function(page)
			{

				if(page)
				{

					this._page = page;

				}


			},

			setSize : function(size)
			{

				WHO.popup._size = size;

			},

			//------------------------------------------------------------------------------------//

			addEventListener : function(type,listener)
			{

				listener.popupEventListener = listener.popupEventListener||{};

				if(listener.popupEventListener[type])
				{
					return;
				}

				var listenerId = ++WHO.popup._eventListenerId;

				WHO.popup._eventListener[type][listenerId] = listener;

				listener.popupEventListener[type] = listenerId

			},
			removeEventListener : function(type,listener)
			{

				listener.popupEventListener = listener.popupEventListener||{};

				var listenerId = listener.popupEventListener[type];

				delete WHO.popup._eventListener[type][listenerId];

				delete listener.popupEventListener[type];

			},

			//------------------------------------------------------------------------------------//

		};

		var manifest = chrome.runtime.getManifest();

		if(manifest.page_action)
		{

			WHO.popup._action = chrome.pageAction;

			WHO.popup._page   = manifest.page_action.default_popup;

		}
		else
		if(manifest.browser_action)
		{

			WHO.popup._action = chrome.browserAction;

			WHO.popup._page   = manifest.browser_action.default_popup;

		}

		/* サイドバーボタンクリック時 */

	//	opr.sidebarAction.onClicked.addListener(function(_tab)
	//	{
    //
	//		var tab = WHO.tabs._getExtensionTab(_tab);
    //
	//		for(var i in WHO.panel._eventListener["click"])
	//		{
    //
	//			WHO.panel._eventListener["click"][i]({type:"click",tab:tab});
    //
	//		}
    //
	//	});

		WHO.extension.addEventListener('disconnect',function(e)
		{
			if(WHO.popup.port && e.source === WHO.popup.port.source)
			{

			//	console.log("Panel is closed");
				WHO.popup.port = null;

			}
		});

		WHO.extension.addRequestListener('__Popup__',function(sender,message)
		{

			if(message.method === "getSize")
			{
				sender.messageCallback({size:WHO.popup._size});
			}

		});

	}

	/**************************************************************************************/
