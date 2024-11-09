"use strict";
//use WHO.URL
/****************************************************************************************************/
/* URLFilter API ラッパー                                                                           */
/*

	WHO.URLFilterAPI

		Properties

			block : object

				Methods

					add         : undefined WHO.URLFilterAPI.block.add(string filterPattern,object filterOptions,string filterListed)
					remove      : undefined WHO.URLFilterAPI.block.remove(string filterPattern,object filterOptions,string filterListed)
					isInRules   : boolean WHO.URLFilterAPI.block.isInRule(string filterPattern,object filterOptions,string filterListed)

			allow : object

				Methods

					add         : undefined WHO.URLFilterAPI.allow.add(string filterPattern,object filterOptions)
					remove      : undefined WHO.URLFilterAPI.allow.remove(string filterPattern,object filterOptions)
					isInRules   : boolean WHO.URLFilterAPI.allow.isInRule(string filterPattern,object filterOptions,string filterListed)

			ignore : object

				Methods

					add         : undefined WHO.URLFilterAPI.ignore.add(string filterPattern,object filterOptions,string filterListed)
					remove      : undefined WHO.URLFilterAPI.ignore.remove(string filterPattern,object filterOptions,string filterListed)
					isInRules   : boolean WHO.URLFilterAPI.ignore.isInRule(string filterPattern,object filterOptions,string filterListed)

		Methods

			suspend          : undefined WHO.URLFilterAPI.suspend()
				ブロックを一時的に無効にする

			resume           : undefined WHO.URLFilterAPI.resume()
				ブロックの一時無効を解除

			removeAll        : undefined WHO.URLFilterAPI.removeAll(status)
				該当するルールを全て削除

			disableOnTab     : undefined WHO.URLFilterAPI.disableOnTab(WHO.tabObject tab)
			enableOnTab      : undefined WHO.URLFilterAPI.enableOnTab(WHO.tabObject tab)
			isDisabledTab    : boolean WHO.URLFilterAPI.isDisabledTab(WHO.tabObject tab)

			getMatchedRule   : URLFilter WHO.URLFilterAPI.getMatchedRule({src:string resourceURL,tab:string tabURL,page:string pageURL,type:string resourceType})
			getIncludedRules : array of URLFilter WHO.URLFilterAPI.getIncludedRules(string pageURL)

	URLFilter

		Properties

			act     : string "ignore" or "allow" or"block"
			pattern : string URL wildcard pattern
			options : object
				Properties
					thirdParty     : boolean
					firstParty     : boolean
					includeDomains : array of domains
					excludeDomains : array of domains
					resources      : integer Bit of type of resource
					level          : integer Bit of apply domain level
			status  : string any
                                                                                                    */
/****************************************************************************************************/

