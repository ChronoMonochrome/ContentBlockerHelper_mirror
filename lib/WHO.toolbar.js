// This file is used in "LinkRedirector" also. You can skip review if this is not "LinkRedirector".
/****************************************************************************************************/
/* Toolbar widget API                                                                               */
/*

// This file provides the Toolbar widget API.
// Must be included before TAB API

	WHO.toolbar

		Methods

			show       : undefined WHO.toolbar.show()
			hide       : undefined WHO.toolbar.hide()

			enable     : undefined WHO.toolbar.enable()
			disable    : undefined WHO.toolbar.disable()

			update     : undefined WHO.toolbar.update()
			clear      : undefined WHO.toolbar.clear()

			setTitle   : undefined WHO.toolbar.setTitle(string title)
			setIcon    : undefined WHO.toolbar.setIcon(path icon)
			setPanel   : undefined WHO.toolbar.setPanel(path panel)
			setBadge   : undefined WHO.toolbar.setBadge(string badgetext)

			addEventListener    : undefined WHO.toolbar.addEventListener(string EventType,function EventListener)
			removeEventListener : undefined WHO.toolbar.removeEventListener(string EventType,function EventListener)

		Properties

			icon        :
			badge       :
			{
				text       :
				background :
				display    :
			}
			popup       : WHO.port

	EventTypes

		click      :
                                                                                                    */
/****************************************************************************************************/

