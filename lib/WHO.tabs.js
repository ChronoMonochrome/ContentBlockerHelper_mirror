// This file is used in "LinkRedirector" also. You can skip review if this is not "LinkRedirector".
/****************************************************************************************************/
/* Tabs API                                                                                         */
/*

	Manages tabs

	WHO.tabs

		Methods

			isExist    : boolean WHO.tab.isExist(integer tabid)

			isSelected : boolean WHO.tabs.isSelected(object WHO.tab)

			getSelected : tab WHO.tab.getSelected()

			create : tab WHO.tabs.create(object tabParameters,function callback)
				Create a new tab.

			addEventListener : undefined WHO.tabs.addEventListener(string EventType,function EventListener)
			removeEventListener : undefined WHO.tabs.removeEventListener(string EventType,function EventListener)

	WHO.tab

		Methods

			remove  : undefined tab.remove()
			reload  : undefined tab.reload()
			replace : undefined tab.replace(string URL)

		Properties

			title
			url
			favicon
			selected : boolean
			window : extensionWindow

	EventTypes

		create     : 
		removed    : 
		update     : 
		activate   : 
		deactivate : 
                                                                                                    */
/****************************************************************************************************/

// requrire("WHO.extension.js");

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

		WHO.tabs =
		{

			_eventListener :
			{
				create    : {},
				drop      : {},
				update    : {},
				activate  : {},
				deactivate: {},
			},
			_eventListenerId : 0,

			_selected   : null,
			_selectedId : null,//Firefox のバグ対策
		//	_tabs       : {},  //drop 時の tab 取得

			//------------------------------------------------------------------------------------//
			/* タブがアクティブなタブかどうか */

		//	isExist : function(tabId)
		//	{
		//		return this._tabs && this._tabs[tabId];
		//	},

			//------------------------------------------------------------------------------------//
			/* タブがアクティブなタブかどうか */

			isSelected : function(tab)
			{
				return this._selected && tab && tab._tab && this._selected.id === tab._tab.id;
			},

			//------------------------------------------------------------------------------------//
			/* アクティブなタブを取得 */

			getSelected : function()
			{
				return new WHO.extension._tab(WHO.tabs._selected);
			},

			//------------------------------------------------------------------------------------//
			/* タブを開く */

			create : function(para,callback)
			{

				chrome.tabs.create({url:para.url},(function(callback){return function(_tab)
				{

					callback(new WHO.extension._tab(_tab));

				}})(callback||function(_tab){}));

			},

			//------------------------------------------------------------------------------------//

			addEventListener : function(type,listener)
			{

				listener.tabEventListener = listener.tabEventListener||{};

				if(listener.tabEventListener[type])
				{
					return;
				}

				var listenerId = ++WHO.tabs._eventListenerId;

				WHO.tabs._eventListener[type][listenerId] = listener;

				listener.tabEventListener[type] = listenerId

			},
			removeEventListener : function(type,listener)
			{

				listener.tabEventListener = listener.tabEventListener||{};

				var listenerId = listener.tabEventListener[type];

				delete WHO.tabs._eventListener[type][listenerId];

				delete listener.tabEventListener[type];

			},

			//------------------------------------------------------------------------------------//

		};

		/* 起動時のタブの状態を設定 */

		chrome.tabs.query({},function(_tabs)
		{

			for(var i = 0,_tab;_tab = _tabs[i];++i)
			{

			//	WHO.tabs._tabs[_tab.id] = true;

				/* 起動時にアクティブなタブを設定 */

				if(_tab.highlighted)
				{

					WHO.tabs._selected = _tab;//WHO.tabs._tabs[tab.id];

				}

			}

		});

		/* タブ作成時 */

		chrome.tabs.onCreated.addListener(function(_tab)
		{

		//	console.log("tab is created");

		//	WHO.tabs._tabs[_tab.id] = true;

			/* onCreate */

			for(var i in WHO.tabs._eventListener["create"])
			{

				WHO.tabs._eventListener["create"][i]({type:"create",tab:new WHO.extension._tab(_tab)});

			}

		});

		/* タブ削除時 */

		chrome.tabs.onRemoved.addListener(function(tabId,removeInfo)
		{

		//	console.log("tab is dropped");

			/* onDrop */

			var _tab =
			{
				id         : tabId,
				title      : null,
				url        : null,
				favIconUrl : null,
				windowId   :removeInfo.windowId,
			};

			for(var i in WHO.tabs._eventListener["drop"])
			{

			//	WHO.tabs._eventListener["drop"][i]({type:"drop",tab:new WHO.extension._tab(WHO.tabs._tabs[tabId])});
				WHO.tabs._eventListener["drop"][i]({type:"drop",tab:new WHO.extension._tab(_tab)});

			}

		//	delete WHO.tabs._tabs[tabId];

		});

		/* タブ更新時 */

		chrome.tabs.onUpdated.addListener(function(tabId,changeInfo,_tab)
		{
			//changeInfo.status
			//	loading   : 読み込み開始
			//	complete  : 読み込み完了
			//	undefined : ファビコン

		//	console.log("Tab updated",changeInfo,_tab);

		//	if(changeInfo.status === "loading")//ポートが未生成
		//	if(changeInfo.status === "complete")//読み込み完了時
		//	{

			//	WHO.tabs._tabs[_tab.id] = _tab;

				var status;

				// Firefox ではページ遷移時の tab.url が前のページのままというバグ
				if(WHO.extension.isFirefox)
				{
					if(changeInfo.status === "loading" && changeInfo.url)
					{
						status = "loading";
					}
					else
					if(_tab.title && changeInfo.status === "complete")
					{
						status = "complete";
					}
					else
					{
						status = undefined;
					}
				}
				else
				{
					status = changeInfo.status;
				}

				/* onUpdate */
				for(var i in WHO.tabs._eventListener["update"])
				{

					WHO.tabs._eventListener["update"][i](
					{
						type  :"update",
						tab   :new WHO.extension._tab(_tab),
						status:status//loading,complete
					});

				}

				if(_tab.highlighted)
				{

					WHO.tabs._selected = _tab;

				}
		//	}

		});

		/* タブ選択時 */

		chrome.tabs.onActivated.addListener(function(info)
		{

		//	console.log("onActivated",info);

			if(WHO.tabs._selectedId === info.tabId) return;//Firefox のイベントのバグ対策

			/* onDeactivate */
			// 前に選択されたタブがある時
			if(WHO.tabs._selected)
			{

				for(var i in WHO.tabs._eventListener["deactivate"])
				{

					WHO.tabs._eventListener["deactivate"][i]({type:"deactivate",tab:new WHO.extension._tab(WHO.tabs._selected)});

				}

			}

			/* onActivate */

			WHO.tabs._selectedId = info.tabId;//Firefox のイベントのバグ対策

			chrome.tabs.get(info.tabId,function(_tab)
			{

				for(var i in WHO.tabs._eventListener["activate"])
				{

					WHO.tabs._eventListener["activate"][i]({type:"activate",tab:new WHO.extension._tab(_tab)});

				}

				WHO.tabs._selected = _tab;//新しく選択されたタブ

			});

		});

		/* ウィンドウ移動時 */

		chrome.windows.onFocusChanged.addListener(function(windowId)
		{

			if(windowId > -1)// Chrome の popup でコンテキストを開いた時に -1 という存在しないウィンドウにフォーカス？
			{

			//	console.log("onFocusChanged : " + windowId);

				/* onDeactivate */
				// 前に選択されたタブがある時
				if(WHO.tabs._selected)
				{

					for(var i in WHO.tabs._eventListener["deactivate"])
					{

						WHO.tabs._eventListener["deactivate"][i]({type:"deactivate",tab:new WHO.extension._tab(WHO.tabs._selected)});

					}

				}

				chrome.tabs.query({windowId:windowId,active:true/*highlighted:true*/},function(_tabs)//highlighted は OPR でエラー
				{
					/* onActivate */

					if(_tabs.length > 0)
					{

						for(var i in WHO.tabs._eventListener["activate"])
						{

							WHO.tabs._eventListener["activate"][i]({type:"activate",tab:new WHO.extension._tab(_tabs[0])});

						}

						WHO.tabs._selected = _tabs[0];//新しく選択されたタブ

					}

				});

			}

		});


	}

	/********************************************************************************************/

	/*  #####  #     # #####   #####  #     # ######  */
	/* #     # #     # #    # #     # ##   ## #       */
	/* #       #     # #    # #     # # # # # #       */
	/* #       ####### #    # #     # #  #  # #####   */
	/* #       #     # #####  #     # #     # #       */
	/* #     # #     # #  #   #     # #     # #       */
	/*  #####  #     # #   ##  #####  #     # ######  */

	/********************************************************************************************/

	/*  #####    ###   ######   ###   #####  ### */
	/* #     #  #   #  #       #   #  #    #  #  */
	/* #       #     # #      #     # #    #  #  */
	/*  #####  ####### #####  ####### #    #  #  */
	/*       # #     # #      #     # #####   #  */
	/* #     # #     # #      #     # #  #    #  */
	/*  #####  #     # #      #     # #   ## ### */

	/********************************************************************************************/

	/* ###### ### #####  ###### ######  #####  #     # */
	/* #       #  #    # #      #      #     #  #   #  */
	/* #       #  #    # #      #      #     #   # #   */
	/* #####   #  #    # #####  #####  #     #    #    */
	/* #       #  #####  #      #      #     #   # #   */
	/* #       #  #  #   #      #      #     #  #   #  */
	/* #      ### #   ## ###### #       #####  #     # */

	/********************************************************************************************/

	/*    ### ###### ###### #####    ###    #####  #    ## */
	/*      # #        #    #    #  #   #  #     # #   #   */
	/*      # #        #    #    # #     # #       #  #    */
	/*      # #####    #    #    # ####### #       # #     */
	/*      # #        #    #####  #     # #       ## #    */
	/* #    # #        #    #      #     # #     # #   #   */
	/*  ####  ######   #    #      #     #  #####  #    ## */
