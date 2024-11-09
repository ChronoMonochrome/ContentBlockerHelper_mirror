// This file is used in "LinkRedirector" also. You can skip review if this is not "LinkRedirector".
// Common file of QuaBEx Extensions

// This file manages User Interfaces of Extensions.

/****************************************************************************************************/
/* Extension UI 生成 ライブラリ                                                                     */
/*      Copyright (c) 2012 by FAR/RAKUDA All Rights Reserved                                        */
/*      Original Namespace : LinkRedirector                                                         */
/****************************************************************************************************/

// requrire("WHO.URL.js");

var WHO = WHO || {};

	/**************************************************************************************/

	WHO.active = 
	{

		initialize : function(para)
		{
			var active = this;

			WHO.extension.storage.setItem('extensionName',para.extensionName);

			this.extensionName = para.extensionName;

			//------------------------------------------------------------------------------------//
			/* サイト別設定の適用範囲 */

			switch(para.originType)
			{
				// full protocol://domain:port/pathname?query 
				case "full" :
					this.originFunc = WHO.URL.getFullpath.bind(WHO.URL);
					break;

				// page protocol://hostname:port/pathname ページレベルで区別
				case "page" :
					this.originFunc = WHO.URL.getPage.bind(WHO.URL);
					break;

				// port protocol://hostname:port/ ポート番号レベルで区別
				case "port" :
					this.originFunc = WHO.URL.getPort.bind(WHO.URL);
					break;

				// protocol protocol://hostname プロトコルレベルで区別
				case "site" :
				case "protocol" :
					this.originFunc = WHO.URL.getSite.bind(WHO.URL);
					break;

				// host hostname:port ホストレベルで区別
				case "host" :
					this.originFunc = WHO.URL.getHost.bind(WHO.URL);
					break;

				// hostname hostname サブドメインレベルで区別
				case "hostname" :
					this.originFunc = WHO.URL.getHostname.bind(WHO.URL);
					break;

				// domain domain ドメイン名のみで区別
			//	case "domain" :
				default :
					this.originFunc = WHO.URL.getDomain.bind(WHO.URL);
					break;
			}

			//------------------------------------------------------------------------------------//

			/* アクティブページ */

			this.port = null;
		//	{
		//		source      : null,
		//		tab         : null,
		//		url         : "",
		//		origin      : "",
		//		status      : {},
		//	//	postMessage : function(){console.log("")}
		//	};

			//アクティブページが切りかわった時のコールバック
			this.onactivate     = para.onactivate   || function(message){};
			this.ondeactivate   = para.ondeactivate || function(){};
			this.activatePortOnFocusTab = para.activatePortOnFocusTab || false;
			this.activeIsLock   = false;

			//------------------------------------------------------------------------------------//

			/* ボタンの表示切り替え */

			this.toggleButton();//起動時

			//オプションから

			WHO.extension.addRequestListener('ButtonConfig',function(sender,message)
			{
				if(message.method === "set")
				{
					WHO.extension.storage.setItem('buttonConfig',JSON.stringify(
					{
						view:message.view,
						menu:message.menu
					}));
					active.toggleButton();
				}
				else
				if(message.method === "toggle")
				{
					var buttonConfig = JSON.parse(WHO.extension.storage.getItem('buttonConfig'))||{view:true};
					WHO.extension.storage.setItem('buttonConfig',JSON.stringify({view:!buttonConfig.view}));
					active.toggleButton();
				}
			});

			//------------------------------------------------------------------------------------//

			/* ポップアップにアクティブページの情報を送る */

			WHO.extension.addRequestListener('ActivePort',function(sender,message)
			{
				if(message.method === "get")
				{
					if(active.port)
					{
						sender.messageCallback({method:"set",port:
						{
							url   :active.port.url,
							origin:active.port.origin,
							status:active.port.status
						}});
					}
				}
			});

			//------------------------------------------------------------------------------------//

			/* タブ移動やページ移動時の初期化処理 */

			/* ページにフォーカスした時 */
			//現在のフォーカスページを登録

			WHO.extension.addMessageListener('ActivePort',function(port,message)
			{

				if(message.method === "load")
				{

					if(port.tab && port.tab.selected)
					{

					//	console.log("Activate by page : " + port.url);

						active.activatePort(port,message);

					}

				}
				else
				if(message.method === "focus")
				{

				//	console.log("Activate by focus : " + port.url);

					active.activatePort(port,message);


				}
				else
				if(message.method === "blur")
				{

					if(active.port && active.port.source === port.source && (!port.tab || !port.tab.selected))//Chrome では port から現在の selected を取得できない
					{

					//	console.log("Deactivate by blur : " + port.url);
						active.deactivatePort();

					}

				}

			});

			if(WHO.extension.isWebExtension)
			{

				WHO.extension.addRequestListener('ActivePort',function(sender,message)
				{

					if(message.method === "blur")
					{

						if(active.port && sender.tab && sender.tab.port && active.port.source === sender.tab.port.source && !sender.tab.selected)
						{

						//	console.log("Deactivate by blur : " + sender.url);

							active.deactivatePort();

						}

					}

				});

			}

			/* タブイベントによるフォーカスページの切り替え */

			if(WHO.tabs)
			{

				var urltest = /^https?:\/\//i;//タブがウェブページの時だけ

				/* タブを作ったとき */

				WHO.tabs.addEventListener('create',function(e)
				{

					if(WHO.tabs.isSelected(e.tab))
					{

						if(e.tab.port)
						{

						//	console.log("Activate by create : " + e.tab.url);

							active.activatePort(e.tab.port,{});

						}
						else
						if(active.activatePortOnFocusTab && urltest.test(e.tab.url))
						{

						//	console.log("Activate by create : " + e.tab.url);

							active.activatePort(
							{
								source     :null,
								tab        :e.tab,
								url        :e.tab.url,
								postMessage:null,
							},{});

						}

					}

				});

				/* タブを更新したとき */

				WHO.tabs.addEventListener('update',function(e)
				{

					if(WHO.tabs.isSelected(e.tab))
					{

						//選択されたタブがページじゃなくなった時
						if(active.port &&
							(
								!e.tab.url ||
								!urltest.test(e.tab.url) ||
								(!active.activatePortOnFocusTab && !e.tab.port)
							)
						)
						{

						//	console.log("Dactivate by update: " + e.tab.url);

							active.unlockActivePort();
							active.deactivatePort();

						}

						// ポートがあるとき
						if(e.tab.port)
						{

						//	console.log("Activate by update : " , e.tab.url);

							active.activatePort(e.tab.port,{});

						}
						else
						// タブがウェブページの時
						if(active.activatePortOnFocusTab && urltest.test(e.tab.url))
						{

						//	console.log("Activate by update: " + e.tab.url);

							active.activatePort(
							{
								source     :null,
								tab        :e.tab,
								url        :e.tab.url,
								postMessage:null,
							},{});

						}

					}

				});

				/* タブをアクティブにしたとき */

				WHO.tabs.addEventListener('activate',function(e)
				{

					// activatePortOnFocusTab : port の有無にかかわらず有効にする
					if(e.tab.port)//Content Script が無いときは無効
					{

					//	console.log("Activate tab : " + e.tab.url);

						active.activatePort(e.tab.port,{});

					}
					else
					if(active.activatePortOnFocusTab && urltest.test(e.tab.url))
					{

					//	console.log("Activate tab : " + e.tab.url);

						active.activatePort(
						{
							source     :null,
							tab        :e.tab,
							url        :e.tab.url,
							postMessage:null,
						},{});

					}

				});

				/* タブを非アクティブにしたとき */

				WHO.tabs.addEventListener('deactivate',function(e)
				{

					if(active.port &&
						(
							(e.tab.port && active.port.source === e.tab.port.source) ||
							(active.port.tab && active.port.tab.id === e.tab.id)
						)
					)
					{

					//	console.log("Deactivate tab : " + e.tab.url);

						active.deactivatePort();

					}

				});

			}

			//バックグランドの準備が出来たことを通知する
			WHO.extension.broadcastMessage('ActivePage',{method:"readyBackground"});

			//------------------------------------------------------------------------------------//

			return this;

		},

		/**************************************************************************************/

		//------------------------------------------------------------------------------------//
		/* ボタン表示を切り替える */

		toggleButton : function()
		{

			var buttonConfig = JSON.parse(WHO.extension.storage.getItem('buttonConfig'))||{view:true};

			if(buttonConfig.view)
			{
				WHO.toolbar.show();
			}
			else
			{
				WHO.toolbar.hide();
			}

		},

		/**************************************************************************************/

		//------------------------------------------------------------------------------------//

		/* 現在のフォーカスを登録 */

		activatePort : function(port,message)
		{

			var origin = this.originFunc(port.url);

		//	console.log(this.port);
		//	console.log(port);
		//	if(this.port&&port)console.log(this.port.source===port.source);

			if(!this.activeIsLock && (!this.port || !port.source || this.port.source !== port.source) && origin)
			{

		//		console.log("Activated : " + port.url,port);

				this.port = port;
			//	{
			//		source      : port.source,
			//		tab         : port.tab,
			//		url         : port.url,
			//		origin      : origin,
			//		status      : {},
			//		postMessage : port.postMessage
			//	};

				this.port.origin = origin;
				this.port.status = {};

				this.onactivate(message);

			}
		},

		/* フォーカスを初期化 */

		deactivatePort : function()
		{

			if(!this.activeIsLock)
			{

			//	console.log("Deactivated");

				this.port = null;

				this.ondeactivate();

			}

		},

		//------------------------------------------------------------------------------------//
		/* 現在のフォーカスをロック */

		lockActivePort : function()
		{

			this.activeIsLock = true;

		},

		/* 現在のフォーカスをアンロック */

		unlockActivePort : function()
		{

			this.activeIsLock = false;

		},

		//------------------------------------------------------------------------------------//

		/* ホスト（オリジン）を取得 */

		getOrigin : function(url)
		{

			return this.originFunc(url);

		},

		//------------------------------------------------------------------------------------//

	};

	/**************************************************************************************/
