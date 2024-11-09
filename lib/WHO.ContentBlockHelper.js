var WHO = WHO || {};

	/*******************************************************************************/
	/* ContentBlockHelper ライブラリ */
	// WHO.widget.js の WHO.XHR を使用

	WHO.ContentBlockHelper =
	{

		URLFilterAPI   : WHO.URLFilterAPI,
		ElementMaskAPI : WHO.ElementMaskAPI,

		typeList:
		[
			"main_frame"       ,// 0
			"sub_frame"        ,// 1
			"popup"            ,// 2
			"redirect"         ,// 3
			"ping"             ,// 4
			"xmlhttprequest"   ,// 5
			"script"           ,// 6
			"stylesheet"       ,// 7
			"font"             ,// 8
			"image"            ,// 9
			"audio"            ,//10
			"video"            ,//11
			"object"           ,//12
			"object-subrequest",//13
			"dummy"            ,//14
			"other"            ,//15
		],

		quickTypes : 
		[
			"script"           ,// 6
			"stylesheet"       ,// 7
		//	"font"             ,// 8
			"image"            ,// 9
			"audio"            ,//10
			"video"            ,//11
			"object"           ,//12
			"sub_frame"        ,// 1
			"popup"            ,// 2
			"redirect"         ,// 3
			"ping"             ,// 4
			"xmlhttprequest"   ,// 5
		//	"object-subrequest",//13
		//	"dummy"            ,//14
		//	"other"            ,//15
		],// QuickFilters で利用する

		start : function()
		{

			var self = this;

			//------------------------------------------------------------------------------------//

			this.URLFilterAPI.ignore.add("||" + window.location.host + "^*",null,"system"); //ContentBlockHelper 自身
			this.URLFilterAPI.ignore.add("opera://*",null,"system");                        //Opera システムページ
			this.URLFilterAPI.ignore.add("chrome://*",null,"system");                       //Chrome システムページ
			this.URLFilterAPI.ignore.add("chrome-extension://*",null,"system");             //Chrome エクステンション
			this.URLFilterAPI.ignore.add("chrome-devtools://*",null,"system");              //Chrome システムページ
			this.URLFilterAPI.ignore.add("||dragonfly.opera.com^*",null,"system");          //Opera Dragonfly
		//	this.URLFilterAPI.ignore.add("widget://*",null,"system");                       //Opera エクステンション
			this.URLFilterAPI.allow.add("widget://*",{resources:65535},"system");           //Opera エクステンション

			if(WHO.extension.isChrome)
			{
			
				this.URLFilterAPI.ignore.add("||chrome.google.com^*",null,"system");
				this.URLFilterAPI.ignore.add("||google.*^_/chrome/newtab?*",null,"system");
				this.URLFilterAPI.ignore.add("||google.*^webhp?sourceid=chrome-instant&*",null,"system");

			}
			else
			if(WHO.extension.isOPR)
			{

				this.URLFilterAPI.ignore.add("||addons.opera.com^*",null,"system");        //Opera Addons Store

			}
			else
			if(WHO.extension.isFirefox)
			{

				this.URLFilterAPI.ignore.add("||addons.mozilla.org^*",null,"system");        //Mozilla

			}

			this.URLFilterAPI.ignore.add("||whochan.com^*",null,"system");
			this.URLFilterAPI.ignore.add("*^t=whochan-22^*",null,"system");                 //Amazon
			this.URLFilterAPI.ignore.add("||lifecard.co.jp^*",null,"system");
			this.URLFilterAPI.ignore.add("||www.value-domain.com^*",null,"system");

			this.URLFilterAPI.allow.add("||whochan.com^*",null,"system");
			this.URLFilterAPI.allow.add("||facebook.com^*.whochan.com^*",null,"system");   //Facebook
		//	this.URLFilterAPI.allow.add("||twitter.com^*whochan.com*",null,"system");      //Twitter
		//	this.URLFilterAPI.allow.add("||platform.twitter.com/widgets.js?far",{resources:2},"system");         //Twitter
		//	this.URLFilterAPI.allow.add("||platform.twitter.com/widgets/tweet_button.*",{resources:32},"system");         //Twitter
		//	this.URLFilterAPI.ignore.add("||platform.twitter.com/*",null,"system");         //Twitter
			this.URLFilterAPI.allow.add("*^ca-pub-2973873345332642^*",null,"system");      //Google
			this.URLFilterAPI.allow.add("*^t=whochan-22^*",null,"system");                 //Amazon


			this.ElementMaskAPI.add("hide","*:*","a[href*=\"npn.co.jp\"]","system");//ゆるさん
			this.URLFilterAPI.block.add("||npn.co.jp^*",null,"system");//ゆるさん
			this.URLFilterAPI.block.add("||npnisspamnewssite.xxx^*",null,"system");

		},

		// AdBlock Plus フィルタの解析正規表現
		parser :
		{

			rule        : /^(\@\@)?(.*?)(?:\$(.*)|(\#\@?\#)(.*))?$/,// #hoge example.com#@#hoge → ~example.com##hoge と同義 : 未実装
			reverse     : /^\~/,
			domain      : /^domain\=/,
			comment     : /(^!|^\[.*\]$|^\@\@.*\$elemhide$)/,                         // ! : コメント | [コメント] | $elemhide...未実装
			meta        : /^! (Homepage|Title|Version|Expires|Last modified): (.*)$/, // メタデータ

		},

		// リソース定数
		typemap     : WHO.URLFilterAPI.typemap,
		reversetype : (function()
		{
			var reversetype = 0;
			for(var t in WHO.URLFilterAPI.typemap)
			{
				reversetype |= WHO.URLFilterAPI.typemap[t];
			}
			return reversetype;
		})(),

		//------------------------------------------------------------------------------------//

		/* Get preferences of ContentBlockHelper : 設定の取得 */
		//プライベートタブでもちゃんと取得できたら本当は必要ないんだけどね
		// chrome.tabs.insertCSS よりもページに <script>を流し込む方がメモリを消費しない

		getPrefs : function(origin,tab,config)
		{

			var prefs =
			{
				shortcutkey     : config.shortcutkey,
				SiteCSS         : "",
				CSSRules        : [],
			};

			/* CSS 規則を適用 */

			if(!config.temporary.disabled && !WHO.ElementMaskAPI.isDisabledTab(tab))
			{

				var rule = WHO.URLFilterAPI.getMatchedRule({type:"top",src:origin,tab:tab?tab.url:origin,page:origin})||{};

				if(rule.act !== "ignore")
				{

					prefs.CSSRules = this.ElementMaskAPI.getRules(origin,["cus"],false);

				}
			}

			return prefs;

		},

		//------------------------------------------------------------------------------------//
		/* すべての機能を無効にする */

		disableAll : function()
		{

			this.URLFilterAPI.suspend();
			this.ElementMaskAPI.suspend();

		},

		enableAll : function()
		{

			this.URLFilterAPI.resume();
			this.ElementMaskAPI.resume();

		},


		//------------------------------------------------------------------------------------//

		/* 簡易フィルタを適用する */

		applyEasyBlock : function()
		{

			/* 標準の簡易フィルタ */
			var SimpleFilter = JSON.parse(WHO.extension.storage.getItem('SimpleFilter'))||{};

			this.quickTypes.forEach(function(resource)//for(var resource in SimpleFilter)
			{

				var domains =
				{
					dissimilar:[],// 1 : applies to dissmilar domains
					external  :[],// 3 : applies to external domains
					different :[],// 7 : applies to different hostname resources
					file      :[],//15 : applies to file resources
					all       :[],//31 : applies to all resources including inline
				};

				var excludeDomains = [];//一般設定から除外するドメイン

				var resources      = this.typemap[resource];
				var defaultLevel   = parseInt(SimpleFilter[resource]||0);
				var defaultOptions =
				{
					resources:resources,
				};
				var sitePrefs = JSON.parse(WHO.extension.storage.getItem('SimpleFilter_' + resource))||{};

				/* サイト別設定 */
				for(var domain in sitePrefs)
				{
					var level = parseInt(sitePrefs[domain]);
					if(level !== defaultLevel)
					{
						excludeDomains.push(domain);
						switch(level)
						{
						//	case 0  :                                        // 全て許可
							case 1  : domains.dissimilar.push(domain);break; // 似ていないドメインをブロック
							case 3  : domains.external.push(domain);break;   // 外部ドメインをブロック
							case 7  : domains.different.push(domain);break   // 異なるホストをブロック
							case 15 : domains.file.push(domain);break;       // ファイルをブロック
							case 31 : domains.all.push(domain);break;        // 全てをブロック
						}
					}
				}

				if(excludeDomains.length)
				{
					/* 全てブロック */
					if(domains.all.length)
					{

						this.URLFilterAPI.block.add("*:*",{resources:resources,includeDomains:domains.all},"auto");

					}
					/* ファイルをブロック */
					if(domains.file.length)
					{

						this.URLFilterAPI.block.add("*:*",{resources:resources,includeDomains:domains.file,level:15},"auto");

					}
					/* 異なるホストをブロック */
					if(domains.different.length)
					{

						this.URLFilterAPI.block.add("*:*",{resources:resources,includeDomains:domains.different,level:7},"auto");

					}
					/* 外部ドメインをブロック */
					if(domains.external.length)
					{

						this.URLFilterAPI.block.add("*:*",{resources:resources,includeDomains:domains.external,level:3},"auto");

					}
					/* 似ていないドメインをブロック */
					if(domains.dissimilar.length)
					{

						this.URLFilterAPI.block.add("*:*",{resources:resources,includeDomains:domains.dissimilar,level:1},"auto");

					}

					defaultOptions.excludeDomains = excludeDomains;

				}

				/* 一般設定 */
				//全てブロック
				if(defaultLevel & 16)
				{

					this.URLFilterAPI.block.add("*:*",defaultOptions,"auto");

				}
				else
				if(defaultLevel)
				{

					defaultOptions.level = defaultLevel;
					this.URLFilterAPI.block.add("*:*",defaultOptions,"auto");

				}

			},this);

		},

		/* 簡易フィルタを無効にする */

		terminateEasyBlock : function()
		{

			this.URLFilterAPI.removeAll("auto");

		},


		//------------------------------------------------------------------------------------//

		/* 詳細フィルタを有効にする */

		enableCustomizations : function()
		{

			this.loadUserCSSRules();

			var CustomFilter = JSON.parse(WHO.extension.storage.getItem('CustomFilter'))||{};

			["ignore","block","allow"].forEach(function(act)//for(var act in CustomFilter)
			{
				(CustomFilter[act]||[]).forEach(function(rule)//for(var i = 0,rule;rule = CustomFilter[act][i];++i)
				{

				//	this.URLFilterAPI[act].add(rule.pattern,rule.options||{},"cus");
					this.URLFilterAPI[act].add(rule.pattern,
					{
						level:rule.level,
						types:rule.types,
						includeDomains:rule.includeDomains,
						excludeDomains:rule.excludeDomains,
					},"cus");

				},this);
			},this);

		},

		/* 詳細フィルタを無効にする */

		disableCustomizations : function()
		{

			this.URLFilterAPI.removeAll("cus");
			this.ElementMaskAPI.removeAll("cus");//スタイル規則のリセット

		},

		/* 詳細セレクター規則を適用する */

		loadUserCSSRules : function()
		{

			this.ElementMaskAPI.removeAll("cus");//スタイル規則のリセット

			var CSSRules = JSON.parse(WHO.extension.storage.getItem('CSSRules'))||{};
			for(var pattern in CSSRules)
			{
				for(var i = 0;i < CSSRules[pattern].length;++i)
				{
					this.ElementMaskAPI.add("hide",pattern,CSSRules[pattern][i],"cus");
				}

			}
		},

		/* 詳細 URL 規則を追加する */

		_addURLRule : function(act,pattern,options)
		{

			if(options && (options.thirdParty || options.firstParty))
			{
				options.level = options.level || 0;
				if(options.thirdParty)
				{
					options.level = options.level|3;
				}
				if(options.firstParty)
				{
					options.level = options.level|12;
				}
			}

			var foptions = this.URLFilterAPI.getFormalRuleOptions(options);

			var behavior = JSON.parse(WHO.extension.storage.getItem('behavior'))||{alwayssync:false};

			var CustomFilter = JSON.parse(WHO.extension.storage.getItem('CustomFilter'))||
			{
				block :[],
				allow :[],
				ignore:[],
			};

			//新しい規則に includeDomains が有って includeDomains と excludeDomains 以外同じ規則が既にある時
			// 既にある規則に includeDomains も excludeDomains も無い→追加しない（全てのサイトに適用されるから）
			// 既にある規則に includeDomains が有る→ 既にある規則に includeDomains を追加
			// 既にある規則に excludeDomains が有る→ 既にある規則の excludeDomains から削除

			//新しい規則に excludeDomains
			// 既にある規則に includeDomains も excludeDomains も無い→ 追加しない（全てのサイトに適用されるから）
			// 既にある規則に excludeDomains が有る→
			// 既にある規則に includeDomains が有る→

			//新しい規則に includeDomains も excludeDomains も無い
			// 既にある規則に includeDomains か excludeDomains がある→ 古い規則は削除

			for(var i = 0,rule;rule = CustomFilter[act][i];++i)
			{

				var rfoptions = this.URLFilterAPI.getFormalRuleOptions(rule);

				if(rule.pattern === pattern &&//同じパターン
					(act === "ignore" ||
						(
							((!rfoptions.level && !foptions.level) || rfoptions.level === foptions.level) &&
							((!rfoptions.resources && !foptions.resources) || rfoptions.resources === foptions.resources)//同じリソース
						)
					)
				)
				{
					/* includeDomains の結合 */
					if(rule.includeDomains)
					{
						//既存の規則が全てのドメインに追加の時 → 追加しない
						if(!rule.includeDomains && !rule.excludeDomains)
						{

							return;

						}
						else
						//includeDomains に追加
						if(rule.includeDomains)
						{

							for(var d = 0,domain;domain = rule.includeDomains[d];++d)
							{
								if(options.includeDomains.indexOf(domain) < 0)
								{

									options.includeDomains.push(domain);

								}
							}

						}
						else
						//excludeDomains から削除
						if(rule.excludeDomains)
						{
							for(var d = 0,domain;domain = rule.excludeDomains[d];++d)
							{
								if(options.includeDomains.indexOf(domain) < 0)
								{

									options.excludeDomains = options.excludeDomains||[];
									options.excludeDomains.push(domain);

								}
							}
							delete options.includeDomains;
						}

					}
					else
					/* excludeDomains の結合 */
					if(options.excludeDomains)
					{
						if(!rule.includeDomains && !rule.excludeDomains)
						{

							return;

						}
						else
						if(rule.excludeDomains)
						{

							var excludeDomains = [];
							for(var d = 0,domain;domain = rule.excludeDomains[d];++d)
							{
								if(options.excludeDomains.indexOf(domain) > -1)
								{

									excludeDomains.push(domain);

								}
							}
							options.excludeDomains = excludeDomains;
							if(options.excludeDomains.length === 0)
							{
								delete options.excludeDomains;
							}

						}
						else

						if(rule.includeDomains)
						{

							for(var d = 0,domain;domain = rule.includeDomains[d];++d)
							{
								var idx = options.excludeDomains.indexOf(domain);
								if(idx > -1)
								{
									options.excludeDomains.splice(idx,1);
								}
							}

							if(options.excludeDomains.length === 0)
							{
								delete options.excludeDomains;
							}

						}

					}

					/* 既存の規則は削除 */
					CustomFilter[act].splice(i,1);

					if(this.URLFilterAPI[act].isInRules(pattern,rfoptions,"cus"))
					{
						this.URLFilterAPI[act].remove(pattern,rfoptions,"cus");
					}

					break;

				}

			}

			/* 詳細フィルタに追加 */

			CustomFilter[act].push(this.getExactRule(act,pattern,options));

			/* URLFilter を適用 */

			this.URLFilterAPI[act].add(pattern,options,"cus");

			WHO.extension.storage.setItem('CustomFilter',JSON.stringify(CustomFilter));

		},

		/* 詳細 URL 規則を削除する */

		_removeURLRule : function(act,pattern,options)
		{

			if(options && (options.thirdParty || options.firstParty))
			{
				options.level = options.level || 0;
				if(options.thirdParty)
				{
					options.level = options.level|3;
				}
				if(options.firstParty)
				{
					options.level = options.level|12;
				}
			}

			var add = false;

			var foptions = this.URLFilterAPI.getFormalRuleOptions(options);

			var behavior = JSON.parse(WHO.extension.storage.getItem('behavior'))||{alwayssync:false};

			var CustomFilter = JSON.parse(WHO.extension.storage.getItem('CustomFilter'))||
			{
	 			block :[],
	 			allow :[],
				ignore:[],
			};

			//includeDomains が有って includeDomains と excludeDomains 以外同じ規則がある時
			// includeDomains も excludeDomains も無い→excludeDomains を追加
			// includeDomains が有る→includeDomains から削除
			// excludeDomains が有る→excludeDomains を追加 

			//excludeDomains
			// includeDomains も excludeDomains も無い→
			// excludeDomains が有る→
			// includeDomains が有る→

			for(var i = 0,rule;rule = CustomFilter[act][i];++i)
			{

				var rfoptions = this.URLFilterAPI.getFormalRuleOptions(rule);

				if(rule.pattern === pattern &&
					(act === "ignore" ||
						(
							((!rfoptions.level && !foptions.level) || rfoptions.level === foptions.level) &&
							((!rfoptions.resources && !foptions.resources) || rfoptions.resources === foptions.resources)//同じリソース
						)
					)
				)
				{

					if(options.includeDomains)
					{

						if(!rule.includeDomains && !rule.excludeDomains)
						{

							options.excludeDomains = options.includeDomains;
							delete options.includeDomains;
							add = true;

						}
						else
						// includeDomains から除去
						if(rule.includeDomains && rule.includeDomains.sort().join("|") !== options.includeDomains.sort().join("|"))
						{

							var includeDomains = [];
							for(var d = 0,domain;domain = rule.includeDomains[d];++d)
							{
								if(options.includeDomains.indexOf(domain) < 0)
								{
									includeDomains.push(domain);
								}
							}
							if(includeDomains.length > 0)
							{
								options.includeDomains = includeDomains;
								add = true;
							}

						}
						else
						// excludeDomains に追加
						if(rule.excludeDomains)
						{

							options.excludeDomains = options.includeDomains;
							for(var d = 0,domain;domain = rule.excludeDomains[d];++d)
							{
								if(options.includeDomains.indexOf(domain) < 0)
								{

									options.excludeDomains.push(domain);

								}
							}
							delete options.includeDomains;
							add = true;

						}

					}
					else
					if(options.excludeDomains)
					{
						if(!rule.includeDomains && !rule.excludeDomains)
						{

							options.includeDomains = options.excludeDomains;
							delete options.excludeDomains;
							add = true;

						}
						else
						if(rule.excludeDomains && rule.excludeDomains.sort().join("|") !== options.excludeDomains.sort().join("|"))
						{

							options.includeDomains = [];
							for(var d = 0,domain;domain = options.excludeDomains[d];++d)
							{
								if(rule.excludeDomains.indexOf(domain) < 0)
								{

									options.includeDomains.push(domain);

								}
							}
							if(options.includeDomains.length > 0)
							{
								delete options.excludeDomains;
								add = true;
							}

						}
						else
						if(rule.includeDomains)
						{

							options.includeDomains = [];
							for(var d = 0,domain;domain = options.excludeDomains[d];++d)
							{
								if(rule.includeDomains.indexOf(domain) > -1)
								{

									options.includeDomains.push(domain);

								}
							}
							if(options.includeDomains.length > 0)
							{
								delete options.excludeDomains;
								add = true;
							}

						}

					}

					CustomFilter[act].splice(i,1);

					if(this.URLFilterAPI[act].isInRules(pattern,rfoptions,"cus"))
					{
						this.URLFilterAPI[act].remove(pattern,rfoptions,"cus");
					}

					break;

				}
			}

			if(add)
			{

				CustomFilter[act].push(this.getExactRule(act,pattern,options));

				this.URLFilterAPI[act].add(pattern,options,"cus");

			}
			else
			if(this.URLFilterAPI[act].isInRules(pattern,options,"cus"))
			{

				this.URLFilterAPI[act].remove(pattern,options,"cus");

			}

			WHO.extension.storage.setItem('CustomFilter',JSON.stringify(CustomFilter));

		},

		getExactRule : function(act,pattern,options)
		{

			var formal = {pattern:pattern};

			if(options)
			{

				if(act !== "ignore")// filter type : [specific_resources,generic_resources,specific_selector,generic_selector]
				{

					// resource types
					if(options.types     !== undefined){formal.types = options.types;}
					if(options.resources !== undefined && options.types === undefined)
					{
						formal.types = [];
						this.typeList.forEach(function(type,i)
						{
							if(options.resources & (1 << i))
							{
								formal.types.push(type);
							}
						},this);
					}

					// Hosting level
					if(options.level          !== undefined){formal.level          = options.level;         }
					if(options.thirdParty)
					{
						formal.level = 3;
					}
					else
					if(options.firstParty)
					{
						formal.level = 12;
					}

					if(options.includeDomains !== undefined){formal.includeDomains = options.includeDomains;}
					if(options.excludeDomains !== undefined){formal.excludeDomains = options.excludeDomains;}

				}

			}

			return formal;

		},

		//------------------------------------------------------------------------------------//
		/* 遮断規則の追加 */

		addBlockRule : function(pattern,options)
		{

			this._addURLRule("block",pattern,options);

		},

		/* 遮断規則の削除 */

		removeBlockRule : function(pattern,options)
		{

			this._removeURLRule("block",pattern,options);

		},

		//------------------------------------------------------------------------------------//
		/* 許可規則の追加 */

		addAllowRule : function(pattern,options)
		{

			this._addURLRule("allow",pattern,options);

		},

		/* 許可規則の削除 */

		removeAllowRule : function(pattern,options)
		{

			this._removeURLRule("allow",pattern,options);

		},

		//------------------------------------------------------------------------------------//
		/* 黙認規則の追加 */

		addIgnoreRule : function(pattern,options)
		{

			this._addURLRule("ignore",pattern,options);

		},

		/* 黙認規則の追加 */

		removeIgnoreRule : function(pattern,options)
		{

			this._removeURLRule("ignore",pattern,options);

		},

		//------------------------------------------------------------------------------------//

		/* セレクター規則の追加 */

		addCSSRules : function(origin,selector)
		{

			var exist = this.ElementMaskAPI.isExist("hide",origin,selector);

			if(!exist)
			{

				var pattern = origin + "/*";

				this.ElementMaskAPI.add("hide",pattern,selector,"cus");

				var CSSRules = JSON.parse(WHO.extension.storage.getItem('CSSRules'))||{};

				CSSRules[pattern] = CSSRules[pattern] || [];
				CSSRules[pattern].push(selector);

				WHO.extension.storage.setItem('CSSRules',JSON.stringify(CSSRules));

			}

		//	var behavior = JSON.parse(WHO.extension.storage.getItem('behavior'))||{alwayssync:false};
		//	if(behavior.alwayssync)
		//	{
		//		Sync.addCSSRule(origin + "/*",rule,function(){});
		//	}

		},

		/* セレクター規則を削除する */

		removeCSSRules : function(origin,selector)
		{

		//	var behavior = JSON.parse(WHO.extension.storage.getItem('behavior'))||{alwayssync:false};
			var CSSRules = JSON.parse(WHO.extension.storage.getItem('CSSRules'))||{};

			for(var pattern in CSSRules)
			{

				var reg = this.URLFilterAPI.getParsedURLPattern(pattern);

				if(reg.test(origin))
				{
					var hit = CSSRules[pattern].indexOf(selector);

					if(hit > -1)
					{
						CSSRules[pattern].splice(hit,1);
					}

					this.ElementMaskAPI.remove("hide",pattern,selector,"cus");

				//	if(behavior.alwayssync)
				//	{
				//		Sync.removeCSSRule(url,selector,function(){});
				//	}

				}

			}

			WHO.extension.storage.setItem('CSSRules',JSON.stringify(CSSRules));

		},

		//------------------------------------------------------------------------------------//

		/* 購読フィルタを有効にする */

		enableSubscriptions : function(callback)
		{
			var self = this;
			var wait = 0;

			this.ElementMaskAPI.removeAll("sub");//スタイルフィルタのリセット

			var behavior     = JSON.parse(WHO.extension.storage.getItem('behavior'))||{subscribeinterval:10};
			var PublicFilter = JSON.parse(WHO.extension.storage.getItem('PublicFilter'))||[];
			var now = (new Date()).getTime();

			PublicFilter.forEach(function(sub,i)//for(var i = 0,sub;sub = PublicFilter[i];++i)
			{
			//	console.info(sub.url);
				//use が true の時
				if(!sub.title || sub.use)
				{
					++wait;
				}

			},this);

			// 読み込む購読リストがない時

			if(wait === 0)
			{
				callback();
			}

			for(var i = 0,sub;sub = PublicFilter[i];++i)
			{

				if(!sub.title || sub.use)
				{

					var err = (function(sub){return function()
					{

						if(sub.use)
						{
							//以前のデータを利用する
							console.info("Use exist rules",sub.title);

							self.applySubscriptions(sub);

						}

						if(--wait === 0)
						{
							wait = null;
							callback();
						}

					}})(sub);

					// 更新
					// title が無いのは古いフォーマットなので更新する

					if(!sub.title || (sub.use && ((sub.update||0) + (behavior.subscribeinterval||0) * 1000 * 60 * 60 * 24) < now))
					{

					//	console.info(sub.url);

						WHO.XHR(
						{
							url:sub.url,
							/* 読み込み成功 */
							callback:(function(sub){return function(r)
							{

							//	console.log("ok:"+sub.url);

								var lines = r.responseText.split(/\r?\n/);//テキストファイル

								var ignore = [];
								var block  = [];
								var allow  = [];
								var hide   = [];
								var show   = [];

								//AdBlock Plus
								if(/\[Adblock Plus (1\.[1-9]|[2-9](?:\.[0-9]+)+)\]/.test(lines[0]))
								{
									for(var i = 0;i < lines.length;++i)
									{

										/* フィルタを解析 */

										var rule = self.parseABPrule(lines[i]);

										/* メタデータ */

										if(rule.meta)
										{

											switch(rule.meta)
											{
												case "Title"    : sub.title    = rule.data;break;
												case "Homepage" : sub.homepage = rule.data;break;
											}

											continue;
										}

										/* コメントは読み飛ばす */

										if(rule.act === "com"||!rule.act||!sub.use) {continue;}

										/* 規則を追加 */

										if(sub.use)
										{

											// オプションの設定
											var options = undefined;

											if(rule.options)
											{
												options = {};
											//	if(rule.options.thirdParty)     options.tp = rule.options.thirdParty;
											//	if(rule.options.firstParty)     options.fp = rule.options.firstParty;
												if(rule.options.level)          options.l  = rule.options.level;
												if(rule.options.excludeDomains) options.ex = rule.options.excludeDomains;
												if(rule.options.includeDomains) options.in = rule.options.includeDomains;
												if(rule.options.resources)      options.r  = rule.options.resources;
											}

											switch(rule.act)
											{
												case "hide"   : hide.push({p:rule.pattern,u:rule.urls});break;
												case "show"   : show.push({p:rule.pattern,u:rule.urls});break;
												case "block"  : block.push({p:rule.pattern,o:options});break;
												case "allow"  : allow.push({p:rule.pattern,o:options});break;
												case "ignore" :
													ignore.push({p:rule.pattern});
													if(options)
													{
														allow.push({p:rule.pattern,o:options});
													}
													break;
											}

										}
									}
								}

								sub.title = sub.title||sub.url;// title を取得できないとき

								if(sub.use)
								{

									sub.block  = block;
									sub.allow  = allow;
									sub.ignore = ignore;
									delete sub.css;//古い設定を削除
									sub.hide   = hide;
									sub.show   = show;
									sub.update = (new Date()).getTime();

								}

								var size = JSON.stringify(sub).length;

								/* ストレージに保存 */
								try
								{
									WHO.extension.storage.setItem('PublicFilter',JSON.stringify(PublicFilter));
								}
								// 容量オーバー
								catch(e)
								{

									sub.use   = false;
									delete sub.block;
									delete sub.allow;
									delete sub.ignore;
									delete sub.css;//古い設定を削除
									delete sub.hide;
									delete sub.show;
									delete sub.update;
									WHO.extension.storage.setItem('PublicFilter',JSON.stringify(PublicFilter));

									if(e.code === 22)
									{
										console.info("Disabled",sub.title,size + "bytes",e.message);
										callback("Disable " + sub.title + " because " + e.message);
									}

								}

								/* フィルタを適用する */
								if(sub.use)
								{

									self.applySubscriptions(sub);
									console.info("Updated",sub.title,size + "bytes");

								}

								/* 全ての購読リストを読み込み終えた時 */
								if(--wait === 0)
								{

									wait = null;
									callback();

								}

							}})(sub),
							/* タイムアウト */
							ontimeout:err,
							onerror  :err,
							async    :true,
							wait     :30,
						});
					}
					else
					{

						err();

					}
				}
			}

		},

		/* 購読フィルタを無効にする */

		disableSubscriptions : function()
		{

			this.URLFilterAPI.removeAll("sub");
			this.ElementMaskAPI.removeAll("sub");//スタイルフィルタのリセット

		},

		/* 購読フィルタを適用する */

		applySubscriptions : function(sub)
		{

			["block","allow","ignore","hide","show"].forEach(function(act)
			{

				var rules = sub[act]||[];

				rules.forEach(function(rule)
				{

					var pattern  = rule.p;

					if(act === "hide")
					{
						this.setSubscribedCSSRules("hide",pattern,rule.u);
					}
					else
					if(act === "show")
					{
						this.setSubscribedCSSRules("show",pattern,rule.u);
					}
					else
					{

						var options = rule.o ?
						{
						//	"thirdParty"     : rule.o.tp,
						//	"firstParty"     : rule.o.fp,
							"level"          : rule.o.l,
							"includeDomains" : rule.o.in,
							"excludeDomains" : rule.o.ex,
							"resources"      : rule.o.r,
						}:null;

						if(act === "allow")
						{
							this.URLFilterAPI.allow.add(pattern,options,"sub");
						}
						else
						if(act === "block")
						{
							this.URLFilterAPI.block.add(pattern,options,"sub");
						}
						else
						if(act === "ignore")
						{
							this.URLFilterAPI.ignore.add(pattern,options,"sub");
						}

					}

				},this);

			},this);

		},

		/* 購読セレクター規則をセット */

		setSubscribedCSSRules : function(act,selector,urls)
		{
			/* 各々の URL 毎に規則を適用 */
			if(urls && urls.length > 0)
			{
				urls.forEach(function(url,i)
				{
					this.ElementMaskAPI.add(act,"||" + url + "^*",selector,"sub");
				},this);
			}
			else
			{
				this.ElementMaskAPI.add(act,"*",selector,"sub");
			}
		},

		//------------------------------------------------------------------------------------//
		/* AdBlock Plus 形式の規則を解析する */

		parseABPrule : function (line)
		{

			var filter =
			{
				act : "",
				pattern : "",
			};

			/* Meta data : メタデータ */
			// ! name: metadata

			if(this.parser.meta.exec(line))
			{
				filter.meta = RegExp.$1;
				filter.data = RegExp.$2;
			}

			else

			/* Comments : コメント */

			if(this.parser.comment.test(line))
			{
				filter.act = "com";
			}

			else

			/* Rule : フィルタの解析 */

			{

				var data    = line.match(this.parser.rule);
				var options = data[3] ? data[3].split(",") : [];//$option1,option2,option3...

				/* CSS フィルタ */

				if(data[4])
				{
					if(data[4] === "##")
					{
						filter.act = "hide";
					}
					else
					{
						filter.act = "show";
					}

					var urls = data[2] ? data[2].split(",") : [];
					var urlclass = ""

					// URL パターンの解析
					urls = urls.filter(function(url,i)//var i = 0;i < urls.length;i++)
					{
						// ~url : html:not([data-url=*"domain"]) URL の除外
						if(this.parser.reverse.test(url))
						{
							urlclass = urlclass + ':not([data-url*="' + (url.replace(this.parser.reverse,"")) + '"])';
							return false;
						}
						else
						{
							return true;
						}
					},this);

					if(urlclass !== "")
					{
						urlclass = "html" + urlclass + " ";
					}

					if(urls.length)
					{
						filter.urls = urls;
					}

					filter.pattern = urlclass + data[5];

				}

				else

				/* URL フィルタ */

				if(data[2])

				{
					var excludes = [] , includes = [] , reverses = 0 , resources = 0 , level = 0/*, thirdParty = false , firstParty = false*/;
					var pattern  = data[2];

					/* フィルタタイプ */

					if(data[1] === "@@")
					{
						filter.act = "allow";
					}
					else
					{
						filter.act = "block";
					}

					/* オプション */

					for(var i = 0,option;option = options[i];++i)
					{

						//黙認規則
						if(option === "document" && filter.act === "allow")
						{
							filter.act = "ignore";
						}
						else

						/* third-party first-patry */
						if(option === "third-party")
						{
						//	thirdParty = true;
							level = 3;
						}
						else
						if(option === "~third-party")
						{
						//	firstParty = true;
							level = 12;
						}
						else

						/* ドメイン */
						// $domain=example.com
						if(this.parser.domain.test(option))
						{
							var domains = option.split("=")[1].split("|");
							domains.forEach(function(domain)//for(var j = 0,domain;domain = domains[j];++j)
							{
								//excludeDomains に追加
								// ~domain : リバース
								if(this.parser.reverse.test(domain))
								{
									excludes.push(domain.replace(this.parser.reverse,""));
								}
								//includeDomains に追加
								else
								{
									includes.push(domain);
								}
							},this);
						}
						else

						/* リソース */
						//例外
						if(this.parser.reverse.test(option))
						{
							option = option.replace(this.parser.reverse,"");
							if(this.typemap[option])
							{
								reverses |= this.typemap[option];
							}
							//非対応オプション +10.0.1
							else
							{
								reverses |= this.typemap["dummy"];
							}
						}
						else
						//標準
						if(this.typemap[option])
						{
							resources |= this.typemap[option];
						}
						//非対応オプション +10.0.1
						else
						{
							resources |= this.typemap["dummy"]
						}
					}

					/* リソースから例外リソースを取り除く */
					if(reverses > 0)
					{
						resources = (this.reversetype ^ reverses) | resources;
					}

					/* 前後のワイルドカード */
					// 正規表現には非対応

					pattern = pattern.replace(/^[^\|\*]/,"*$&")
										.replace(/[^\|\*]$/,"$&*")
										.replace(/(^\|(?!\|)|\|$)/g,"")
										.replace(/^$/,"*");

					if(level || /*thirdParty || firstParty ||*/ resources || excludes.length || includes.length)
					{

						filter.options = {};

					//	if(thirdParty)
					//	{
					//		filter.options.thirdParty     = true;
					//	}
					//	if(firstParty)
					//	{
					//		filter.options.firstParty     = true;
					//	}
						if(level > 0)
						{
							filter.options.level = level;
						}
						if(excludes.length > 0)
						{
							filter.options.excludeDomains = excludes;
						}
						if(includes.length > 0)
						{
							filter.options.includeDomains = includes;
						}
						if(resources > 0)
						{
							filter.options.resources = resources;
						}
					}

					filter.pattern = pattern;
				}
			}

			return filter;

		},

	};

	//------------------------------------------------------------------------------------//
