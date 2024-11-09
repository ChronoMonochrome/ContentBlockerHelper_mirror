var storage = WHO.extension.storage;
var CBH     = WHO.ContentBlockHelper;
var background =
{

	init : function()
	{

		//------------------------------------------------------------------------------------//
		/* 一時停止をリセット */

		storage.setItem('temporary',JSON.stringify({disabled:false}));

		//------------------------------------------------------------------------------------//
		/* CBH オブジェクト */

		CBH.start();

		//------------------------------------------------------------------------------------//
		/* コンテントの言語データ */

		WHO.locale.loadJSONFile("configurations/clientlang.json",function(lang)
		{

			background.clientlang = lang;

		});

		//------------------------------------------------------------------------------------//
		/* Configurations : 設定 */

		WHO.extension.addMessageListener('Config',function(port,message)
		{

			if(message.method === "setPrefs")
			{
				background.config.prefs[message.name] = message.value;
			}

		});

		//------------------------------------------------------------------------------------//
		/* Context menus : コンテキストメニューの設定 */

		WHO.extension.addMessageListener('ContextMenus',function(port,message)
		{

			if(message.method === "setConfig")
			{
				background.contextMenu.setConfig(message.config);
				background.contextMenu.toggle();
			}
			else
			if(message.method === "setUserID")
			{

				background.w5chID = message.userID;

				background.contextMenu.menus.blockIDon5ch.add();
				background.contextMenu.menus.blockIDon5ch.update(
				{
					title : "5ch:NG" + message.userID
				});

			}

		});

		//------------------------------------------------------------------------------------//
		/* UI Protection : UI の保護 */

		WHO.extension.addRequestListener('UIProtection',function(sender,message)
		{

			/* ページが設定を取得 */
			if(message.method === "getPrefs")
			{

				var eventtypes = 
				[
					"selectstart"    ,// テキストの選択
					"contextmenu"    ,// コンテキストメニュー
					"copy"           ,
					"cut"            ,
					"paste"          ,
					"mousedown"      ,
				//	"mouseup"        ,
				//	"click"          ,
				//	"selectionchange",
				];

				var prefs = {};
				var hostname = WHO.URL.getHostname(sender.tab.url);

				var UIProtection = 0;//background.config.prefs.eventblock 仮
				if(typeof background.config.prefs.UIProtection.site[hostname] === "undefined")
				{
					UIProtection = background.config.prefs.UIProtection.default;
				}
				else
				{
					UIProtection = background.config.prefs.UIProtection.site[hostname];
				}

				for(var i = 0,eventtype;eventtype = eventtypes[i];++i)
				{
					prefs[eventtype] = ((UIProtection & (2 ** i)) !== 0);
				}

				// CSS で select を阻害しているのを禁止する

				var rule = WHO.URLFilterAPI.getMatchedRule({type:"top",src:sender.tab.url,tab:sender.tab.url,page:sender.tab.url})||{};

				if(WHO.extension.isWebExtension && prefs.selectstart && (!rule || rule.act !== "ignore"))
				{
					var code = "*{-moz-user-select:text !important;-webkit-user-select:text !important;user-select:text !important;}";
					chrome.tabs.insertCSS(sender.tab.id,
					{
						code      : code,
						allFrames : true,
					});
				}

				// Content-script に設定を返す

				sender.messageCallback(
				{
					rule:rule,
					disabled:background.config.prefs.temporary.disabled,
					prefs:prefs
				});

			}

		});

		//------------------------------------------------------------------------------------//

		WHO.extension.addRequestListener('ContentBlockHelper',function(sender,message)
		{

			//------------------------------------------------------------------------------------//
			/* ページが設定を取得 */
			if(message.method === "getPrefs")
			{

				sender.messageCallback({method:"setPrefs",prefs:CBH.getPrefs(sender.url,sender.tab,background.config.prefs)});

			}
			else
			//------------------------------------------------------------------------------------//
			/* Edit mode : 編集モード */
			//モード切替
			if(message.method === "changeMode")
			{

				background.mode.change(message.mode);

			}
			else
			//スタイル規則を取得
			if(message.method === "getCSSRules")
			{

				sender.messageCallback({CSSRules:storage.getItem('CSSRules')});

			}
			else
			if(message.method === "getClientLang")
			{

				sender.messageCallback({lang:background.clientlang});

			}
			else
			//------------------------------------------------------------------------------------//
			/* 特定のコンテンツがフィルタに合致するかどうか */
			// content-script でリソースのブロックを処理する場合に使用
			// refresh meta の処理
			if(message.method === "testSrc")
			{

				var src  = message.src;
				sender.messageCallback(WHO.URLFilterAPI.getMatchedRule(
				{
					type : src.type,
					src  : src.url,
					tab  : sender.tab.url,
					page : sender.url
				}));

			}
			else
			if(message.method === "getMatchedRule")
			{

				var resource  = message.resource;
				sender.messageCallback(WHO.URLFilterAPI.getMatchedRule(message.resource));

			}
			else
			//------------------------------------------------------------------------------------//
			/* 規則が登録されているかどうか */
			if(message.method === "testRule")
			{

				if(WHO.URLFilterAPI.block.isInRules(message.pattern,message.options,"sub"))
				{

					sender.messageCallback({listed:"sub"});

				}
				else
				if(WHO.URLFilterAPI.block.isInRules(message.pattern,message.options,"cus"))
				{

					sender.messageCallback({listed:"cus"});

				}
				else
				{

					sender.messageCallback({listed:null});

				}

			}
			else
			//------------------------------------------------------------------------------------//
			if(message.method === "getTypemap")
			{

				sender.messageCallback({typemap:CBH.typemap});

			}
			//------------------------------------------------------------------------------------//
		});

		//------------------------------------------------------------------------------------//

		WHO.extension.addMessageListener('ContentBlockHelper',function(port,message)
		{
			//------------------------------------------------------------------------------------//
			/* ページのリソースを取得 */
			if(message.method === "setResources")
			{

				if(WHO.active.port && WHO.active.port.source === port.source)
				{

					WHO.active.port.status.pages         = message.pages;        //タブに含まれるページ
					WHO.active.port.status.resources     = message.resources;    //タブに含まれるリソース

					background.changeIcon(WHO.active.port.origin);

					if(WHO.popup.port)
					{
						background.recheckRules(WHO.active.port.status.resources);
						WHO.popup.port.postMessage('setResources',
						{
							resources:WHO.active.port.status.resources||{},
						});
					}

				}
			}
			else
			//------------------------------------------------------------------------------------//
			/* 簡易フィルタの再読み込み : popup,option */
			if(message.method === "updateSimpleFilter")
			{

				CBH.terminateEasyBlock();
				CBH.applyEasyBlock();
			}

			else
			//------------------------------------------------------------------------------------//
			/* 詳細フィルタの再読み込み : options */
			if(message.method === "updateCustomizations")
			{

				CBH.disableCustomizations();
				CBH.enableCustomizations();

			}
			else
			//------------------------------------------------------------------------------------//
			/* 購読フィルタの再読み込み : options */
			if(message.method === "updateSubscriptions")
			{

				CBH.disableSubscriptions();
				CBH.enableSubscriptions(function()
				{
					port.postMessage('Subscriptions',{method:"updated"});
				});

			}
			else
			//------------------------------------------------------------------------------------//
			/* 選択子フィルタの再読み込み : options */
			if(message.method === "updateCSS")
			{

				CBH.loadUserCSSRules();

			}
			else
			//------------------------------------------------------------------------------------//
			/* データ形式の更新 */
			if(message.method === "UpdateData")
			{

				background.updateData();
				background.updateSubscriptions();

			}
			else
			//------------------------------------------------------------------------------------//
			/* Update resources : ポップアップで規則を変更してページのリソースの状態を更新する */
			// Popup で変更→ページへ
			if(message.method === "updateResourcesState")
			{

				background.updateResourcesState();

			}
			else
			//------------------------------------------------------------------------------------//
			/* 編集モード */
			/* URL 規則の追加と削除 : content,popup */
			if(message.method === "UpdateRule")
			{
				CBH[message.execute](message.pattern,message.options);
				background.updateResourcesState();
			}
			else
			/* CSS 規則の追加 */
			if(message.method === "addCSSRule")
			{
				var origin  = WHO.active.getOrigin(port.url);
				CBH.addCSSRules(origin,message.rule);
			}
			else
			/* CSS 規則の解除 */
			if(message.method === "removeCSSRule")
			{
				CBH.removeCSSRules(port.url,message.rule);
			}
			else
			/* ブロック機能の再開 */
			if(message.method === "resumeBlocking")
			{

				WHO.URLFilterAPI.resume();

			}
			//------------------------------------------------------------------------------------//
		});

		//------------------------------------------------------------------------------------//
		/* ポップアップが開いた時 */

		WHO.extension.addRequestListener('getActiveResources',function(sender,message)
		{
		//	console.log(WHO.active);
		//	console.log(WHO.active.port);
			if(WHO.active.port)
			{
				background.recheckRules(WHO.active.port.status.resources);
				sender.messageCallback(
				{
					tab      :WHO.active.port.tab.url, // タブの URL
					page     :WHO.active.port.url,     // ページの URL
					pages    :WHO.active.port.status.pages||[],
					resources:WHO.active.port.status.resources||{},
					typemap  :CBH.typemap,
				});
			}
		});

		//------------------------------------------------------------------------------------//

		background.updateData();//データを修正
		background.updateSubscriptions();

		/* ブロック開始 */

		/* 簡易フィルタの適用 */

		CBH.applyEasyBlock();

		/* 自作フィルタの適用 */
		CBH.enableCustomizations();

		/* 購読フィルタの適用 */
		CBH.enableSubscriptions(function(){});	//購読ブロック→定期的に

	},
	//------------------------------------------------------------------------------------//
	start   : function()
	{

		/*******************************************************************************/
		/* UI 生成 */

		//------------------------------------------------------------------------------------//

		/* ボタンはタブ毎に生成 */

		if(WHO.extension.isWebExtension)
		{

			WHO.toolbar.setPerTabs();

		}

		/* アクティブページの管理 */

		WHO.active.initialize(
		{
			'extensionName' : "ContentBlockHelper",

			'originType'    : "port",//full,page,port,protocol,domain
			'onactivate'    : function(message)
			{

				WHO.active.port.status.mode          = message.mode;
				WHO.active.port.status.pages         = message.pages;
				WHO.active.port.status.resources     = message.resources;

				if(WHO.active.port.source)
				{

					WHO.active.port.postMessage("ContentBlockHelper",{method:"getFocusedStatus"});//フォーカスタブにフォーカスタブである事を通知する

				}

				background.changeIcon(WHO.active.port.origin);

				background.contextMenu.toggle();

			},
			'ondeactivate' : function(message)
			{

				if(!WHO.extension.isWebExtension)
				{
					WHO.toolbar.update(
					{
						icon:"buttons/disabled.png",
						badge:
						{
							backgroundColor:"#999999",
							color          :"#ffffff",
							text           :"-",
						}
					});
				}
				WHO.contextMenu.hide();

			},
		//	'activatePortOnFocusTab':true
		});

		//ブロックされたタブでもポップアップを出す
		if(WHO.extension.isWebExtension)
		{

			WHO.tabs.addEventListener('update'  ,function(e)
			{
				if(WHO.tabs.isSelected(e.tab))
				{
					background.activateBlockedTab(e.tab);
				}
			});

			WHO.tabs.addEventListener('activate',function(e){background.activateBlockedTab(e.tab);});

		}

		/* ボタンの作成 */

		WHO.toolbar.setTitle(WHO.locale.get("disabled"));
		WHO.toolbar.setBadge(
		{
			backgroundColor:"#999999",
			color          :"#ffffff",
			text           :"-",
		});

		/* ポップアップの作成 */

		WHO.popup.setSize({width:320,height:480});

		/* メニューの作成 */

		this.contextMenu.menus =
		{

			//設定
			preferences : WHO.contextMenu.createItem(
			{
				contexts : ["page", "frame", "selection", "link", "editable", "image", "video", "audio"],
				title    : WHO.locale.get("Preferences"),
				disabled : false,
				onclick  : function(event)
				{
					WHO.tabs.create(
					{
						url    :"options.html#General",
						focused:true,
					});
				}
			}),

			//区切り
			separator2 : WHO.contextMenu.createItem(
			{
				contexts : ["page", "frame", "selection", "link", "editable", "image", "video", "audio"],
				type     :'separator'
			}),

			//すべて無効/無効
			toggleAll : WHO.contextMenu.createItem(
			{
				contexts : ['all'],//['page','frame']
				icon     : 'images/disabled.png',
				title    : WHO.locale.get("Mode::Disable"),
				disabled : false,
				onclick  : function(event)
				{

					if(!background.config.prefs.temporary.disabled)
					{

						background.config.temporaryDisable();

					}
					else
					{

						background.config.clearTemporaryDisable();

					}

					background.changeIcon(WHO.active.port.origin);
				}
			}),

			//このサイトで無効
			toggleOnSite : WHO.contextMenu.createItem(
			{
				contexts : ['all'],//['page','frame']
				icon     : 'images/rules/ignore.png',
				title    : WHO.locale.get("Mode::Disable::Site"),
				disabled : false,
				onclick  : function(event)
				{

					var rule = WHO.URLFilterAPI.getMatchedRule({type:"top",src:WHO.active.port.url,page:"",tab:WHO.active.port.url});

					if(rule && rule.act === "ignore" && rule.status["cus"])
					{

						CBH.removeIgnoreRule(rule.pattern,rule.options)
						WHO.active.port.status.ignored = false;

					}
					else
					{

						var domain = WHO.URL.getHostname(WHO.active.port.origin);
						var pattern = "||"+domain+"^*";

						CBH.addIgnoreRule(pattern,{});
						WHO.active.port.status.ignored = true;

					}

					background.changeIcon(WHO.active.port.origin);

				}
			}),

			//このタブで無効
			disableOnTab : WHO.contextMenu.createItem(
			{
				contexts : ['all'],//['page','frame']
				icon     : 'images/ignoretab.png',
				title    : WHO.locale.get("Mode::Disable::Tab"),
				disabled : false,
				onclick  : function(event)
				{
					WHO.URLFilterAPI.disableOnTab(WHO.active.port.tab);
					WHO.ElementMaskAPI.disableOnTab(WHO.active.port.tab);
				}
			}),

			//区切り
			separator1 : WHO.contextMenu.createItem(
			{
				contexts : ['all'],//['page','frame']
				type     :'separator'
			}),

			//標準モード
			normal : WHO.contextMenu.createItem(
			{
				contexts : ["page", "frame", "selection", "link", "editable", "image", "video", "audio"],
				icon     : 'images/enter.png',
				title    : WHO.locale.get("Mode::normal"),
				disabled : false,
				onclick  : function(event)
				{
					background.mode.change("");
				},
				disabled : false
			}),

			//全てのコンテンツ
			linked : WHO.contextMenu.createItem(
			{
				contexts : ["page", "frame", "selection", "link", "editable", "image", "video", "audio"],
				icon     : 'images/linked.png',
				title    : WHO.locale.get("Mode::linkedcontents"),
				disabled : false,
				onclick  : function(event)
				{
					background.mode.change("linkedcontents");
				}
			}),

			//モジュール
			module : WHO.contextMenu.createItem(
			{
				contexts : ["page", "frame", "selection", "link", "editable", "image", "video", "audio"],
				icon     : 'images/module.png',
				title    : WHO.locale.get("Mode::module"),
				disabled : false,
				onclick  : function(event)
				{
					background.mode.change("module");
				}
			}),

			//スクリプト
			script : WHO.contextMenu.createItem(
			{
				contexts : ["page", "frame", "selection", "link", "editable", "image", "video", "audio"],
				icon     : 'images/script.png',
				title    : WHO.locale.get("Mode::script"),
				disabled : false,
				onclick  : function(event)
				{
					background.mode.change("script");
				}
			}),

			//iframe
			iframe : WHO.contextMenu.createItem(
			{
				contexts : ["page", "frame", "selection", "link", "editable", "image", "video", "audio"],
				icon     : 'images/image.png',
				title    : WHO.locale.get("Mode::iframe"),
				disabled : false,
				onclick  : function(event)
				{
					background.mode.change("iframe");
				}
			}),

			//CSS ブロック
			css : WHO.contextMenu.createItem(
			{
				contexts : ["page", "frame", "selection", "link", "editable", "image", "video", "audio"],
				icon     : 'images/css.png',
				title    : WHO.locale.get("Mode::css"),
				disabled : false,
				onclick  : function(event)
				{
					background.mode.change("css");
				}
			}),

			blockIDon5ch : WHO.contextMenu.createItem(
			{
				contexts : ["page","link"],
				title    : "5ch",
				disabled : false,
				onclick  : function(event)
				{

				//	console.log(background.w5chID);

					var newRule = 'div[data-userid="' + background.w5chID + '"]';//追加するCSS規則

					CBH.addCSSRules("||5ch.net",newRule);//CSS規則を追加

					WHO.active.port.postMessage('ContentBlockHelper',{method:"addedNewRule",rule:newRule});

				}
			}),


		};

		//------------------------------------------------------------------------------------//
		/* スタートアップ */

		WHO.extension.broadcastMessage('ContentBlockHelper',{method:"readyBackground"});

	},
	//------------------------------------------------------------------------------------//

	/* 購読リストを修正 */

	updateSubscriptions : function()
	{

		var exist = JSON.parse(storage.getItem('PublicFilter'))||[];
		var def   = newSubscriptions;
		var dUrls  = def.map(function(dFilter){return dFilter.url});//デフォルトのフィルタのURLのリスト

		// 使わないフィルタを削除
		exist = exist.filter(function(eFilter)
		{
			return eFilter.use||dUrls.indexOf(eFilter.url) > -1;
		});

		var eUrls  = exist.map(function(eFilter){return eFilter.url});//現在ののフィルタのURLのリスト

		// 標準のフィルタを追加
		def.forEach(function(dFilter)
		{
			//現在のリストに無いとき ：追加
			var idx = eUrls.indexOf(dFilter.url);
			if(idx < 0)
			{
				exist.push(dFilter);
			}
			else
			if(typeof exist[idx].lang === "undefined")
			{
				exist[idx].lang = dFilter.lang;
			}

		});

		storage.setItem('PublicFilter',JSON.stringify(exist));

	},

	/* 設定データを修正 */

	updateData : function()
	{

		//------------------------------------------------------------------------------------//

		/* セレクターフィルターの URL パターンを更新する */

		if(parseFloat(storage.getItem('dataVersion')||"0") < 9.0306)
		{

			var reg = /(.)\/?\*$/;//末尾に "/*"を付加する

			var CSSRules = JSON.parse(storage.getItem('CSSRules'))||{};

			var newCSSRules = {};

			Object.keys(CSSRules).forEach(function(pattern)//for(var url in CSSRules)
			{

				var newPattern = pattern.replace(reg,"$1/*");

				newCSSRules[newPattern] = newCSSRules[newPattern]||[];

				for(var i = 0,selector;selector = CSSRules[pattern][i];++i)
				{
					if(newCSSRules[newPattern].indexOf(selector) < 0)
					{
						newCSSRules[newPattern].push(selector);
					}
				}

			});

			storage.setItem('CSSRules',JSON.stringify(newCSSRules));

		}

		/* 簡易フィルタの更新 */
		//1->3,7->15,15->31
		if(parseFloat(storage.getItem('dataVersion')||"0") < 10.0101)
		{

			// 全般
			var easyblock = JSON.parse(storage.getItem('easyblock'))||{};

			Object.keys(easyblock).forEach(function(type)
			{
				var old = easyblock[type];
				easyblock[type] = old === 1 ? 3 : old === 7 ? 15 : old === 15 ? 31 : old;
			});

			storage.setItem('easyblock',JSON.stringify(easyblock));

			// サイト毎
			["script","stylesheet","image","subdocument","refresh"].forEach(function(type)
			{
				var site = JSON.parse(storage.getItem('simpleFilter_' + type))||{};

				Object.keys(site).forEach(function(domain)
				{
					var old = site[domain];
					site[domain] = old === 1 ? 3 : old === 7 ? 15 : old === 15 ? 31 : old;
				});

				storage.setItem('simpleFilter_' + type,JSON.stringify(site));

			});

		}

		if(parseFloat(storage.getItem('dataVersion')||"0") < 10.0300)
		{

			/* 購読フィルタの更新 */
			var PublicFilter = [];
			var Subscriptions = JSON.parse(storage.getItem('Subscriptions'))||[];
			Subscriptions.forEach(function(filter)
			{
				PublicFilter.push(
				{
					url:filter.url,
					use:filter.use,
				});
			},this);
			storage.setItem('PublicFilter',JSON.stringify(PublicFilter));
			storage.removeItem('Subscriptions');

			/* 詳細フィルタの更新 */

			var oldTypeList=
			[
				"other"            ,
				"script"           ,
				"image"            ,
				"stylesheet"       ,
				"object"           ,
				"sub_frame"        ,
				"main_frame"       ,
				"redirect"         ,
				"ping"             ,
				"dummy"            ,
				"popup"            ,
				"xmlhttprequest"   ,
				"object-subrequest",
				"dummy"            ,
				"audio"            ,
				"font"             ,
			];
			var CustomFilter = 
			{
				"ignore":[],
				"block" :[],
				"allow" :[],
			};
			var Customizations = JSON.parse(storage.getItem('Customizations'))||
			{
				"ignore":[],
				"block" :[],
				"allow" :[],
			};
			["ignore","block","allow"].forEach(function(act)
			{
				Customizations[act].forEach(function(rule)
				{
					if(rule.options && rule.options.resources !== undefined)
					{
						rule.options.types = [];
						oldTypeList.forEach(function(type,i)
						{
							if(rule.options.resources & (1 << i))
							{
								rule.options.types.push(type);
							}
						},this);
					}
					CustomFilter[act].push(CBH.getExactRule(act,rule.pattern,rule.options));
				},this);
			},this);
			storage.setItem('CustomFilter',JSON.stringify(CustomFilter));
			storage.removeItem('Customizations');

			/* 簡易フィルタの更新 */

			// 全般
			var SimpleFilter = {};
			var easyblock = JSON.parse(storage.getItem('easyblock'))||{};

			var typechange =
			{
				"subdocument":"sub_frame",
				"refresh"    :"redirect",
			};

			Object.keys(easyblock).forEach(function(type)
			{

				var old = easyblock[type];
				type = typechange[type]||type;
				SimpleFilter[type] = old;

			});

			storage.setItem('SimpleFilter',JSON.stringify(SimpleFilter));
			storage.removeItem('easyblock');
			storage.setItem('SimpleFilter_script',storage.getItem('simpleFilter_script'));
			storage.removeItem('simpleFilter_script');
			storage.setItem('SimpleFilter_stylesheet',storage.getItem('simpleFilter_stylesheet'));
			storage.removeItem('simpleFilter_stylesheet');
			storage.setItem('SimpleFilter_sub_frame',storage.getItem('simpleFilter_subdocument'));
			storage.removeItem('simpleFilter_subdocument');
			storage.setItem('SimpleFilter_image',storage.getItem('simpleFilter_image'));
			storage.removeItem('simpleFilter_image');
			storage.setItem('SimpleFilter_object',storage.getItem('simpleFilter_object'));
			storage.removeItem('simpleFilter_object');
			storage.setItem('SimpleFilter_redirect',storage.getItem('simpleFilter_refresh'));
			storage.removeItem('simpleFilter_refresh');

		}

		//------------------------------------------------------------------------------------//

		storage.setItem('dataVersion',"10.0300");

	},
	//------------------------------------------------------------------------------------//
	/* 設定値                                                                             */
	config  :
	{

		prefs :
		{

			behavior : JSON.parse(storage.getItem('behavior'))||
			{
				alwayssync:false,//同期する
			},
			//簡易ブロック
		//	easyblock : JSON.parse(storage.getItem('easyblock'))||
		//	{
		//		script      : 0,
		//		stylesheet  : 0,
		//		subdocument : 0,
		//		image       : 0,
		//		refresh     : 0,
		//	},
			//イベントブロック
		//	eventblock : JSON.parse(storage.getItem('eventblock'))||
		//	{
		//		contextmenu : false,
		//		selectstart : false,
		//		click       : false,
		//		mousedown   : false,
		//		mouseup     : false,
		//		copy        : false,
		//		cut         : false,
		//	//	keydown     : false,
		//	},
			UIProtection : JSON.parse(storage.getItem('UIProtection'))||
			{
				default : 0,
				site : {},
			},
			temporary :
			{
				disabled : false
			},
			shortcutkey: JSON.parse(storage.getItem('shortcutkey'))||
			{
				button :
				{
					altKey   : true,
					shiftKey : true,
					ctrlKey  : false,
					keyCode  : 66//"b"
				},
				iframe :
				{
					altKey   : true,
					shiftKey : true,
					ctrlKey  : false,
					keyCode  : 73//"i"
				},
				module :
				{
					altKey   : true,
					shiftKey : true,
					ctrlKey  : false,
					keyCode  : 77//"m"
				},
				script :
				{
					altKey   : true,
					shiftKey : true,
					ctrlKey  : false,
					keyCode  : 83//"s"
				},
				css :
				{
					altKey   : true,
					shiftKey : true,
					ctrlKey  : false,
					keyCode  : 67//"c"
				},
				finish :
				{
					altKey   : true,
					shiftKey : true,
					ctrlKey  : false,
					keyCode  : 68//"d"
				},
			},

		},
		//一時無効にする
		temporaryDisable : function()
		{
			background.config.prefs.temporary.disabled = true;
			storage.setItem('temporary',JSON.stringify(background.config.prefs.temporary));

			CBH.disableAll();

			background.contextMenu.menus.toggleAll.update(
			{
				icon     : 'images/rules/block.png',
				title    : WHO.locale.get("Mode::Enable"),
			});
		},
		//再開する
		clearTemporaryDisable : function()
		{
			background.config.prefs.temporary.disabled = false;
			storage.setItem('temporary',JSON.stringify(background.config.prefs.temporary));

			CBH.enableAll();

			background.contextMenu.menus.toggleAll.update(
			{
				icon     : 'images/disabled.png',
				title    : WHO.locale.get("Mode::Disable"),
			});
		},

	},

	//------------------------------------------------------------------------------------//
	/* コンテキストメニュー                                                               */
	//require(WHO.lang)

	contextMenu : 
	{
		// 設定値
		config : JSON.parse(storage.getItem('contextMenusConfig'))||
		{

			show:true,

		},
		menus : {},

		// 設定変更
		setConfig : function(config)
		{
			for(var i in config)
			{
				this.config[i] = config[i];
			}
		},

		// メニューの表示切り替え
		toggle : function()
		{
			if(this.config.show)
			{
				WHO.contextMenu.show();
			}
			else
			{
				WHO.contextMenu.hide();
			}
		},
	},

	//------------------------------------------------------------------------------------//
	/* 編集モードを切り替える */

	mode :
	{

		change : function(mode)
		{
			if(mode)
			{

				if(WHO.active.port)
				{

					//一時的にこのタブでのブロックを中止
					WHO.URLFilterAPI.disableOnTab(WHO.active.port.tab);

					WHO.active.port.postMessage('ContentBlockHelper',
					{
						method   :"enterAppendMode",
						mode     :mode,
						URLRules :WHO.URLFilterAPI.getIncludedRules(WHO.URL.getHostname(WHO.active.port.origin)),
					});

					WHO.active.port.status.mode = mode;

				}

			}

			/* ルール追加モードを解除 */

			else
			{
				//ブロックを再開

				if(WHO.active.port)
				{
					WHO.URLFilterAPI.enableOnTab(WHO.active.port.tab);
					WHO.active.port.postMessage('ContentBlockHelper',{method:"leaveAppendMode"});
					WHO.active.port.status.mode = null;
				}

			}

			background.changeIcon(WHO.active.port.origin);

		}

	},

	//------------------------------------------------------------------------------------//

	/* リソースの現在の適用規則を取得 */

	recheckRules : function(resources)
	{

		Object.keys(resources||{}).forEach(function(idx,i,myArray)//for(var src in resources)
		{

			var resource = resources[idx];

			var appliedRule  = WHO.URLFilterAPI.getMatchedRule({type:resource.type,src:resource.url,tab:WHO.active.port.tab.url,page:resource.page||WHO.active.port.tab.url});

			// OPR ネイティブブロック
			if(resource.loaded === "blocked_by_opr")
			{

				resource.rule =
				{
					status:{"native":true},
				}

			}
			else
			// 適用規則がある時
			if(appliedRule)
			{

				resource.rule = appliedRule;

			}
			else
			// このサイト以外に適用される規則がある時 : excludeDomains
			{

				var excludedRule = WHO.URLFilterAPI.getMatchedRule({type:resource.type,src:resource.url,tab:WHO.active.port.tab.url,page:"http://dummy.dummy/"});

				if(excludedRule && excludedRule.act === "block" && excludedRule.status.cus)
				{

					var host = WHO.URL.getDomain(resource.page||WHO.active.port.tab.url);

					resource.rule        = excludedRule;
					resource.rule.act    = "excluded";
					resource.rule.status = {};
				//	resource.rule.options.includeDomains = resource.rule.options.includeDomains||[];
				//	if(resource.rule.options.includeDomains.indexOf(host) < 0)
				//	{
				//		resource.rule.options.includeDomains.push(host);
				//	}
					delete resource.rule.options.excludeDomains;
					delete resource.rule.options.level;

				}
				else
				{

					resource.rule = null;

				}

			}

		},this);
	},

	// ポップアップで変更された規則に応じてリソースのステータスを変更する

	updateResourcesState : function(resources)
	{

		if(WHO.active.port && WHO.active.port.status)
		{

			var resources = WHO.active.port.status.resources;

			var changedResources = {};//リソースの新しいステータス

			//読み込み状態の変化したリソース
			Object.keys(resources||{}).forEach(function(idx,i,myArray)//for(var src in resources)
			{

				var resource = resources[idx];

				if(resource.loaded !== "failed" && resource.loaded !== "blocked_by_opr")
				{

					var rule = WHO.URLFilterAPI.getMatchedRule({type:resource.type,src:resource.url,tab:WHO.active.port.tab.url,page:resource.page||WHO.active.port.tab.url})||{};
					var loaded = rule.act === "block" ? "blocked" : rule.act === "allow" ? "allowed" : "loaded";

					if(loaded !== resource.loaded)
					{
						resource.loaded = loaded;
						changedResources[idx] = resource;
					}

				}

			},this);

			//top document の状態が変更されているときはページをリロード
			if(changedResources[WHO.active.port.tab.url + "$document"])
			{
				WHO.active.port.tab.replace(WHO.active.port.tab.url);
			}
			else
			//ページに変更されたリソースの状態を送る
			if(WHO.active.port.postMessage)
			{
				WHO.active.port.postMessage('ContentBlockHelper',{method:"updateResourcesState",resources:changedResources});
			}

			background.changeIcon(WHO.active.port.origin);//アイコンを変更

		}

	},

	getScriptExecutedStatus : function(resources)
	{

		var loadedScript  = 0;
		var allowedScript = 0;
		var myPage = WHO.active.port.url;
		var host   = WHO.URL.getHostname(myPage);

		var subdomain   = "([^\/\:\.]+\\.)*" + (WHO.URL.getDomain(myPage).replace(/\./g,"\\."));
		var subregexp  = new RegExp("^https?://" + subdomain,"i");//ファーストパーティ
		var hostregexp = new RegExp("^https?://" + (host.replace(/\./g,"\\.")),"i");//同一ホスト

		Object.keys(resources||{}).forEach(function(idx)
		{

			var resource = resources[idx];

			if(myPage === resource.page && resource.type === "script")
			{

				if(resource.loaded === "unknown")
				{

					resource.loaded = "loaded";

					var rule = WHO.URLFilterAPI.getMatchedRule({type:"script",src:resource.url,tab:WHO.active.port.url,page:resource.page||WHO.active.port.tab.url});

					if(rule)
					{
						if(rule.act === "block")
						{
							resource.loaded = "blocked";
						}
						else
						{
							resource.loaded = "allowed";
						}
					}

				}

				var level = resource.url === resource.page ? 8 : hostregexp.test(resource.url) ? 4 : subregexp.test(resource.url) ? 2 : 1;

				if(resource.loaded === "loaded")
				{
					loadedScript  = loadedScript  | level;
				}
				else
				if(resource.loaded === "allowed")
				{
					allowedScript = allowedScript | level;
				}

			}

		},this);

		return {loaded:loadedScript,allowed:allowedScript};

	},

	//------------------------------------------------------------------------------------//
	// ボタンとメニューの表示をの切り替える

	changeIcon : function(origin)
	{

		WHO.active.port.status.ignored = false;

		if(!WHO.active.port.tab){ return; }

		/* メニュー : いったん全てを無効に */

		background.contextMenu.menus.toggleOnSite.disable();
		background.contextMenu.menus.disableOnTab.disable();

		background.contextMenu.menus.normal.remove();
		background.contextMenu.menus.linked.remove();
		background.contextMenu.menus.module.remove();
		background.contextMenu.menus.script.remove();
		background.contextMenu.menus.iframe.remove();
		background.contextMenu.menus.css.remove();

		background.contextMenu.menus.blockIDon5ch.remove();

		/* 一時停止中 */
		if(background.config.prefs.temporary.disabled)
		{

			WHO.toolbar.update(
			{
				icon  : "buttons/disabled.png",
				title : WHO.locale.get("Mode::Disable"),
				badge :
				{
					display:"none"
				}
			});

		}
		else
		/* 編集モード */
		if(WHO.active.port.status.mode)
		{

			WHO.toolbar.update(
			{
				icon  : "buttons/" + WHO.active.port.status.mode + ".png",
				title : WHO.locale.get("Mode::" + WHO.active.port.status.mode ) + " (" + origin + ")",
				badge :
				{
					display:"none"
				}
			});

			// メニュー

			background.contextMenu.menus.normal.add();

		}
		else
		{

			var rule = WHO.URLFilterAPI.getMatchedRule({type:"top",src:WHO.active.port.url,tab:WHO.active.port.url,page:WHO.active.port.url})||{};

			/* 黙認ページ */
			if(rule.act === "ignore")
			{

				WHO.active.port.status.ignored = true;

				WHO.toolbar.setIcon("buttons/ignore.png");
				WHO.toolbar.setTitle(WHO.locale.get("Status::Ignored") + " (" + origin + ")");

				// メニュー
				background.contextMenu.menus.toggleOnSite.update(
				{
					title    : WHO.locale.get("Mode::Enable::Site"),
				});
				if(rule.status["cus"])
				{
					background.contextMenu.menus.toggleOnSite.enable();
				}
				background.contextMenu.menus.disableOnTab.enable();

			}
			else
			/* 標準ページ */
			{

				/* メニューの更新 */

				background.contextMenu.menus.toggleOnSite.update(
				{
					title    : WHO.locale.get("Mode::Disable::Site"),
				});
				background.contextMenu.menus.toggleOnSite.enable();
				background.contextMenu.menus.disableOnTab.enable();

				background.contextMenu.menus.linked.add();
				background.contextMenu.menus.module.add();
				background.contextMenu.menus.script.add();
				background.contextMenu.menus.iframe.add();
				background.contextMenu.menus.css.add();

			}

			background.showResourcesNumber(origin);//バッジ

		}

	},

	/* ボタンに自動ブロック数を表示 */

	showResourcesNumber : function(origin)
	{

		var resources = WHO.active.port.status.resources;

		//白 : このページは無視
		if(WHO.active.port.status.ignored)
		{

			backgroundColor = "#ffffff";
			color           = "#000000";

		}
		else
		{

			var script = this.getScriptExecutedStatus(WHO.active.port.status.resources);

			var title,backgroundColor,color;

			//黒 : サードパーティのスクリプトが実行された
			if(script.loaded & 1)
			{
				title = WHO.locale.get("Status::ThirdParty") + " (" + origin + ")";
				backgroundColor = "#000000";
				color           = "#ffff00";
			}
			else
			//紫 : 同ドメイン（別ホスト）のスクリプトが実行された
			if(script.loaded & 2)
			{
				if(script.allowed & 1)
				{
					title = WHO.locale.get("Status::SameDomain::Allowed") + " (" + origin + ")";
					backgroundColor = "#330099";
				}
				else
				{
					title = WHO.locale.get("Status::SameDomain") + " (" + origin + ")";
					backgroundColor = "#9900cc";
				}
				color           = "#ffffff";
			}
			else
			//赤 : 同ホストのスクリプトが実行された
			if(script.loaded & 4)
			{
				if(script.allowed & 3)
				{
					title = WHO.locale.get("Status::SameHost::Allowed") + " (" + origin + ")";
					backgroundColor = "#990000";
				}
				else
				{
					title = WHO.locale.get("Status::SameHost") + " (" + origin + ")";
					backgroundColor = "#ff0000";
				}
				color           = "#ffffff";
			}
			else
			// 黄 : インラインスクリプトが実行された
			if(script.loaded & 8)
			{
				if(script.allowed & 7)
				{
					title = WHO.locale.get("Status::Inline::Allowed") + " (" + origin + ")";
					backgroundColor = "#999900";
				}
				else
				{
					title = WHO.locale.get("Status::Inline") + " (" + origin + ")";
					backgroundColor = "#ffff00";
				}
				color           = "#000000";
			}
			// 緑 : スクリプトは実行されなかった
			else
			{
				if(script.allowed & 15)
				{
					title = WHO.locale.get("Status::NoScripts::Allowed") + " (" + origin + ")";
					backgroundColor = "#009900";
				}
				else
				{
					title = WHO.locale.get("Status::NoScripts") + " (" + origin + ")";
					backgroundColor = "#00cc00";
				}
				color           = "#ffffff";
			}

			WHO.toolbar.setIcon("buttons/enabled.png");
			WHO.toolbar.setTitle(title);

		}

		/* バッジを更新 */

		WHO.toolbar.setBadge(
		{
			display        :"block",
			text           :String(Object.keys(resources||[]).length),
			backgroundColor:backgroundColor,
			color          :color
		});

		WHO.toolbar.update({});

	},

	/* ブロックされたタブをアクティブにする */

	activateBlockedTab : function(tab)
	{

		if(tab.url && tab.url.indexOf(chrome.runtime.getURL("blocked/mainframe.html")) === 0)
		{

			var url = decodeURIComponent(tab.url.split("?")[1]);

			var rule = WHO.URLFilterAPI.getMatchedRule({type:"top",src:url,tab:url,page:url});

			if(rule && rule.act === "block")
			{

				var resources = {};

				resources[url + "$document"] =
				{
					type   : "top",
					url    : url,
					page   : url,
					loaded : "blocked",
					rule   : {act:rule.act,pattern:rule.pattern,options:rule.options,status:rule.status},
				};

				tab.url = url;
				WHO.active.activatePort(
				{
					source     :tab.port ? tab.port.source : null,
					tab        :tab,
					url        :url,
					postMessage:tab.port ? tab.port.postMessage : null,
				},
				{
					resources:resources
				});
			}
		}

	},

};

/****************************************************************************************************/
/* main                                                                                             */

WHO.extension.addEventListener('ready',function()
{

	background.init();
	WHO.locale.load("configurations/lang.json",function()
	{
		background.start();
	});

});

/****************************************************************************************************/