var WHO = WHO || {};


	WHO.URLFilterAPI =
	{

		// chrome.webRequest.ResourceType : "main_frame","sub_frame","ping","xmlhttprequest","script","stylesheet","font","image","object","other"
		typemap :
		{
			"main_frame"       : (1 <<  0),
			"top"              : (1 <<  0),//64 : Presto Opera
			"sub_frame"        : (1 <<  1),//Blink,WebExtensions
			"subdocument"      : (1 <<  1),//32 : AdBlock
			"popup"            : (1 <<  2),
			"redirect"         : (1 <<  3),//128 : ResourceType には無い
			"refresh"          : (1 <<  3),//128 : ResourceType には無い
			"ping"             : (1 <<  4),// <a ping> or navigator.sendBeacon()
			"xmlhttprequest"   : (1 <<  5),
			"script"           : (1 <<  6),//2
			"stylesheet"       : (1 <<  7),//8
			"font"             : (1 <<  8),//32768, 1個,Chrome 隠しプロパティ
			"image"            : (1 <<  9),//4
			"audio"            : (1 << 10),//16384, 4個
			"video"            : (1 << 11),//16384, 4個
			"media"            : (1 << 10) + (1 << 11),//16384, 4個
			"object"           : (1 << 12) + (1 << 13),//object-subrequest と区別できず
			"object-subrequest": (1 << 12) + (1 << 13),//ResourceType には無い→objectと区別できず
			"dummy"            : (1 << 14),//8192
			"other"            : (1 << 15),//1, video, audio を含む→ tabId で分離,2個
		},
		/* 未実装のオプション*/

		// $sitekey=
		// $elementhide  @@||example.com^$elemhide でマッチしたページの要素隠蔽を無効に for exception rules only, similar to document but only disables element hiding rules on the page rather than all filter rules
		// $generichide  @@||example.com^$generichide 全てのページに適用される要素隠蔽を無効に
		// $genericblock @@||example.com^$genericblock 全てのページに適用されるブロックを無効に→ignore ||example.com^* [generic:true]
		// $match-case   大文字/小文字の区別を付ける
		// $collapse     ブロックした要素のスペースを縮める
		// $donttrack    DoNotTrack ヘッダを返す,未使用,終了？
		// $background   終了
		// $xbl          終了
		// $dtd          終了

		_list : function()
		{
			this.rules = {};
			return this;
		},

		_suspended  : false,//一時停止

		//よく使う正規表現
		_parser :
		{
			urlIndex      : /(?:(^[a-z\-]+:)\/\/|(?:[^a-z0-9](?!\/\/))+)/i,
			patternIndex  : /(?:(^[a-z\-]+:)(?:\/\/)?|\|\||[^\*a-z0-9]+)(?:([\*a-z0-9]+)[a-z0-9]*|.*)/i,// [1] 規則のインデックスを作成
			dot           : /\./g,
		},
		_sort : 
		[
			"image",
			"b","scripts","0","gif","us",
			"http","cloudfront","min","v","files",
			"info","a","s","banner","media",
			"in","css","png","ad","assets",
			"html","jpg","cdn","ads","1",
			"img","au","php","wp","id",
			"content","web","static","jp","google",
			"uk","https:","http:","www","co",
			"net","js","org","images","com"
		],

		//規則を正規表現に変換するための正規表現
		_patternParser :
		{
			escape         : [/[^\w\*\^]/g,"\\$&"],
			separator      : [/\^/g,"[\\/\\:\\?\\=\\&]"],
			top            : [/^(?!\*|\\\|\\\|)/,"^"],
			tale           : [/([^\*])$/,"$1$"],
			wildcardOnTop  : [/^\*(?!$)/,""],
			wildcardOnTale : [/(.)\*$/,"$1"],
			wildcard       : [/\*/g,".*"],
			multiScheme    : [/^\\\|\\\|/,"^https?://(?:[\\w\\-]+\\.)*?"],//"^[\\w\\-]+://(?:[\\w\\-]+\\.)*?"
		},

		/* URL Pattern を正規表現に変換する */

		getParsedURLPattern : function(pattern)
		{

			var replaced = pattern
						.replace(this._patternParser["escape"][0],this._patternParser["escape"][1])
						.replace(this._patternParser["separator"][0],this._patternParser["separator"][1])
						.replace(this._patternParser["top"][0],this._patternParser["top"][1])
						.replace(this._patternParser["tale"][0],this._patternParser["tale"][1])
						.replace(this._patternParser["wildcardOnTop"][0],this._patternParser["wildcardOnTop"][1])
						.replace(this._patternParser["wildcardOnTale"][0],this._patternParser["wildcardOnTale"][1])
						.replace(this._patternParser["wildcard"][0],this._patternParser["wildcard"][1])
						.replace(this._patternParser["multiScheme"][0],this._patternParser["multiScheme"][1]);

			return new RegExp(replaced,"i");

		},

		getFormalRuleOptions : function(options)
		{

			var formal = {};

			if(options)
			{

				// resourcetypes : types -> resources
				if(options.resources      !== undefined){formal.resources      = options.resources;            }
				if(options.types)
				{
					formal.resources = formal.resources || 0;
					options.types.forEach(function(type)
					{
						formal.resources |= this.typemap[type];
					},this);
				}

				// hosting level
				if(options.level          !== undefined){formal.level          = options.level;                }
				if(options.thirdParty)
				{
					formal.level = 3;
				}
				else
				if(options.firstParty)
				{
					formal.level = 12;
				}

				// specific domains
				if(options.includeDomains !== undefined){formal.includeDomains = options.includeDomains.sort();}
				if(options.excludeDomains !== undefined){formal.excludeDomains = options.excludeDomains.sort();}

			}

			return formal;

		},

		/* URL から indexs を取得する */

		getIndexsFromURL : function(url)
		{

			var indexs = url.split(WHO.URLFilterAPI._parser.urlIndex)
			.filter(function(e,i,self)
			{
				return e&&self.indexOf(e) === i;
			})
			.map(function(e)
			{
				return e.toLowerCase();
			});

			indexs.push("*");

			return indexs;

		},

		getIndexFromPattern : function(pattern)
		{

			var indexs = (pattern.split(WHO.URLFilterAPI._parser.patternIndex)||[])
			.filter(function(e,i,self)
			{
				return e&&self.indexOf(e) === i&&e.indexOf("*")<0;//*を含むのは削除
			}).map(function(e)
			{
				return e.toLowerCase()
			}).sort(function(a,b)
			{
				var value = WHO.URLFilterAPI._sort.indexOf(a) - WHO.URLFilterAPI._sort.indexOf(b);
				if(value > 0)
				{//bを前に
					return 1;
				}
				else
				if(value < 0)
				{//aを前に
					return -1;
				}
				else
				{
					return b.length - a.length;
				}
			});
			indexs.push("*");

			return indexs[0]||"*";

		},

		//全ての規則を削除
		removeAll : function(listed)
		{

			var list = {"block":this.block,"allow":this.allow,"ignore":this.ignore};

			for(var act in list)
			{

				var rules = list[act].rules;

				for(var index in rules)
				{

					for(var i = rules[index].length - 1;i >= 0;--i)
					{
						var rule = rules[index][i];

						if(rule.status[listed])
						{

							list[act].remove(rule.pattern,rule.options,listed);

						}
					}
				}
			}
		},

		/* コンテンツにマッチするルールを返す */

		getMatchedRule : function(resource)
		{

			var hostname = WHO.URL.getHostname(resource.src);

			var indexs = WHO.URLFilterAPI.getIndexsFromURL(resource.tab);
			var ignore = this.ignore._contentMatchInList(65535,resource.tab,indexs,"",31);//ignoredRule,

			var frame    = WHO.URLFilterAPI._getFrameData(resource.page);

			var rule = this._getAppliedRule(resource.type,resource.src,ignore,hostname,frame);

			if(rule)
			{
				// Object.assign(newRule,rule);
				var newRule =
				{
					act    :rule.act,
					pattern:rule.rule.pattern,
					options:JSON.parse(JSON.stringify(rule.rule.options)),
					status :JSON.parse(JSON.stringify(rule.rule.status)),
				};
				return newRule;
			}
			else
			{
				return null;
			}

		},

		_getFrameData : function(url)
		{

			var hostname = WHO.URL.getHostname(url)||"dummy.example.domain";
			var domain   = WHO.URL.getDomain(url)||"example.domain";
			var statics  = "(?:img|cdn|api|static)";
			var brand    = domain.split(".")[0].split("-");
			var similar  = new RegExp(brand.map(function(e){var s = e.split("");return s.shift() + (s.length ? ("(?:" + s.join("?") + "?" + statics + "|" + s.join("?") + "?)(?!$)") : statics) ; }).join("|"),"ig");

			var frame =
			{
				url        : url,
				hostname   : hostname,
				domain     : new RegExp("(^|\\.)" + domain.replace(WHO.URLFilterAPI._parser["dot"],"\\.") + "$","i"),
				similar    : similar,
			};

			return frame;

		},

		_getAppliedRule : function(type,url,ignore,srcHostname,frame)
		{

		//	var level = frame.url === url ? 16 : frame.hostname === srcHostname ? 8 : frame.domain.test(srcHostname) ? 4 : frame.similar.test(srcHostname) ? 2 : 1;
			var level = frame.url === url ? 16 : frame.hostname === srcHostname ? 8 : frame.domain.test(srcHostname) ? 4 : (srcHostname.match(frame.similar)||[]).some(function(e){return e.length > 2;}) ? 2 : 1;

			var resource = type ? WHO.URLFilterAPI.typemap[type] : 0;

			//黙認規則
			//Opera では直接の親フレーム Blink では タブを対象に

		//	var ignore = this.ignore._contentMatchInList(resource,tab.url,tab.indexs,frame.hostname,level);
		//	var ignore = tab.ignoreRule;

			if(ignore)
		//	if(tab.ignoreRule)
			{
				return {act:"ignore",rule:ignore};
			}


			var indexs =  WHO.URLFilterAPI.getIndexsFromURL(url);

			//許可規則
			var allow = this.allow._contentMatchInList(resource,url,indexs,frame.hostname,level);

			if(allow)
			{
				return {act:"allow",rule:allow};
			}

			//遮断規則
			var block = this.block._contentMatchInList(resource,url,indexs,frame.hostname,level);

			if(block)
			{
				return {act:"block",rule:block};
			}

			return null;

		},

		/* 特定のページで適用される規則のリストを返す */

		getIncludedRules : function(pageURL)
		{

			var newFilters = 
			{
				ignore : {},
				allow  : {},
				block  : {},
			};

			["block","allow","ignore"].forEach(function(act)//for(var act in list)
			{

				var rules = this[act].rules;

				Object.keys(rules).forEach(function(index)//for(var index in rules)
				{

					for(var i = 0,rule;rule = rules[index][i];++i)
					{

						//pageURL で適用されるフィルタのみ
						if(
							(!rule.excludeDomains || !rule.excludeDomains.test(pageURL)) &&
							(!rule.includeDomains || rule.includeDomains.test(pageURL))
						)
						{

							if(!newFilters[act][index] || !(newFilters[act][index] instanceof Array))
							{
								newFilters[act][index] = [];
							}
							newFilters[act][index].push(
							{
								pattern:rule.pattern,
								status :rule.status,
								options:rule.options,
							});

						}
					}
				},this);
			},this);

			return newFilters;

		},

	};

	/* 規則を追加 */

	WHO.URLFilterAPI._list.prototype.add = function(pattern,options,listed)
	{

		var check = this._checkInList({pattern:pattern,options:options});

		// 新しい規則の場合
		if(!check.exist)
		{

			var rule =
			{
			//	checked:0,
			//	applied:0,
				pattern:pattern,
			//	reg:WHO.URLFilterAPI.getParsedURLPattern(pattern),
				options        : WHO.URLFilterAPI.getFormalRuleOptions(options),
				includeDomains : (options||{}).includeDomains ? new RegExp("(?:^|\\.)(" + (options.includeDomains.join("|").replace(WHO.URLFilterAPI._parser["dot"],"\\.")) + ")$","i") : null,
				excludeDomains : (options||{}).excludeDomains ? new RegExp("(?:^|\\.)(" + (options.excludeDomains.join("|").replace(WHO.URLFilterAPI._parser["dot"],"\\.")) + ")$","i") : null,
				status : {}
			};

			rule.status[listed||"normal"] = true;

			/* ルールに追加 */
			// index が rules の予約プロパティに含まれる場合がある

			if(!this.rules[check.index] || !(this.rules[check.index] instanceof Array))
			{
				this.rules[check.index] = [];
			}
			this.rules[check.index].push(rule);

			this._add(pattern,options,listed);

		}
		// 既に登録済みの場合
		else
		{

			check.rule.status[listed||"normal"] = true;

		}

	};

	/* 規則を削除 */

	WHO.URLFilterAPI._list.prototype.remove = function(pattern,options,listed)
	{

		var check = this._checkInList({pattern:pattern,options:options});

		if(check.exist)
		{
			var rule = check.rule;
			delete rule.status[listed||"normal"];

			if(Object.keys(rule.status).length === 0)
			{
				this.rules[check.index].splice(check.number,1);

				if(this.rules[check.index].length === 0)
				{
					delete this.rules[check.index];
				}

				this._remove(pattern,options,listed);

			}

		}

	};

	/* 登録済みの規則かどうか確認する */

	WHO.URLFilterAPI._list.prototype.isInRules = function(pattern,options,listed)
	{

		var check = this._checkInList({pattern:pattern,options:options});

		if(check.exist && check.rule.status[listed||"normal"])
		{
			return true;
		}
		else
		{
			return false;
		}

	};

	/* リストの中に規則が既に含まれているかどうか */

	WHO.URLFilterAPI._list.prototype._checkInList = function(samp)
	{

		var pattern = samp.pattern;
		var sampopt = WHO.URLFilterAPI.getFormalRuleOptions(samp.options);

		var index = WHO.URLFilterAPI.getIndexFromPattern(pattern);//

		// index が list の予約プロパティに含まれる場合がある
		if(this.rules[index] instanceof Array)
		{

			for(var i = 0;i < this.rules[index].length;++i)
			{

				var rule = this.rules[index][i];

				var options = WHO.URLFilterAPI.getFormalRuleOptions(rule.options);

				if(pattern === rule.pattern &&

					options.level          === sampopt.level           &&
					options.resources      === sampopt.resources       &&
					(options.includeDomains||[]).toString() === (sampopt.includeDomains||[]).toString()  &&
					(options.excludeDomains||[]).toString() === (sampopt.excludeDomains||[]).toString()
				)
				{

					return {exist:true,index:index,number:i,rule:rule};

				}
			}
		}

		return {exist:false,index:index};

	};

	/* URL が規則にマッチしているかどうか */

	WHO.URLFilterAPI._list.prototype._contentMatchInList = function(resource,url,indexs,frameHostname,level)
	{

	//	var index;
		var matchedRule = null;

	//	console.log(url);

		var rules = this.rules;// this.includedRules[frame.hostname] ||

		indexs.some(function(index)//for(var idx = 0;idx < indexs.length;++idx)
		{

		//	index = indexs[idx];

			if(Array.isArray(rules[index]))
			{

				matchedRule = rules[index].find(function(rule)//for(var i = 0,rule;rule = rules[index][i];++i)
				{

					//Resources
					if(!rule.options.resources || resource & rule.options.resources)
					{

						// 規則を正規表現に変換する
						if(!rule.reg)
						{
							rule.reg = WHO.URLFilterAPI.getParsedURLPattern(rule.pattern);
						}

						if(rule.reg.test(url))
						{
							//includeDomains : ignore では
							if(!rule.includeDomains || rule.includeDomains.test(frameHostname))
							{
								//excludeDomains
								if(!rule.excludeDomains || !rule.excludeDomains.test(frameHostname))
								{
									if(!rule.options.level || rule.options.level & level)
									{

										return true;

									}
								}
							}
						}
					}
				});
				return !!matchedRule;
			}
		});

		return matchedRule;

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

		WHO.URLFilterAPI._disabledTabList = [];//無効にするタブのリスト

		WHO.URLFilterAPI._popups    = {};
		WHO.URLFilterAPI._prefetchTabId = null;//先読みタブの Id
		WHO.URLFilterAPI._tabs      = {};

		WHO.URLFilterAPI._list.prototype._add   = function(pattern,options,status){};
		WHO.URLFilterAPI._list.prototype._remove = function(pattern,options,status){};

		/* 一時停止 */

		WHO.URLFilterAPI.suspend = function()
		{

			this._suspended = true;

		};

		WHO.URLFilterAPI.resume = function()
		{

			this._suspended = false;

		};

		/* タブでの実行を停止 */

		WHO.URLFilterAPI.disableOnTab = function(tab)
		{

			if(tab._tab && this._disabledTabList.indexOf(tab._tab.id) < 0)
			{
				this._disabledTabList.push(tab._tab.id);
			}

		};

		/* タブでの実行を再開 */

		WHO.URLFilterAPI.enableOnTab = function(tab)
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
		WHO.URLFilterAPI.isDisabledTab = function(tab)
		{
			return tab && tab._tab && this._disabledTabList.indexOf(tab._tab.id) > -1;
		};

		/* tab を登録 */
		// tab 作成時

		WHO.URLFilterAPI._registerTab = function(_tab)
		{

			var windowType  = "normal";//"popup"
			var isWebPage   = WHO.URL.isWebPage(_tab.url);

			/* ポップアップ */
			//Bug::Firefox::0014 : chrome.windows.onCreated and chrome.tabs.onCreated is not fired when a popup window is opened.
			if(WHO.URLFilterAPI._popups[_tab.windowId])
			{
				windowType = "popup";
				delete WHO.URLFilterAPI._popups[_tab.windowId];
				//ここではまだ _tab.url がセットされていない→onBeforeNavigation 後にセットされる
			}

			/* 先読みタブ */
			//新しいタブが先読みタブからの変換であるとき→先読みタブの情報を削除
			if(_tab.id === WHO.URLFilterAPI._prefetchTabId)
			{
				WHO.URLFilterAPI._prefetchTabId = null;
			}

			/* タブを登録 */
			WHO.URLFilterAPI._tabs[_tab.id] =//WHO.URLFilterAPI._tabs[_tab.id] || 
			{
				windowType  : windowType,       // "normal" | "popup"
				openerTabId : _tab.openerTabId,
				frames      : {},               // このタブに含まれるフレームの情報
				resources   : [],               // このタブに含まれるコンテンツリソース
				isWebPage   : isWebPage,        // true | false "http://" か "https://" であるかどうか
			};

			/* リンクからの新しいタブ */
			// Chrome::Issue::560292 : openerTabId is null for a Pop-Up's tab : https://bugs.chromium.org/p/chromium/issues/detail?id=560292
			if(isWebPage || _tab.openerTabId || windowType === "popup")
			{

				WHO.URLFilterAPI._tabs[_tab.id].isNewTarget = true;

			}

			/* トップフレームを登録 */
			WHO.URLFilterAPI._registerFrame(
			{
				url        : _tab.url,//target="_blank" や popup の時 url が未設定
				tabId      : _tab.id,
				frameId    : 0,
				type       :"main_frame",
			});

		};

		WHO.URLFilterAPI._dropTab = function(tabId)
		{

			/* Remove disabled tab index */
			var number = WHO.URLFilterAPI._disabledTabList.indexOf(tabId);
			if(number > -1)
			{
				WHO.URLFilterAPI._disabledTabList.splice(number,1);
			}

			delete WHO.URLFilterAPI._tabs[tabId];

		};

		/* フレームの情報を登録 */

		WHO.URLFilterAPI._registerFrame = function(src)
		{

			var url        = src.url;
			var tabId      = src.tabId;//-1 の時→以前のバグ？→修正された
			var frameId    = src.frameId;

			/* 先読みタブ */
			// Background request has tabId without tab...
			if(!WHO.URLFilterAPI._tabs[tabId])
			{
				WHO.URLFilterAPI._dropTab(WHO.URLFilterAPI._prefetchTabId);//以前の先読みタブは削除
				WHO.URLFilterAPI._prefetchTabId = tabId;                   //新しい先読みタブを登録
				WHO.URLFilterAPI._tabs[tabId] = 
				{
					windowType : "prefetch",
					frames     : {},
					resources  : [],
				};
			}

			/* トップフレームの時 */

			if(src.type === "main_frame" || frameId === 0)
			{

				WHO.URLFilterAPI._tabs[tabId].frames    = {};
				WHO.URLFilterAPI._tabs[tabId].resources = [];

			}

			/* about:blank な iframe は親ページと同じオリジンとする */

			if(url === "about:blank" && WHO.URLFilterAPI._tabs[tabId].frames[src.parentFrameId])
			{

				url = WHO.URLFilterAPI._tabs[tabId].frames[src.parentFrameId].url;

			}

			/* フィルタリング時に使うキャッシュ */

			if(!WHO.URLFilterAPI._tabs[tabId].frames[frameId] || url !== WHO.URLFilterAPI._tabs[tabId].frames[frameId].url)
			{

				WHO.URLFilterAPI._tabs[tabId].frames[frameId] = WHO.URLFilterAPI._getFrameData(url);

				// top frame
				// index のキャッシュ
				if(frameId === 0)
				{
					var indexs = WHO.URLFilterAPI.getIndexsFromURL(url);
					WHO.URLFilterAPI._tabs[tabId].frames[frameId].indexs     = indexs;
					WHO.URLFilterAPI._tabs[tabId].frames[frameId].ignoreRule = this.ignore._contentMatchInList(65535,url,indexs,"",31);
				}
			}

			// Bug::Firefox::0016 - chrome.webRequest addListener does not work well if options are not same.
			return {cancel:false};// only Firefox requrires

		};

		/* Register resources on tab : タブのリソースを登録する */

		WHO.URLFilterAPI._registerResource = function(dt)
		{
			var tab = WHO.URLFilterAPI._tabs[dt.tabId];

			if(tab)
			{

				var resource =
				{
					type      : dt.type,
					url       : dt.url,
					page      : dt.pageUrl,
					loaded    : dt.loaded,
				};

				/* src : ページ上の src,data,href タグ */

				var exist = tab.resources.findIndex(function(resource)
				{
					if(resource.requestId === dt.requestId)
					{
						return true;
					}
				},this);
				if(exist > -1)
				{
					resource.src = tab.resources[exist].url;
				}
				else
				{
					resource.src       = dt.url;
					resource.requestId = dt.requestId;
				}

				/* タブにリソースの読み込み状況を送る */
				// 先読みタブはタブを取得できない
				if(tab.windowType !== "prefetch")
				{

					chrome.tabs.get(dt.tabId,function(_tab)//panel の時は取得できない
					{

						if(_tab)
						{
							var tab = new WHO.extension._tab(_tab);

							if(tab && tab.port)
							{

								tab.port.postMessage('urlfilter',
								{
									method  :"onRequest",
									resource:resource
								});

							}
						}

					});
				}

				/* URLFilterAPI にキャッシュする */
				tab.resources.push(resource);

			}

		};

		/* Filters resources : フィルタリングの実行 */

		WHO.URLFilterAPI._getFilteredResponse = function(request)
		{

			var response = {cancel:false};

			var rule = WHO.URLFilterAPI._getResponseRule(request);

			if(rule)
			{
				switch(rule.act)
				{

					case "ignore" : request.loaded = "ignored";break;//黙認規則
					case "allow"  : request.loaded = "allowed";break;//許可規則
					case "block" ://遮断規則
						request.loaded = "blocked";
						response = WHO.URLFilterAPI._getCancelResponse(request);
						break;

				}

			}

			WHO.URLFilterAPI._registerResource(request);//リソースを登録

			return response;

		};

		WHO.URLFilterAPI._getResponseRule = function(request)
		{

			var rule = null;

			if(!WHO.URLFilterAPI._suspended && WHO.URLFilterAPI._disabledTabList.indexOf(request.tabId) < 0)
			{

				var hostname = WHO.URL.getHostname(request.url);
				var frames   = (WHO.URLFilterAPI._tabs[request.tabId]||{frames:{}}).frames;

				/* タブ */
			//	if(!frames[0])
			//	{
			//		console.log(request);
			//	}
				var _tab   = (frames[0]||{url:request.url});
				var ignore = _tab.ignoreRule || this.ignore._contentMatchInList(65535,_tab.url,WHO.URLFilterAPI.getIndexsFromURL(_tab.url),"",31);//ignoredRule,

				/* 親フレームの情報 */

				var page = frames[request.parentFrameId]||WHO.URLFilterAPI._getFrameData(request.url);

				request.pageUrl = page.url;
				request.loaded  = "loaded";

				/* リソース */
				var src = request.url;

				rule = WHO.URLFilterAPI._getAppliedRule(request.type,src,ignore,hostname,page);

			}

			return rule;

		};

		/* Gets the cancel response : コンテンツの読み込みを遮断して代替データを出力 */

		WHO.URLFilterAPI._getCancelResponse = function(dt)
		{

			// Bug::Firefox::0015::1257781 - Redirecting to moz-extension:// with webRequest.onBeforeSendHeaders fails with Security Error
			//スクリプト
			if(WHO.extension.isFirefox)
			{
				return {cancel:true};
			}
			else
			if(dt.type === "script")
			{
				return {redirectUrl: chrome.runtime.getURL("blocked/script.js")};
			}
			else
			//画像
			if(dt.type === "image")
			{
				// 1 x 137 px2 の画像を使用
				return {redirectUrl: chrome.runtime.getURL("images/spacer.png")}; // ダミー画像を表示
			}
			else
			//メインフレーム
			if(dt.type === "main_frame")
			{
				return {redirectUrl: chrome.runtime.getURL("blocked/mainframe.html") + "?" + encodeURIComponent(dt.url) };
			}
			else
			//サブフレーム
			if(dt.type === "sub_frame" && WHO.URLFilterAPI._tabs[dt.tabId].frames[dt.parentFrameId])
			{
				return {redirectUrl: chrome.runtime.getURL("blocked/subframe.html") + "?" + WHO.URLFilterAPI._tabs[dt.tabId].frames[dt.parentFrameId].url }; // エラーページを表示
			}
			else
			{
				return {cancel:true};
			}

		};

		/* Destroy inline scripts : インラインスクリプトをブロックする */

		WHO.URLFilterAPI._destroyInlineScript = function(dt)
		{

			//	Bug::Blink onHeadersReceived から実行すると chrome:// なページから戻った時にエラーとなる事がある

			var tab = WHO.URLFilterAPI._tabs[dt.tabId];

			if(dt.url && WHO.URL.isWebPage(dt.url) && tab && tab.frames[dt.frameId] && tab.frames[dt.frameId].url === dt.url)
			{

				var script = WHO.URLFilterAPI._getResponseRule({
					type          : "script",
					url           : dt.url,
					parentFrameId : dt.frameId,
					tabId         : dt.tabId,
				});

				if(script && script.act === "block")
				{
					var document = WHO.URLFilterAPI._getResponseRule(
					{
						type          : dt.type||"main_frame",
						url           : dt.url,
						parentFrameId : dt.parentFrameId === -1 ? 0 : dt.parentFrameId,
						tabId         : dt.tabId,
					});

					if(!document || document.act !== "block")
					{

						if(WHO.extension.BlinkVersion >= 50)
						{

							// Bug::Blink::0001 - executeScript is sometimes not executed when navigated from "chrome://" page..
							chrome.tabs.get(dt.tabId,function(_tab)
							{
								if(_tab)
								{
									chrome.tabs.executeScript(dt.tabId,
									{
										file           :"includes/destroyInlineScript.js",
										runAt          :"document_start",
										allFrames      :false,
										frameId        : dt.frameId,
										matchAboutBlank:true,
									},function(results)
									{
									//	console.info("Inline scripts was destroyed on",dt);
									});
								}
							});
						}
						else
						if(dt.frameId === 0)
						{
							chrome.tabs.get(dt.tabId,function(_tab)
							{
								if(_tab)
								{
									chrome.tabs.executeScript(dt.tabId,
									{
										file     :"includes/destroyInlineScript.js",
										runAt    :"document_start",
										allFrames:true,
									},function(results)
									{
									//	console.info("Inline scripts was destroyed on",dt);
									});
								}
							});
						}

					}

				}

			}

		};

		//------------------------------------------------------------------------------------//

		// edge では "ping","font" が非対応で死ぬため
		var compatibleTypes = [];
		if(WHO.extension.isEdge)
		{
			compatibleTypes = ["main_frame","sub_frame","xmlhttprequest","script","stylesheet","image","object"];
		}
		else
		{
			compatibleTypes = ["main_frame","sub_frame","ping","xmlhttprequest","script","stylesheet","font","image","object"];
		}

		/* Registers frames at startup : 起動時にタブとフレームの情報を記録する */
		//フレームのドメインを記録するのだ
		chrome.windows.getAll(function(_windows)
		{
			_windows.forEach(function(_window)
			{
				chrome.tabs.query({windowId:_window.id},function(_tabs)
				{
					_tabs.forEach(function(_tab)
					{

						WHO.URLFilterAPI._registerTab(_tab);

						WHO.URLFilterAPI._tabs[_tab.id].windowType  = _window.type;
						WHO.URLFilterAPI._tabs[_tab.id].isWebPage   = WHO.URL.isWebPage(_tab.url);
						WHO.URLFilterAPI._tabs[_tab.id].isNewTarget = false;

					});
				});
			});
		});
		//新しいタブのフレームを登録
		chrome.tabs.onCreated.addListener(WHO.URLFilterAPI._registerTab.bind(WHO.URLFilterAPI));
		chrome.webNavigation.onBeforeNavigate.addListener(WHO.URLFilterAPI._registerFrame.bind(WHO.URLFilterAPI));//<-tabs.onCreated より早い（順番は保証されない）
		// Bug::Firefox::0016 - chrome.webRequest addListener does not work well if options are not same.
		if(WHO.extension.isFirefox)
		{
			chrome.webRequest.onBeforeRequest.addListener(WHO.URLFilterAPI._registerFrame.bind(WHO.URLFilterAPI),{urls:["http://*/*","https://*/*"],types:["main_frame","sub_frame"]},["blocking"]);
		}
		else
		{
			chrome.webRequest.onBeforeRequest.addListener(WHO.URLFilterAPI._registerFrame.bind(WHO.URLFilterAPI),{urls:["http://*/*","https://*/*"],types:["main_frame","sub_frame"]});
		}

		chrome.tabs.onUpdated.addListener(function(tabId,changeInfo,_tab)
		{

			// ページが chrome: かどうか
			if(changeInfo.status === "complete" && WHO.URLFilterAPI._tabs[tabId])
			{
				WHO.URLFilterAPI._tabs[tabId].isWebPage = WHO.URL.isWebPage(_tab.url);
			}

		});

		/* Chrome の事前レンダリングによって tabId が変わる */
		//http://stackoverflow.com/questions/17756258/google-chrome-tab-id-changes-in-tabs-lifetime
		// Firefox does not unplement.
		if(WHO.extension.isBlink)
		{

			chrome.tabs.onReplaced.addListener(function(addedTabId,removedTabId)
			{
				var url = null;
				if(WHO.URLFilterAPI._tabs[addedTabId])
				{
					WHO.URLFilterAPI._tabs[addedTabId].windowType = "normal";
					WHO.URLFilterAPI._prefetchTabId = null;
				}
				else
				if(WHO.URLFilterAPI._tabs[removedTabId])
				{
					WHO.URLFilterAPI._tabs[addedTabId] = WHO.URLFilterAPI._tabs[removedTabId];
				}
				WHO.URLFilterAPI._tabs[addedTabId].isWebPage = WHO.URL.isWebPage(WHO.URLFilterAPI._tabs[addedTabId].url);
				WHO.URLFilterAPI._dropTab(removedTabId);
			});

		}

		/* Remove tab : 消えたタブをリストから削除 */

		//タブを削除
		chrome.tabs.onRemoved.addListener(WHO.URLFilterAPI._dropTab.bind(WHO.URLFilterAPI));

		//フレームを削除
		chrome.webNavigation.onErrorOccurred.addListener(function(dt)
		{
		//	console.log("onErrorOccurred",dt);
			
			var tab = WHO.URLFilterAPI._tabs[dt.tabId];
			if(tab && tab.frames[dt.frameId])
			{
				delete tab.frames[dt.frameId];
			}
		});

		// OPR のネイティブブロックを検出
		if(WHO.extension.isOPR)
		{
			chrome.webRequest.onErrorOccurred.addListener(function(dt)
			{
				//net::ERR_BLOCKED_BY_CLIENT : API によってぶろっくされた

				if(dt.error === "net::ERR_BLOCKED_BY_ADBLOCKER")// OPR Native ADBLOCKER によってブロック
				{

				//	console.log("Blocked by OPR",dt);

					var request =
					{
						type          : dt.type,
						url           : dt.url,
						parentFrameId : dt.type === "sub_frame" ? dt.parentFrameId : dt.frameId,
						tabId         : dt.tabId,
						requestId     : dt.requestId,
						loaded        : "blocked_by_opr",
					};

					WHO.URLFilterAPI._registerResource(request);//リソースを登録

				}
			},{urls:["http://*/*","https://*/*"]});
		}

		//------------------------------------------------------------------------------------//
		/* Filters resources : フィルタリングを実行 */

		chrome.webRequest.onBeforeRequest.addListener(function(dt)
		{
			var tab = WHO.URLFilterAPI._tabs[dt.tabId];

		//	console.log("onBeforeRequest",dt);

			var response = {cancel:false};

			// !tab.isClosed : 閉じられた popup は判定しない

			if(tab && !tab.isClosed)
			{

				var request =
				{
					type          : dt.type,
					url           : dt.url,
					parentFrameId : dt.type === "sub_frame" ? dt.parentFrameId : dt.frameId,
					tabId         : dt.tabId,
					requestId     : dt.requestId,
				};

				response = WHO.URLFilterAPI._getFilteredResponse(request);

			}

			return response;

		},{urls:["http://*/*","https://*/*"],types:compatibleTypes},["blocking"]);

		//メディアのブロック
		chrome.webRequest.onHeadersReceived.addListener(function(dt)
		{

		//	console.log("onHeadersReceived",dt);
			var tab = WHO.URLFilterAPI._tabs[dt.tabId];

			var response = {cancel:false};

			// !tab.isClosed : 閉じられた popup は判定しない
			if(tab && !tab.isClosed)
			{

				var contentType = dt.responseHeaders.find(function(header)
				{
					if(header.name.toLowerCase() === "content-type")
					{
						return true;
					}
				},this)||{value:"other/other"};

				var types = contentType.value.split("/");
				var type = dt.type;
				if(types[0] === "audio")
				{
					type = "audio";
				}
				else
				if(types[0] === "video")
				{
					type = "video";
				}
				else
				if(["x-shockwave-flash","ogg"].indexOf(types[1]) > -1)
				{
					type = "media";
				}

				var request =
				{
					type          : type,
					url           : dt.url,
					parentFrameId : dt.type === "sub_frame" ? dt.parentFrameId : dt.frameId,
					tabId         : dt.tabId,
					requestId     : dt.requestId,
				};

				response = WHO.URLFilterAPI._getFilteredResponse(request);

			}

			return response;

		},{urls:["http://*/*","https://*/*"],types:["other","media","xmlhttprequest"]},["blocking","responseHeaders"]);

		//------------------------------------------------------------------------------------//

		/* $redirect : リダイレクト */
		// Opera Presto Extension の URLFilter API の refresh の実装は http-equiv="refresh" のみ
		// meta タグによるリダイレクトには非対応→コンテントスクリプト
		chrome.webRequest.onHeadersReceived.addListener(function(dt)
		{

		//	console.log("onHeaderReceived" , dt);

			if(dt.responseHeaders && dt.statusCode === 301 || dt.statusCode === 302)
			{

				var responseHeaders = dt.responseHeaders.filter(function(header,i,headers)
				{

					if(header.name.toLowerCase() !== "location" || dt.url === header.value)
					{
						return true;
					}
					else
					{

						var request =
						{
							type          : "redirect",
							url           : header.value,
							parentFrameId : dt.type === "sub_frame" ? dt.parentFrameId : dt.frameId,
							tabId         : dt.tabId,
							requestId     : dt.requestId,
						};

						var response = WHO.URLFilterAPI._getFilteredResponse(request);

						return !response.cancel;

					}

				});

			}

			return {responseHeaders:responseHeaders};

		},{urls:["http://*/*","https://*/*"],types:["main_frame","sub_frame"]},["blocking","responseHeaders"]);

		//------------------------------------------------------------------------------------//

		/* $popup : ポップアップウィンドウ */

		// Bug::Firefox::0014 : chrome.windows.onCreated and chrome.tabs.onCreated is not fired when a popup window is opened.
		if(!WHO.extension.isFirefox)
		{
			chrome.windows.onCreated.addListener(function(_win)
			{

			//	console.log(_win);

				if(_win.type === "popup")
				{
					WHO.URLFilterAPI._popups[_win.id] = true;

				}

			});

			chrome.webNavigation.onBeforeNavigate.addListener(function(dt)
			{
				var tab = WHO.URLFilterAPI._tabs[dt.tabId];

				if(dt.frameId === 0 && tab && tab.windowType === "popup")
				{

					var request =
					{
						type          : "popup",
						url           : dt.url,
						parentFrameId : 0,
						tabId         : tab.openerTabId,// Chrome::Issue::560292 : openerTabId is null for a Pop-Up's tab : https://bugs.chromium.org/p/chromium/issues/detail?id=560292
						requestId     : dt.requestId,
					};

					var response = WHO.URLFilterAPI._getFilteredResponse(request);

					/* Remove Popup Window */
					if(response.cancel)
					{
						tab.isClosed = true;
						chrome.tabs.remove(dt.tabId);// Blink::Bug? : sometime "No tab with id" error
					}
				}
			});
		}

		//------------------------------------------------------------------------------------//

		/* inline-scripts : インラインスクリプトをブロック */

		// only for Firefox because Firefox has bugs
		// Bug::Firefox::0012 : content_script methods called by runtime never access DOM of window.
		if(WHO.extension.isFirefox)
		{
			chrome.runtime.onMessage.addListener(function(message,sender,callback)
			{

				var request =
				{
					type          : "script",
					url           : sender.url,
					parentFrameId : 0,
					tabId         : sender.tab.id,
				};

				var rule = WHO.URLFilterAPI._getResponseRule(request)||{};

				callback(
				{
					destroyInlineScript:"firefox",
					act:rule.act,
				});

			});
		}

		else
		{

			// chrome: なページからの移動ではどうしても inline-script をブロック出来ない
			// 例)chrome://startpage/ → http://tver.jp/index.php の移動

			/* for All Frames */
			// Bug::Blink::0001 - executeScript is sometimes not executed when navigated from "chrome://" page..
			// Bug::Blink::0002 - executeScript does sometimes delay when runAt option is "document_start" and tab is new one.
			// Blink   : リンクからの移動時に必要 / target="_blank" では実行が遅れる
			// chrome:// からの移動では実行されないことがある→まだページが chrome:// と判定される→isWebPage であえて実行させない
			chrome.webRequest.onHeadersReceived.addListener(function(dt)
			{
				var tab = WHO.URLFilterAPI._tabs[dt.tabId];
				// リダイレクトなレスポンスでは実行しない
				if([200,403,404,503,505].indexOf(dt.statusCode) > -1 && tab && tab.windowType !== "prefetch" && (tab.isWebPage || dt.frameId !== 0))
				{

					WHO.URLFilterAPI._destroyInlineScript(dt);

				}
				else
				if(tab)
				// 新しいタブでリダイレクトされるとエラーになる事がある→ isWebPage に false をセットして次のページでの実行を回避
				{
					tab.isWebPage = false;
				}

			},{urls:["http://*/*","https://*/*"],types:["main_frame","sub_frame"]}/*,["responseHeaders"]*/);

			/* only for Top Frame of New Window */
			//リダイレクトされるとエラーになる
			chrome.tabs.onCreated.addListener(function(_tab)
			{

				if(_tab.url && WHO.URL.isWebPage(_tab.url))
				{

					WHO.URLFilterAPI._destroyInlineScript({url:_tab.url,tabId:_tab.id,frameId:0,parentFrameId:-1});

				}
				else
				{
					chrome.tabs.get(_tab.id,function(_tab)
					{
						WHO.URLFilterAPI._destroyInlineScript({url:_tab.url,tabId:_tab.id,frameId:0,parentFrameId:-1});
					});
				}
			});

			/* only for Top Frame from chrome://page */
			// Blink   : chrome:// からの移動時に必要
			// 実行は遅れるが、確実に実行するため
			chrome.tabs.onUpdated.addListener(function(tabId,changeInfo,_tab)
			{
				var tab = WHO.URLFilterAPI._tabs[tabId];

				if(changeInfo.status === "loading" && tab && !tab.isWebPage)
				{

				//	console.log("onUpdated",_tab.url,changeInfo,_tab);

					WHO.URLFilterAPI._destroyInlineScript({url:_tab.url,tabId:tabId,frameId:0,parentFrameId:-1});

				}

			});

		}

		//
	//	chrome.tabs.onCreated.addListener(function(dt){console.log("onCreated")});
	//	chrome.webNavigation.onCreatedNavigationTarget.addListener(function(dt){console.log("onCreatedNavigationTarget",dt)});
	//	chrome.webNavigation.onBeforeNavigate.addListener(function(dt){console.log("onBeforeNavigate")});
	//	chrome.webRequest.onBeforeRequest.addListener(function(dt){console.log("onBeforeRequest")},{urls:["http://*/*","https://*/*"],types:["main_frame"]});
	//	chrome.webRequest.onHeadersReceived.addListener(function(dt){console.log("onHeadersReceived")},{urls:["http://*/*","https://*/*"],types:["main_frame"]});
	//	chrome.tabs.onUpdated.addListener(function(dt){console.log("onUpdated")});
	//	chrome.webNavigation.onCommitted.addListener(function(dt){console.log("onCommitted")});
	//	chrome.webNavigation.onDOMContentLoaded.addListener(function(dt){console.log("onDOMContentLoaded")});

		//------------------------------------------------------------------------------------//

		/* Send the Resources list to Content-script : Content-script にリソースリストを送る */

		WHO.extension.addRequestListener('urlfilter',function(sender,message)
		{

		//	console.log(sender.tab);

			if(sender.tab && sender.tab._tab && WHO.URLFilterAPI._tabs[sender.tab._tab.id])
			{

				/* タブに含まれるコンテンツのリストを送る */
				if(message.method === "getResources")
				{
					sender.messageCallback({resources:WHO.URLFilterAPI._tabs[sender.tab._tab.id].resources});
				}

			}

		});

	}

	/**************************************************************************************/

	WHO.URLFilterAPI.ignore = new WHO.URLFilterAPI._list();//黙認リスト $document が設定されたホワイトリスト そのページでのブロックを無効にする
	WHO.URLFilterAPI.allow  = new WHO.URLFilterAPI._list();//許可リスト
	WHO.URLFilterAPI.block  = new WHO.URLFilterAPI._list();//遮断リスト

	/**************************************************************************************/
