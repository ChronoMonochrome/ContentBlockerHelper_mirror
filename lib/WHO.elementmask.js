"use strict";
//use WHO.URL
/****************************************************************************************************/
/* ElementMask API                                                                                  */
/*

	WHO.ElementMaskAPI

		Methods

			add              : undefined WHO.ElementMaskAPI.hide.add(string act,string urlPattern,string selecterPattern,string filterListed)
			remove           : undefined WHO.ElementMaskAPI.hide.remove(string act,string urlPattern,string selecterPattern,string filterListed)

			suspend          : undefined WHO.ElementMaskAPI.suspend()
				隠蔽を一時的に無効にする

			resume           : undefined WHO.ElementMaskAPI.resume()
				隠蔽の一時無効を解除

			removeAll        : undefined WHO.ElementMaskAPI.removeAll(status)
				該当するルールを全て削除

			disableOnTab     : undefined WHO.ElementMaskAPI.disableOnTab(WHO.tabObject tab)
			enableOnTab      : undefined WHO.ElementMaskAPI.enableOnTab(WHO.tabObject tab)
			isDisabledTab    : boolean WHO.ElementMaskAPI.isDisabledTab(WHO.tabObject tab)

			getStyle         : string WHO.ElementMaskAPI.getStyle(string URL,array of listed)
			getGenericStyle  : string WHO.ElementMaskAPI.getGenericStyle(array of listed)
			getIncludedRules : array of ElementMask WHO.ElementMaskAPI.getIncludedRules(string pageURL)

	ElementMask

		Properties

			act      : string "hide" or "show"
			pattern  : string URL wildcard pattern
			selector : string Element selector
			status   : string any
                                                                                                    */
/****************************************************************************************************/