var WHO = WHO || {};

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

		WHO.toolbar =
		{

			_action : null,
			_actionType :"",

			_eventListener :
			{
				click     : {},
			},
			_eventListenerId : 0,

			_shown       : false,
			_disabled    : false,
			_targetTabId : null,
			_setPerTabs  : false,

			icon : "",
			title: "",
			badge:{},

			//------------------------------------------------------------------------------------//
			/* 設定 */

			setPerTabs : function()
			{

				this._setPerTabs = true;

				chrome.windows.getAll(function(_wins)
				{
					for(var i = 0,win;win = _wins[i];i++)
					{
						chrome.tabs.query({windowId:win.id},function(_tabs)
						{
							for(var j = 0,tab;tab = _tabs[j];j++)
							{
								WHO.toolbar._action.disable(tab.id);
							}
						});
					}
				});

				chrome.tabs.onCreated.addListener(function(_tab)
				{
					if(_tab.id > -1)
					{
						WHO.toolbar._action.disable(_tab.id);
					}
				});

				chrome.tabs.onUpdated.addListener(function(tabId,changeInfo,_tab)
				{
					if(changeInfo.status === "loading")
					{
						WHO.toolbar._action.disable(tabId);
					}
				});

			},

			show  : function()
			{

				this._shown = true;

			},

			hide : function()
			{

				this._shown = false;

			},

			enable  : function()
			{

				this._disabled = false;

			},

			disable : function()
			{

				this._disabled = true;

			},

			update : function(para)
			{

				para = para||{};

				this.setTitle(para.title);
				this.setIcon(para.icon);
				this.setBadge(para.badge);

				var targetTabId = this._targetTabId;//pageAction では必須
				if(WHO.active && WHO.active.port && WHO.active.port.tab)
				{
					targetTabId = WHO.active.port.tab.id;
				}

				if((this._setPerTabs || this._actionType === "page") && !targetTabId)
				{
					return;
				}

				if(!this._shown)
				{
					if(this._actionType === "page")
					{
						this._action.hide(targetTabId);
					}
				}
				else
			//	if(this._targetTabId)
				{

					if(this._setPerTabs || this._actionType === "page")
					{
						this._action.setTitle({title:this.title,tabId:targetTabId});
						this._action.setIcon({path:this.icon,tabId:targetTabId});

						//ポップアップ
						if(WHO.popup && WHO.popup._page)
						{
							this._action.setPopup({popup : WHO.popup._page,tabId : targetTabId});
						}
					}
					else
					{
						this._action.setTitle({title:this.title});
						this._action.setIcon({path:this.icon});

						//ポップアップ
						if(WHO.popup && WHO.popup._page)
						{
							this._action.setPopup({popup:WHO.popup._page});
						}
					}

					//browserAction のみ
					if(this.badge && this._actionType === "browser")
					{
						if(this.badge.display === "none")
						{
							if(this._setPerTabs)
							{
								this._action.setBadgeText({text:"",tabId:targetTabId});
							}
							else
							{
								this._action.setBadgeText({text:""});
							}
						}
						else
						if(this.badge.text)
						{
							if(this._setPerTabs)
							{
								this._action.setBadgeText({text:this.badge.text,tabId:targetTabId});
							}
							else
							{
								this._action.setBadgeText({text:this.badge.text});
							}
						}
						if(this.badge.backgroundColor)
						{
							if(this._setPerTabs)
							{
								this._action.setBadgeBackgroundColor({color:this.badge.backgroundColor,tabId:targetTabId});
							}
							else
							{
								this._action.setBadgeBackgroundColor({color:this.badge.backgroundColor});
							}
						}
					}

					if(!this._disabled)
					{
						//pageAction のみ
						if(this._actionType === "page"/* && WHO.tabs.isExist(targetTabId)*/)
						{
							this._action.show(targetTabId);
						}
						//browserAction
						else
						{
							if(this._setPerTabs/* && WHO.tabs.isExist(targetTabId)*/)
							{
								this._action.enable(targetTabId);
							}
							else
							{
								this._action.enable();
							}
						}
					}

				}

			},

			clear : function()
			{

				this._action.hide(this._targetTabId);

			},

			setTitle : function(title)
			{

				if(title)
				{
					this.title = title;
				}

			},

			setIcon : function(icon)
			{

				if(icon)
				{
					this.icon = icon;
				}

			},

			setBadge : function(badge)
			{

				if(badge)
				{

					this.badge.text    = badge.text    || this.badge.text;
					this.badge.display = badge.display || this.badge.display;

					if(badge.backgroundColor)
					{

						var bg   = badge.backgroundColor;
						var rgba = [];
						//#fff
						if(/^#[0-9a-f]{3}$/i.test(bg))
						{
							bg = bg.replace(/([0-9a-f])/ig,"$1$1");
						}
						//#ffffff
						if(/#[0-9a-f]{6}/i.test(bg))
						{
							rgba = bg.match(/([0-9a-f]{2})/ig);
							for(var i = 0;i < 3;i++)
							{
								rgba[i] = parseInt(rgba[i],16);
							}
							rgba[3] = 255;
						}
						//rgba(255,255,255,255)
						else
						{
							rgba = bg.match(/rgba\((\d+),(\d+),(\d+),(\d+)\)/i);
							rgba.shift();
						}

						this.badge.backgroundColor = rgba;

					}
				}

			},

			//------------------------------------------------------------------------------------//

			addEventListener : function(type,listener)
			{

				listener.buttonEventListener = listener.buttonEventListener||{};

				if(listener.buttonEventListener[type])
				{
					return;
				}

				var listenerId = ++WHO.toolbar._eventListenerId;

				WHO.toolbar._eventListener[type][listenerId] = listener;

				listener.buttonEventListener[type] = listenerId

			},
			removeEventListener : function(type,listener)
			{

				listener.buttonEventListener = listener.buttonEventListener||{};

				var listenerId = listener.buttonEventListener[type];

				delete WHO.toolbar._eventListener[type][listenerId];

				delete listener.buttonEventListener[type];

			},

			//------------------------------------------------------------------------------------//

		};

		var manifest = chrome.runtime.getManifest();

		if(manifest.page_action)
		{
			WHO.toolbar._action = chrome.pageAction;
			WHO.toolbar._actionType = "page";

			WHO.toolbar.icon    = manifest.page_action.default_icon;
			WHO.toolbar.title   = manifest.page_action.default_title;

			WHO.toolbar.badge   = null;

		}
		else
		if(manifest.browser_action)
		{

			WHO.toolbar._action = chrome.browserAction;
			WHO.toolbar._actionType = "browser";

			WHO.toolbar.title   = manifest.browser_action.default_title;
			WHO.toolbar.icon    = manifest.browser_action.default_icon;

		}

		// Firefox のイベント実装のバグ
		chrome.tabs.onActivated.addListener(function(info)
		{

			WHO.toolbar._targetTabId = info.tabId;

		});

	//	WHO.toolbar._action.onClicked.addListener(function(_tab)
	//	{
    //
	//		var tab = new WHO.extension._tab(_tab);
    //
	//		for(var i in WHO.panel._eventListener["click"])
	//		{
    //
	//			WHO.toolbar._eventListener["click"][i]({type:"click",tab:tab});
    //
	//		}
    //
	//	});

	}

	/********************************************************************************************/

	/*    ### ###### ###### #####    ###    #####  #    ## */
	/*      # #        #    #    #  #   #  #     # #   #   */
	/*      # #        #    #    # #     # #       #  #    */
	/*      # #####    #    #    # ####### #       # #     */
	/*      # #        #    #####  #     # #       ## #    */
	/* #    # #        #    #      #     # #     # #   #   */
	/*  ####  ######   #    #      #     #  #####  #    ## */

	if(WHO.extension.isJetpack)
	{

		WHO.toolbar =
		{

			_shown      : false,
			_disabled   : false,
			_tabSetting : {},

			icon : "",
			title: "",
			badge:{},

			show : function()
			{

				this._shown = true;
				self.port.emit('__Toolbar__',{method:"create",para:{}});

			},
			hide : function()
			{

				this._shown = false;
				self.port.emit('__Toolbar__',{method:"destroy"});

			},

			enable : function()
			{

				this._disabled = false;
				self.port.emit('__Toolbar__',{method:"enable"});

			},
			disable : function()
			{

				this._disabled = true;
				self.port.emit('__Toolbar__',{method:"disable"});

			},
			update : function(para)
			{
				self.port.emit('__Toolbar__',{method:"update",button:para});
			},
			clear : function(para)
			{
			},
			setTitle : function(title)
			{

				if(title)
				{
					this.title = title;
				}

			},
			setIcon : function(icon)
			{

				if(icon)
				{
					this.icon = icon;
				}

			},
			setBadge : function(badge)
			{

				this.badge.display        = para.display         || this.badge.display;
				this.badge.backgroundColor= para.backgroundColor || this.badge.backgroundColor;
				this.badge.color          = para.color           || this.badge.color;
				this.badge.text           = para.text            || this.badge.text;

			},
			

		};

		self.port.on('__Toolbar__',function(data)
		{
			if(data.method === "setDefault")
			{
				WHO.toolbar.default = data.toolbar;
			}
		});

	}

	/**************************************************************************************/