var WHO = WHO || {};


	WHO.ElementMaskAPI =
	{

		/* 規則のリスト */
		rules : //[index][pattern][act][listed]
		{	//index
			"*":
			{	//pattern
				"*"  :{hide:{},show:{},reg:/^.+$/},
				"*:*":{hide:{},show:{},reg:/^.+:.+$/},
			}
		},
		exceptions : {},//[selector]:array of [pattern,listed]

		//string Generic Style sheet. : 全てのサイトに適用されるスタイルシート
		//規則が追加されるとリセットされる
		genericStyle : {},

		_suspended     : false,//一時停止

		/* 規則を追加 */

		add : function(act,pattern,selector,listed)
		{

			/* Generic rule : should be "hide" */
			if(pattern === "*" && this.exceptions[selector])
			{
				//["*:*"]に有る時は追加しない
				if(this.rules["*"]["*:*"].hide[listed].indexOf(selector) > -1)
				{
					return;
				}
				else
				{
					pattern = "*:*";	//サイト毎に確認（showに無ければ適用）
				}
				//どちらにも無い時は["*"]のまま
			}

			var index = WHO.URLFilterAPI.getIndexFromPattern(pattern);//

			this.rules[index] = this.rules[index] || {};
			this.rules[index][pattern] = this.rules[index][pattern] ||
			{
				reg  : WHO.URLFilterAPI.getParsedURLPattern(pattern),
				hide : {},
				show : {},
			};
			var rules = this.rules[index][pattern];
			rules.hide[listed] = rules.hide[listed] || [];
			rules.show[listed] = rules.show[listed] || [];

			/* 隠蔽規則 */
			if(act === "hide" && rules.hide[listed].indexOf(selector) < 0)
			{
				rules.hide[listed].push(selector);
			}
			else
			/* 表示規則 */
			// #@# 規則
			if(act === "show" && rules.show[listed].indexOf(selector) < 0)
			{
				// "*" → "*:*" へ移動
				for(var status in this.rules["*"]["*"].hide)
				{
					var number = this.rules["*"]["*"].hide[status].indexOf(selector);
					if(number > -1)
					{
						this.rules["*"]["*"].hide[status].splice(number,1);	//"*"から削除
						this.add("hide","*:*",selector,status);				//"*:*"に追加
					}
				}
				this.exceptions[selector] = this.exceptions[selector] || [];
				this.exceptions[selector].push(
				{
					pattern:pattern,
					listed :listed,
				});
				rules.show[listed].push(selector);
			}

			this.genericStyle[listed] = null;

		},

		/* 規則を削除 */

		remove : function(act,pattern,selector,listed)
		{

			/* Generic rule : should be "hide" */
			if(pattern === "*")
			{
				if(this.rules["*"]["*:*"].hide[listed] && this.rules["*"]["*:*"].hide[listed].indexOf(selector) > -1)
				{
					pattern = "*:*";
				}
			}

			var index = WHO.URLFilterAPI.getIndexFromPattern(pattern);//

			if(this.rules[index] && this.rules[index][pattern] && this.rules[index][pattern][act] && this.rules[index][pattern][act][listed])
			{
				var number = this.rules[index][pattern][act][listed].indexOf(selector);
				if(number > -1)
				{
					this.rules[index][pattern][act][listed].splice(number,1);
					if(this.rules[index][pattern][act][listed].length === 0)
					{
						delete this.rules[index][pattern][act][listed];
						if(index !== "*" && Object.keys(this.rules[index][pattern].hide).length === 0 && Object.keys(this.rules[index][pattern].show).length === 0)
						{
							delete this.rules[index][pattern];

							if(Object.keys(this.rules[index]).length === 0)
							{
								delete this.rules[index];
							}
						}
					}
				}
			}

			if(act === "show")
			{
				this.exceptions[selector] = this.exceptions[selector].map(function(rule)
				{
					return rule.pattern !== pattern || rule.listed === listed;
				},this);
				if(this.exceptions[selector].length === 0)
				{
					delete this.exceptions[selector];
					for(var status in this.rules["*"]["*:*"].hide)
					{
						var number = this.rules["*"]["*:*"].hide[status].indexOf(selector);
						if(number > -1)
						{
							this.rules["*"]["*:*"].hide[status].splice(number,1);	//"*"から削除
							this.add("hide","*",selector,status);				//"*:*"に追加
						}
					}
				}
			}

			this.genericStyle[listed] = null;

		},

		//全ての規則を削除
		removeAll : function(listed)
		{

			var rules = this.rules;

			for(var index in rules)
			{

				for(var pattern in rules[index])
				{

					var list = {"hide":rules[index][pattern].hide[listed],"show":rules[index][pattern].show[listed]};

					for(var act in list)
					{

						if(list[act])
						{
							for(var i = list[act].length - 1;i >= 0;--i)
							{
								var selector = list[act][i];
								this.remove(act,pattern,selector,listed);
							}
						}
					}
				}
			}
			this.rules["*"]        = this.rules["*"] || {};
			this.rules["*"]["*"]   = this.rules["*"]["*"]   || {hide:{},show:{},reg:/^.+$/};
			this.rules["*"]["*:*"] = this.rules["*"]["*:*"] || {hide:{},show:{},reg:/^.+:.+$/};
		},

		/* サイト毎の CSS 規則を取得する */

		getStyle : function(url,list)
		{

			return this.getGenericStyle(list) + this.getSpecificStyle(url,list);

		},

		/* すべてのページに適用されるスタイルシートを取得 */

		getGenericStyle : function(list)
		{

			var genericStyle = "";

			list.forEach(function(listed)
			{
				if(!this.genericStyle[listed])
				{
					var style="";

					var rules = this.rules["*"]["*"].hide[listed];

					if(rules)
					{
						for(var i = 0;i < rules.length;i+=500)
						{

							var rule = rules.slice(i,i + 500).join(",");
							style = style + rule + "{display:none !important;}\n";

						}
					}
					else
					{
						style = "/* No generic rules */";
					}

					this.genericStyle[listed] = style;

				}

				genericStyle = genericStyle + this.genericStyle[listed];

			},this);

			return genericStyle;

		},

		/* サイト毎の隠蔽規則を取得 */

		getSpecificStyle : function(url,list)
		{

			var appliedRules = this.getRules(url,list,true);
			var style = "";

			for(var i = 0;i < appliedRules.length;i+=500)
			{
				var rule = appliedRules.slice(i,i + 500).join(",");
				style = style + rule + "{display:none !important;}\n";
			}

			return style;

		},

		getRules : function(url,list,specific)
		{

 			var indexs = WHO.URLFilterAPI.getIndexsFromURL(url);

			var hideRules = [];
			var showRules = [];

			for(var idx = 0;idx < indexs.length;++idx)
			{
				var index = indexs[idx].toLowerCase();
				if(this.rules[index])
				{

					var li = this.rules[index];

					for(var pattern in li)
					{
						if((pattern !== "*" || !specific) && li[pattern].reg.test(url))
						{
							list.forEach(function(listed)
							{
								if(li[pattern].hide[listed])
								{
									hideRules = hideRules.concat(li[pattern].hide[listed]);
								}
							},this);
							for(var listed in li[pattern].show)
							{
								showRules = showRules.concat(li[pattern].show[listed]);
							}
						}
					}

				}

			}

			/* 隠蔽規則から表示規則を差し引く */

			showRules.forEach(function(rule,i)
			{
				var number = hideRules.indexOf(rule);
				if(number > -1)
				{
					hideRules.splice(number,1);
				}
			},this);

			return hideRules;

		},

		/* 既に存在する規則かどうか */

		isExist : function(act,url,selector)
		{

 			var indexs = WHO.URLFilterAPI.getIndexsFromURL(url);

			var exist = indexs.some(function(index)
			{
				index = index.toLowerCase();
				if(this.rules[index])
				{
					var li = this.rules[index];

					for(var pattern in li)
					{
						if(li[pattern].reg.test(url))
						{
							for(var listed in li[pattern][act])
							{
								if(li[pattern][act][listed].indexOf(selector) > -1)
								{
									return true;
								}
							}
						}
					}

				}

			},this);

			return exist;

		},

	};

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

		WHO.ElementMaskAPI._disabledTabList = [];//無効にするタブのリスト

		/* 一時停止 */

		WHO.ElementMaskAPI.suspend = function()
		{

			this._suspended = true;

		};

		WHO.ElementMaskAPI.resume = function()
		{

			this._suspended = false;

		};

		WHO.ElementMaskAPI.isSuspended = function()
		{

			return this._suspended;

		};

		/* タブでの実行を停止 */

		WHO.ElementMaskAPI.disableOnTab = function(tab)
		{

			if(tab._tab && this._disabledTabList.indexOf(tab._tab.id) < 0)
			{
				this._disabledTabList.push(tab._tab.id);
			}

		};

		/* タブでの実行を再開 */

		WHO.ElementMaskAPI.enableOnTab = function(tab)
		{

			if(tab._tab)
			{

				var number = this._disabledTabList.indexOf(tab._tab.id);
				if(number > -1)
				{
					this._disabledTabList.splice(number,1);
				}

			}

		};

		// 無効のタブかどうか
		WHO.ElementMaskAPI.isDisabledTab = function(tab)
		{
			return tab && tab._tab && this._disabledTabList.indexOf(tab._tab.id) > -1;
		};

		/* サイト毎の購読スタイルを流し込む */

		WHO.ElementMaskAPI._publishStyle = function(_tab)
		{

			if(!this._suspended && this._disabledTabList.indexOf(_tab.id) < 0 && WHO.URL.isWebPage(_tab.url))
			{

				var rule = WHO.URLFilterAPI.getMatchedRule({type:"top",src:_tab.url,tab:_tab.url,page:_tab.url})||{};

				if(!rule || rule.act !== "ignore")
				{
					chrome.tabs.insertCSS(_tab.id,
					{
						code      : this.getStyle(_tab.url,["system","sub"])/* + "body{display:block !important;}"*/,
						allFrames : false,//トップフレームのみに流し込む
						runAt     : "document_end",
					},function()
					{
					//	console.log(style);
					});
				}
			}

		};

		//------------------------------------------------------------------------------------//
		/* ページの移動時に購読スタイルを適用 */

		chrome.webNavigation.onCommitted.addListener(function(dt)
		{
			if(dt.frameId === 0)
			{
			//	console.log(dt);
				WHO.ElementMaskAPI._publishStyle({url:dt.url,id:dt.tabId});
			}
		});

	}

	/**************************************************************************************/
