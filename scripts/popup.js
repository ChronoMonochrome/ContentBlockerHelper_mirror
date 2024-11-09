var storage = WHO.extension.storage;
window.location.hash = "#SimpleFilter";

	var typemap={};

	var mainPage =
	{

		lock : false,//リソースリストの更新をロックする
		show : function(message)
		{

			typemap = message.typemap;

			var contents = message.resources;

			this.TAB      = message.tab; // tab の URL : 未使用
			this.URL      = message.page;// page の URL

			/* 簡易フィルタ */

			simpleFilter.start(message.page,contents);

			/* イベントフィルタ */

			UIProtect.start(message.page);

			/* ページフィルタ */

			var top = {};
			top[message.page + "$document"] = 
			{
				type      :"top",
				url       : message.page,
				loaded    :"loaded",
				isDocument: true,
				rule      : contents[message.page+"$document"]?contents[message.page+"$document"].rule:null,
			};//Opera では直接の親 Blink では タブ

			var topStar = new patternList(null,top);

			topStar.setContainer(ID('Filters'));
			topStar.openChildren();

			/* リソースフィルタ */

			this.resourcesList = new patternList(null,contents);

			this.resourcesList.setContainer(ID('Contents'));
			this.resourcesList.openChildren();

		},
		updateResources : function(message)
		{

			/* リソースフィルタ */

			if(!this.lock)
			{

				this.resourcesList.clear();
				this.resourcesList = new patternList(null,message.resources);//リソースリストを更新

				this.resourcesList.setContainer(ID('Contents'));
				this.resourcesList.openChildren();

			}

		//	this.lock = false;

		},

	};

	/**************************************************************************************/
	/* コンテンツを表示 */

	var typeList = 
	[
		"main_frame"       ,
		"sub_frame"        ,
		"script"           ,
		"stylesheet"       ,
		"font"             ,
		"image"            ,
		"audio"            ,
		"video"            ,
	//	"media"            ,
		"object"           ,
	//	"object-subrequest",
		"xmlhttprequest"   ,
		"ping"             ,
		"redirect"         ,
		"other"            ,
		"popup"            ,
	];

	//------------------------------------------------------------------------------------//

	var patternList = function(rule,contents,parent,superType)
	{

		this.container     = null;        // コンテナ要素
		this.badge         = null;        // バッジ
		this.listContainer = null;        // 子のリストのコンテナ要素
		this.contents      = contents;       // 含まれるリソース
		this.rule          = rule;           // 適用される規則
		this.parent        = parent;
		this.children      = [];             // 子リスト
	//	this.superType     = superType||"";  // 主位の規則型

		this.setSupertype();

		this.rules = {};

		return this;

	};

	patternList.regs =
	{

		A           : /[^\w\^]/g, // ^* を除く ASCII / URL に使える文字
		multiScheme : /^\\\|\\\|/,  // ||
		separator   : /\^/g,        // ^
		hostname    : /^(https?:\/\/|\|\|)([^\/\:\^\*]+)(?:\:\d*)?(?:([\/\^])(.*))?$/i,	//	scheme://hostname:port/ :[1:scheme,2:domain,3:"/"or"^",4:directory]
		split       : /(?:https?:\/\/|^\|\||[\^\/\:])/i,

	};

	patternList.prototype.setContainer = function(container)
	{

		this.listContainer = container;

	};

	patternList.prototype.clear = function()
	{

		var child = this.listContainer.firstChild;
		while(child)
		{

			this.listContainer.removeChild(child);
			child = this.listContainer.firstChild

		}

	};

	/* フィルタ毎にマッチテスト */

	patternList.prototype.getExistRule = function(src)
	{

	//	var src;// リソースの URL
		var newrule = null;

		var content = this.contents[src];
		var rule    = content.rule;// WHO.urlfilter に登録されている規則

		/* 読み込み状況を修正する */
		// 適合する規則がある時

		if(rule)
		{
			//OPR Native Filter
			if(rule.status["native"])
			{
				content.loaded = "blocked";
			}
			else
			//無効規則に当てはまるとき
			if(rule.act === "ignore" && !content.isDocument)
			{
				//読み込みエラー
				if(content.loaded === "failed" || content.loaded === "blocked")
				{

					content.loaded = "failed";

				}
				//ページが無視されている
				else
				{

					content.loaded = "ignored";

				}
			}
			else
			//読み込みエラー
			if(rule.act === "allow" && (content.loaded === "failed" || content.loaded === "blocked"))
			{

				content.loaded = "failed";

			}
			else
			//ブロック前に読み込まれた
			if(rule.act === "block" && content.loaded === "loaded")
			{

				content.loaded = "ignored";

			}
			else
			//ページ以外
			if(!content.isDocument || rule.act === "ignore")
			{

				var options = rule.options ?
				{
					resources      : rule.options.resources,
					level          : rule.options.level,
				//	thirdParty     : rule.options.thirdParty,
				//	firstParty     : rule.options.firstParty,
					includeDomains : rule.options.includeDomains,
					excludeDomains : rule.options.excludeDomains,
				}:null;

				var listed = rule.status["cus"]?"cus":rule.status["sub"]?"sub":rule.status["per"]?"per":rule.status["system"]?"sys":rule.status["bug"]?"sys":null;

				//既存の規則を使う
				if(listed||rule.act === "excluded")
				{

					content.loaded = rule.act==="block"?"blocked":rule.act==="allow"?"allowed":"loaded";

					newrule =
					{
						pattern    : rule.pattern,
						listed     : listed,
						act        : rule.act,
						options    : options,
						list       : [],
						loaded     : content.loaded,
						isDocument : content.isDocument,
					};

				}
				else
				if(content.loaded==="unknown" || content.loaded==="failed")
				{
					// 簡易ブロック
					if(rule.status["auto"])
					{
						content.loaded = "blocked";
					}
					else
					{
						content.loaded = "loaded";
					}
				}

			}
		}
		else
		//適用規則がないので多分読み込まれた
		if(content.loaded==="unknown")
		{

			content.loaded = "loaded";

		}
		else
		//適用規則がないのに読み込まれなかった
		if(content.loaded==="blocked")
		{

			content.loaded = "failed";

		}

		if(newrule)
		{

			/* 既存のルールにあるかどうか */

			if(this.rules[newrule.pattern])
			{
				for(var i = 0,rule;rule = this.rules[newrule.pattern][i];++i)
				{
					if(rule.listed === newrule.listed && rule.act === newrule.act
						&& ((!rule.options && !newrule.options)
							|| rule.options.resources === newrule.options.resources
						)
					)
					{
						newrule = rule;
					}
				}
			}

			if(newrule.list.length === 0)
			{
				this.rules[newrule.pattern] = this.rules[newrule.pattern] || [];
				this.rules[newrule.pattern].push(newrule);
			}

			return newrule;

		}

		return null;

	}

	/* 子規則を作成する */

	patternList.prototype.openChildren = function()
	{

		Object.keys(this.contents).forEach(function(src,i)
		{

			// src は常にユニーク値

			var content = this.contents[src];
			var newRule;
			var urlPattern = "";
			var options = {};
			var listed = content.rule?(content.rule.status["native"]?"opr":""):"";

			/* このリソースが既存の規則に合致するときは次のリソースへ */
			// ページの時
			if(content.isDocument)
			{
				if(!this.rule)
				{
					newRule = this.getExistRule(src);

					if(newRule&&newRule.act==="ignore")
					{
						return;
					}
				}
				else
				{
					if(this.rule.listed && !this.rule.act && this.getExistRule(src))
					{
						return;
					}
				}
			}
			else

			/* ルートの時 : 既存の規則を検索する */

			if(!this.rule)
			{

				newRule = this.getExistRule(src);

			}

			/* 既存の規則に適合するとき */
			if(newRule)
			{
				urlPattern = newRule.pattern;
				options    = newRule.options;
			}
			/* 既存の規則に適合しない時 */
			else
			{

				/* パターンの作成 */

				//新しいパターンを作る

				var parts = this.rule ? patternList.regs.hostname.exec(this.rule.pattern) : null;

				// ドメイン規則を作成
				// 最上位ルールであるか、親ルールがドメイン形式になっていないとき
				//parts[4] : ディレクトリ部分 -> "*" 意外

				if(!this.rule || !parts || (this.rule.listed && this.rule.listed !== "opr" && parts[4] !== "*"))
				{

					urlPattern = "||" + WHO.URL.getDomain(content.url) + "^*";

				}

				else

				// サブドメイン
				if(parts[2] !== WHO.URL.getHostname(content.url))
				{

					urlPattern = parts[1] + (new RegExp("(\\w[\\w\\-\\_]*\\." + (parts[2].replace(/\./g,"\\\.")) + ")(?:\\:\\d*)?(?=\\/|$)","i")).exec(content.url)[1] + parts[3] + parts[4];

				}

				else

				//ディレクトリを追加
				{

					var parentDomain = this.rule.pattern.replace(patternList.regs.separator,"/").replace(/\*$/i,"");
					urlPattern = content.url // .replace(/\$.*/,"")
								.replace(new RegExp(("^(" +
								parentDomain
									.replace(patternList.regs.A,"\\$&")
									.replace(patternList.regs.multiScheme,"\\w+://")
								+ ")([^/?#]+[/?#]).*$"),"i"),parentDomain + "$2*");

				}

				/* インラインコンテンツを分離 */
				// ver.11 から適用
				/*
				if(/\$(script|stylesheet)$/.test(src))
				{

					options.level = 16;

				}*/

			}

			newRule = newRule||{};

			//既存のパターンと同じ場合
			if(this.rules[urlPattern])
			{

				for(var r = 0,rule;rule = this.rules[urlPattern][r];++r)
				{
					if(
						(!rule.listed && !listed || rule.listed === listed)// 規則に無い
					&&
						(
							this.rule
						||
							(
						//		rule.options.level === options.level
						//	&&
								rule.loaded     === content.loaded
							&&
								rule.isDocument === content.isDocument
							)
						)
					)
					{

						newRule = rule;

						break;

					}
				}

			}

			/* 新しい規則を作成 */

			if(!newRule.pattern)
			{

				newRule =
				{
					act        : "",        //"block","allow","ignore"
					pattern    : urlPattern,//URL pattern
					options    : options,   //resources,level,includeDomains,excludeDomains,
					listed     : listed,    //"cus","sub"
					list       : [],        //この規則が適用されているリソースのリスト
					loaded     : this.rule ? this.rule.loaded     : content.loaded,
					isDocument : this.rule ? this.rule.isDocument : content.isDocument,
				};

				this.rules[urlPattern] = this.rules[urlPattern]||[];
				this.rules[urlPattern].push(newRule);

			}

			//使用していないオプションを追加
			if(!content.isDocument && urlPattern !== content.url)
			{

				newRule.options.offresources = newRule.options.offresources|typemap[content.type];

				var domain = WHO.URL.getDomain(content.page||mainPage.URL);

				if(
					(!newRule.options.domains || newRule.options.domains.indexOf(domain) < 0) &&
					(!newRule.options.includeDomains || newRule.options.includeDomains.indexOf(domain) < 0) &&
					(!newRule.options.excludeDomains || newRule.options.excludeDomains.indexOf(domain) < 0)
				)
				{
					newRule.options.domains      = newRule.options.domains||[];
					newRule.options.domains.push(domain);
				}

			}

			newRule.list.push(src);//この規則に解析中のリソースを追加

		},this);

		/* 作成した規則を表示 */

		for(var pattern in this.rules)
		{

			this.rules[pattern].forEach(function(rule,i,rules)
			{
				var mylist = {};
				rule.list.forEach(function(src,i,list)
				{
					if(
						!(
							(this.contents[src].url === rule.pattern)
						)
					)
					{
						mylist[src] = this.contents[src];
					}
				},this);

				var newList = new patternList(rule,mylist,this);
				this.children.push(newList);
				newList.createItem();

			},this);
		}

	};

	/* リストアイテムを表示 */
	patternList.prototype.createItem = function()
	{

		var rule = this.rule;
		var superType = this.superType;

		this._createItem();
		this.setBadge();

	};

	/* 自動ブロックのステータスを作成 */

	patternList.prototype._createItem = function()
	{
		var rule   = this.rule;

		/* コンテナ */

		var container = document.createElement(this.parent.listContainer.localName === "ul" ? 'li' : 'h2');
			container.setAttribute('class',"filter");
			container.setAttribute('data-isDocument',rule.isDocument);
			container.setAttribute('title',rule.pattern);

		this.container = container;

		/* バッジ */

		var badge = document.createElement('button');
			badge.setAttribute('type',"button");
			badge.setAttribute('class',"badge");
			badge.value    = rule.pattern;

		this.badge = badge;

			container.appendChild(badge);

		/*トグルボタン */

		var nob;

		if(Object.keys(this.contents).length > 0)
		{

			nob = document.createElement('input');
			nob.setAttribute('type',"checkbox");
			nob.setAttribute('class',"nob");
			nob.checked = false;
			container.insertBefore(nob,badge);

		}

		/* pattern の表示 */

		if(!this.parent.rule || this.parent.rule.pattern !== rule.pattern)
		{

			var patternContainer;

			if(Object.keys(this.contents).length > 0)
			{

				patternContainer = container;

			}
			//コンテンツへのリンク
			else
			{
				var a = document.createElement('a');
					a.href = rule.pattern;
					a.setAttribute('target',"_blank");
				container.appendChild(a);

				patternContainer = a;

			}

			var hostname = patternList.regs.hostname.exec(rule.pattern);

			if(hostname)
			{

				/* ホスト名を表示 */
				if(hostname[4] === "*" || !this.parent.rule)
				{
					var span = document.createElement('span');
						span.setAttribute('class',"hostname");
						span.appendChild(document.createTextNode(hostname[2]));
					patternContainer.appendChild(span);

					var img = document.createElement('img');
						img.setAttribute('width',"16");
						img.setAttribute('height',"16");
						img.setAttribute('src',"http://www.google.com/s2/favicons?domain=" + hostname[2]);
						badge.appendChild(img);

				}

				/* ディレクトリを表示 */
				if(hostname[3] !== "^" || hostname[4] !== "*")
				{

					//画像を表示
					var mycontent = this.parent.contents[rule.pattern];

					if(mycontent && (mycontent.loaded === "loaded" || mycontent.loaded === "allowed" || mycontent.loaded === "ignored") && (mycontent.type === "image" || mycontent.type === "audio" || mycontent.type === "video"))
					{
						if(mycontent.type === "image")
						{
							var img = document.createElement('img');
								img.setAttribute('src',rule.pattern);
								img.setAttribute('height',"16");
							//	img.setAttribute('width',"32");
							//	img.setAttribute('style',"display:block;");
							patternContainer.appendChild(img);
						}
						else
						if(mycontent.type === "audio")
						{
							var audio = document.createElement('audio');
								audio.setAttribute('src',rule.pattern);
							//	audio.setAttribute('controls',"controls");
								audio.setAttribute('style',"height:16px");
								patternContainer.addEventListener('mouseover',function(e){this.play();}.bind(audio));
								patternContainer.addEventListener('mouseout',function(e){this.pause();}.bind(audio));
							patternContainer.appendChild(audio);
							patternContainer.appendChild(document.createTextNode("AUDIO"));
						}
						else
						if(mycontent.type === "video")
						{
							var video = document.createElement('video');
								video.setAttribute('src',rule.pattern);
							//	video.setAttribute('controls',"controls");
								video.setAttribute('height',"16");
								video.addEventListener('mouseover',function(e){e.target.play();});
								video.addEventListener('mouseout',function(e){e.target.pause();});
							patternContainer.appendChild(video);
						}
					}
					else
					{
						patternContainer.appendChild(document.createTextNode("/" + hostname[4]));
					}
				}

			}

			/* pattern 全てを表示 */

			else
			{

				patternContainer.appendChild(document.createTextNode(rule.pattern));

			}

		}

		/* オプション */

		if(rule.options)
		{

			/* リソースのリスト */

			if(rule.options.resources || rule.options.offresources)
			{

				typeList.forEach(function(type,i)//for(var i = 0,type;type = typeList[i];++i)
				{

					if(this.rule.options.resources & typemap[type] || this.rule.options.offresources & typemap[type])
					{

						var rimg = document.createElement('img');
							rimg.setAttribute('class',"option resource");
							rimg.setAttribute('src',"images/types/" + type + ".png");
							rimg.setAttribute('title',WHO.locale.get("Rule::type::" + type));

						container.appendChild(rimg);

						// loaded な規則ではリソースは暗転
						if(this.rule.options.resources & typemap[type])
						{
							rimg.setAttribute('data-apply',"true");
						//	this.rule.options.resources = this.rule.options.resources ^ typemap[type];
						}

						rimg.addEventListener('click',this.switchResource.bind(this,type),false);

					}

				},this);

			}

			/* 適用ドメイン */

			if(rule.options.includeDomains && rule.options.includeDomains.length > 0)
			{

				rule.options.includeDomains.forEach(function(domain,i,includeDomains)
				{

					this.createDomainButton(domain,"includeDomains");

				},this);

			}

			if(rule.options.level)
			{
				["foreign","similar","related","same","inline"].forEach(function(level,i)
				{
					var host = document.createElement('span');
						host.setAttribute('class',"host");
						host.setAttribute('title',WHO.locale.get("Rule::host::" + level));
						if(rule.options.level & (1 << i))
						{
							host.setAttribute('data-apply',"true");
						}
					container.appendChild(host);
				},this);
			}

			/* 除外ドメイン */

			if(rule.options.excludeDomains && rule.options.excludeDomains.length > 0)
			{

				rule.options.excludeDomains.forEach(function(domain,i,excludeDomains)
				{

					this.createDomainButton(domain,"excludeDomains");

				},this);

			}

			/* このリソースが読み込まれているドメインを追加 */

			if(!this.rule.isDocument && rule.options.domains)
			{

				rule.options.domains.forEach(function(domain,i)
				{

					this.createDomainButton(domain,"");

				},this);

			}

		}

		/* リソース数 */

		if(!rule.isDocument)
		{
			container.appendChild(document.createTextNode(" ("+rule.list.length+")"));
		}

		/* 子リスト */

		if(nob)
		{

			/* 自動作成 */
			if(this.parent.rule && this.parent.rule.pattern && this.parent.rule.list && this.parent.rule.list.length === rule.list.length)
			{
				nob.checked = true;
				this.listContainer = document.createElement('ul');
				container.appendChild(this.listContainer);

				this.openChildren();
			}
			else
			{

				var self = this;
				/* 子リストを作成 */
				var childFunction = function(e)
				{

					self.listContainer = document.createElement('ul');
					container.appendChild(self.listContainer);

					self.openChildren();

					nob.removeEventListener('click',childFunction,false);

				};

				nob.addEventListener('click',childFunction,false);

			}
		}

		/* 親コンテナに追加 */

		if(this.parent.listContainer.localName === "ul")
		{
			this.parent.listContainer.appendChild(container);
		}
		else
		{
			this.parent.listContainer.insertBefore(container,this.parent.listContainer.firstElementChild);
		}

		/* 規則の種類を切り替える */

		badge.addEventListener('click',this.switchStatus.bind(this),false);

	};

	//------------------------------------------------------------------------------------//

	/* 適用ドメインボタンを作る : include -> off -> exclude */
	// type : "includeDomains" , "excludeDomains"

	patternList.prototype.createDomainButton = function(domain,type)
	{

		var img = document.createElement('img');
			img.setAttribute('src',"http://www.google.com/s2/favicons?domain=" + domain);
			img.setAttribute('width',"16");
			img.setAttribute('height',"16");

		var button = document.createElement('button');
			button.setAttribute('type',"button");
			button.setAttribute('class',"option domain");
			button.setAttribute('value',domain);
			button.appendChild(img);

		if(!type)
		{
			button.setAttribute('title',domain);
		}
		else
		{
			button.setAttribute('data-apply',"true");
			button.setAttribute('data-type',type);
			if(type === "includeDomains")
			{
				button.setAttribute('title',"Include at \"" + domain + "\".");
			}
			else
			{
				button.setAttribute('title',"Exclude at \"" + domain + "\".");
			}
		}

		this.container.appendChild(button);

		button.addEventListener('click',this.switchDomain.bind(this,domain,button),false);

	};

	/* 適用リソースを切り替える */

	patternList.prototype.switchResource = function(type,e)
	{

		mainPage.lock = !this.rule.isDocument;

		var target = e.target;

		// 規則にない時だけ変更可能

		if(!this.badge.disabled && this.rule.loaded !== "ignored" && (!this.rule.listed || this.rule.listed === "cus" || this.rule.act === "block"))
		{
			/* いったん規則を削除 */
			if(this.rule.listed === "cus")
			{
				if(this.rule.act === "allow")
				{
					WHO.extension.postMessage('ContentBlockHelper',{method:"UpdateRule",execute:"removeAllowRule",pattern:this.rule.pattern,options:this.rule.options});
				}
				else
				{
					WHO.extension.postMessage('ContentBlockHelper',{method:"UpdateRule",execute:"removeBlockRule",pattern:this.rule.pattern,options:this.rule.options});
				}
			}

			// on にする
			if(!target.hasAttribute('data-apply'))
			{
				if(!this.rule.options.resources)
				{
					this.rule.options.resources = 0;
				}
				this.rule.options.resources = this.rule.options.resources | typemap[type];
				target.setAttribute('data-apply',"true");
			}
			else
			// off にする
			if(this.rule.listed === "cus" || !this.rule.listed)
			{
				target.removeAttribute('data-apply');
				this.rule.options.resources = this.rule.options.resources ^ typemap[type];
				if(this.rule.options.resources === 0)
				{
					delete this.rule.options.resources;
				}
			}


			/* 規則を削除 */
			if(
				!this.rule.options.resources && !this.rule.options.includeDomains && !this.rule.options.excludeDomains
			)
			{
				//再読み込みすべき
				this.updateSelf();

			}
			else
			/* 修正した詳細規則を追加 */
			if(
				this.rule.act === "allow" || this.superType === "block" ||
				(this.rule.loaded === "blocked" && !this.rule.listed) || 
				(this.rule.listed === "sub" && this.rule.act === "block")
			)
			{

				this.rule.listed = "cus";
				this.rule.act    = "allow";
				WHO.extension.postMessage('ContentBlockHelper',{method:"UpdateRule",execute:"addAllowRule",pattern:this.rule.pattern,options:this.rule.options});

			}
			else
			{

				this.rule.listed = "cus";
				this.rule.act    = "block";
				WHO.extension.postMessage('ContentBlockHelper',{method:"UpdateRule",execute:"addBlockRule",pattern:this.rule.pattern,options:this.rule.options});
			}

			this.setBadge();
			this.changeChildrenStatus();

		}
	};

	//------------------------------------------------------------------------------------//

	/* 適用ドメインを切り替える */

	patternList.prototype.switchDomain = function(domain,target,e)
	{

		mainPage.lock = !this.rule.isDocument;

		e.preventDefault();

	//	var target = e.target;

		if(!this.badge.disabled && this.rule.loaded !== "ignored" && (!this.rule.listed || this.rule.listed === "cus" || this.rule.act === "block"))
		{

			var clickedType = target.getAttribute('data-type');

			//いったん規則を削除
			if(this.rule.listed === "cus")
			{
				if(this.rule.act === "allow")
				{
					WHO.extension.postMessage('ContentBlockHelper',{method:"UpdateRule",execute:"removeAllowRule",pattern:this.rule.pattern,options:this.rule.options});
				}
				else
				{
					WHO.extension.postMessage('ContentBlockHelper',{method:"UpdateRule",execute:"removeBlockRule",pattern:this.rule.pattern,options:this.rule.options});
				}
			}

			/* いったん includeDomains,excludeDomains を削除 */
			if(target.getAttribute('data-apply'))
			{
				//includeDomains から削除
				if(clickedType === "includeDomains")
				{
					this.rule.options.includeDomains.splice(this.rule.options.includeDomains.indexOf(domain),1);
					if(this.rule.options.includeDomains.length === 0)
					{
						delete this.rule.options.includeDomains;
					}
				}
				else
				//excludeDomains から削除
				if(clickedType === "excludeDomains")
				{
					this.rule.options.excludeDomains.splice(this.rule.options.excludeDomains.indexOf(domain),1);
					if(this.rule.options.excludeDomains.length === 0)
					{
						delete this.rule.options.excludeDomains;
					}
				}
				target.removeAttribute('data-apply');
				target.setAttribute('title',domain);
			}

			var ex = false;

			/* includeDomains に追加 */
			if(
				!this.rule.listed ||                                                       // 規則未設定の時
				(!clickedType && this.rule.options.includeDomains) || // 詳細-遮断:未設定 → includeDomains が有るとき
				this.rule.listed === "sub"                                                 // 購読-遮断 → 詳細-許可に追加
			)
			{
				this.rule.options.includeDomains = this.rule.options.includeDomains || [];
				this.rule.options.includeDomains.push(domain);
				target.setAttribute('data-type',"includeDomains");
				target.setAttribute('title',"Include at \"" + domain + "\".");
				target.setAttribute('data-apply',"true");
			}
			else
			/* excludeDomains に追加 */
			// 既存の規則 → includeDomains が空の時
			if
			(
				!clickedType && !this.rule.options.includeDomains
			)
			{

				var ex = true;

				this.rule.options.excludeDomains = this.rule.options.excludeDomains || [];
				this.rule.options.excludeDomains.push(domain);
				target.setAttribute('data-type',"excludeDomains");
				target.setAttribute('title',"Exclude at \"" + domain + "\".");
				target.setAttribute('data-apply',"true");
			}
			// includeDomains,excludeDomains → 削除
			else
			{
				target.removeAttribute('data-type');
			}

			/* 規則を削除 */
			if(
				clickedType === "includeDomains" && !this.rule.options.includeDomains && !this.rule.options.excludeDomains
			)
			{
				//再読み込みすべき
				this.updateSelf();

			}
			else
			/* 許可規則に追加 */
			if
			(
				this.rule.act === "allow" || this.superType === "block" ||
				(this.rule.loaded === "blocked" && !this.rule.listed) ||
				(this.rule.listed === "sub" && this.rule.act === "block")
			)
			{

				this.rule.listed = "cus";
				this.rule.act    = "allow";
				WHO.extension.postMessage('ContentBlockHelper',{method:"UpdateRule",execute:"addAllowRule",pattern:this.rule.pattern,options:this.rule.options});

			}
			else
			/* 遮断規則を追加 */
			{

				this.rule.listed = "cus";
				this.rule.act    = "block";
				WHO.extension.postMessage('ContentBlockHelper',{method:"UpdateRule",execute:"addBlockRule",pattern:this.rule.pattern,options:this.rule.options});

			}

			this.setBadge();
			this.changeChildrenStatus();

		}
	};

	//------------------------------------------------------------------------------------//
	/* 規則の種類を変更・追加・削除 */
	// ステータスボタンをクリックした時発火

	patternList.prototype.switchStatus = function()
	{

		mainPage.lock = !this.rule.isDocument;

		var loaded    = this.rule.loaded;
		var isDocument= this.rule.isDocument;
		var listed    = this.rule.listed;
		var act       = this.rule.act;
		var superType = this.superType;

		/* 許可規則を削除 */
		//認可規則にある時

		if(act === "allow")
		{
			var self = this;

			WHO.extension.postMessage('ContentBlockHelper',{method:"UpdateRule",execute:"removeAllowRule",pattern:this.rule.pattern,options:this.rule.options});

			this.updateSelf();

		}
		else
		{

			/* 詳細フィルタを変更 */

			if(listed === "cus")
			{

				/* 黙認規則を削除 */

				if(act === "ignore")
				{

					this.rule.listed = "";
					this.rule.act    = "";

					WHO.extension.postMessage('ContentBlockHelper',{method:"UpdateRule",execute:"removeIgnoreRule",pattern:this.rule.pattern,options:this.rule.options});

					WHO.extension.sendRequest('ContentBlockHelper',{method:"getMatchedRule",resource:{type:"top",src:window.location.href,tab:window.location.href,page:window.location.href}},function(rule)
					{
						if(!rule || rule !== "ignore")
						{
							ID('Filters').removeAttribute('data-ignored');
						}

					});

				}

				else

				/* 遮断規則を削除 */

				if(act === "block")
				{

					WHO.extension.postMessage('ContentBlockHelper',{method:"UpdateRule",execute:"removeBlockRule",pattern:this.rule.pattern,options:this.rule.options});

					this.updateSelf();

				}

			}

			else

			/* 黙認規則を追加 */

			if(isDocument)
			{

	 			this.rule.listed = "cus";
	 			this.rule.act    = "ignore";

				WHO.extension.postMessage('ContentBlockHelper',{method:"UpdateRule",execute:"addIgnoreRule",pattern:this.rule.pattern,options:this.rule.options});

			}
			else

			/* 許可規則に追加 */
			//ブロックされているとき
			//購読 : 禁止規則にあるとき

			if(act === "block" || superType === "block" || loaded === "blocked" || loaded === "allowed")
			{

				this.rule.listed = "cus";
				this.rule.act    = "allow";

				WHO.extension.postMessage('ContentBlockHelper',{method:"UpdateRule",execute:"addAllowRule",pattern:this.rule.pattern,options:this.rule.options});

			}
			else

			/* 禁止規則に追加 */
			//リストにないとき
			//旧 : 許可規則にあるとき
		//	if(loaded)
			{

				this.rule.listed = "cus";
				this.rule.act    = "block";

				WHO.extension.postMessage('ContentBlockHelper',{method:"UpdateRule",execute:"addBlockRule",pattern:this.rule.pattern,options:this.rule.options});

			}

			this.setBadge();
			this.changeChildrenStatus();

		}

	//	//黙認規則の時→リソースリストを更新
	//	if(isDocument)
	//	{
	//		WHO.extension.sendRequest('getActiveResources',{method:"update"},mainPage.updateResources.bind(mainPage));
	//	}

	};

	patternList.prototype.updateSelf = function()
	{

		WHO.extension.sendRequest('ContentBlockHelper',
		{
			method:"testRule",
			pattern:this.rule.pattern,
			options:this.rule.options
		},function(message)
		{

			//公開リストの禁止規則に変更
			if(message.listed === "sub")
			{
				this.rule.listed = "sub";
				this.rule.act    = "block";
			}
			else
			//自作リストの禁止規則に変更
			if(message.listed === "cus")
			{
				this.rule.listed = "cus";
				this.rule.act    = "block";
			}
			else
			if(this.rule.loaded === "blocked" && this.rule.act !== "block")
			{
				this.rule.listed = "";
				this.rule.act    = "";
			}
			else
			if(this.rule.loaded === "loaded")
			{
				this.rule.listed = "";
				this.rule.act    = "";
			}
			else
			{
				mainPage.lock = false;
			//	this.rule.listed = "";
			//	this.rule.act    = "";
			//	WHO.extension.sendRequest('getActiveResources',{method:"update"},mainPage.updateResources.bind(mainPage));
			//	WHO.extension.postMessage('ContentBlockHelper',{method:"updateResourcesState"});// リソースの表示を切り替える
			}

			this.setBadge();
			this.changeChildrenStatus();

		}.bind(this));
	};

	/* 子孫の規則を書き換える */

	patternList.prototype.changeChildrenStatus = function()
	{
		this.children.forEach(function(child,i)
		{

			child.rule.loaded = this.rule.loaded;
			child.setSupertype();
			child.setBadge();
			child.changeChildrenStatus();

		},this);
	};

	//------------------------------------------------------------------------------------//

	/* Super-Type を再設定する */

	patternList.prototype.setSupertype = function()
	{

		this.superType = "";

		if(this.parent)
		{
			if(this.parent.superType === "ignore" || (this.parent.rule && this.parent.rule.act === "ignore"))
			{
				this.superType = "ignore";
			}

			else

			if(this.parent.superType === "allow" || (this.parent.rule && this.parent.rule.act === "allow"))
			{
				this.superType = "allow";
			}

			else

			if(this.parent.superType === "block" || (this.parent.rule && this.parent.rule.act === "block"))
			{

				this.superType = "block";

			}
		}

	};

	/* バッジのステータスを再設定する */

	patternList.prototype.setBadge = function()
	{

		var rule = this.rule;
		var superType = this.superType;

		/* 黙認規則 */

		if(rule.act === "ignore")
		{

			ID('Filters').setAttribute('data-ignored',"ignored");

			this.container.setAttribute('data-listed',rule.listed);
			this.container.setAttribute('data-rule-act',"ignore");
			this.badge.disabled = rule.listed !== "cus";//自作以外は変更不可

			this.badge.setAttribute('title',WHO.locale.get("Contents::Ignored"));

		}

		else

		if(superType === "ignore")
		{

			this.container.setAttribute('data-listed',"");
			this.container.setAttribute('data-rule-act',"ignore");
			this.badge.disabled = true;

			this.badge.setAttribute('title',WHO.locale.get("Contents::Ignored"));

		}

		else

		/* 許可規則 */

		//購読 : 変更不可
		//自前 : 削除可

		if(rule.act === "allow")
		{

			this.container.setAttribute('data-listed',rule.listed);
			this.container.setAttribute('data-rule-act',"allow");
			this.badge.disabled = rule.listed !== "cus";//自作以外は変更不可

			if(rule.listed === "sub")
			{
				this.badge.setAttribute('title',WHO.locale.get("Contents::Allowed::Subscribed"));
			}
			else
			if(rule.listed === "sys")
			{
				this.badge.setAttribute('title',WHO.locale.get("Contents::Allowed"));
			}
			else
			{
				this.badge.setAttribute('title',WHO.locale.get("Contents::Allowed::Customized"));
			}

		}

		else

		//新 : 変更不可
		//旧 : 禁止規則で上書き可

		if(superType === "allow")
		{

			this.container.setAttribute('data-listed',"");
			this.container.setAttribute('data-rule-act',"allow");
			this.badge.disabled = true;

			this.badge.setAttribute('title',WHO.locale.get("Contents::Allowed"));

		}
		else

		//恒久 : 変更不可
		//公開 : 許可規則で上書き可
		//自作 : 削除可

		if(rule.act === "block")
		{

			this.container.setAttribute('data-listed',rule.listed);
			this.container.setAttribute('data-rule-act',"block");
			this.badge.disabled = rule.listed === "per" && WHO.extension.isOpera;

			if(rule.listed === "sub")
			{
				this.badge.setAttribute('title',WHO.locale.get("Contents::Blocked::Subscribed"));
			}
			else
			if(rule.listed === "sys")
			{
				this.badge.setAttribute('title',WHO.locale.get("Contents::Blocked"));
			}
			else
			{
				this.badge.setAttribute('title',WHO.locale.get("Contents::Blocked::Customized"));
			}

		}

		else

		/* 遮断規則 */
		//新 : 許可規則で上書き可
		//旧 : 変更不可

		if(superType === "block")
		{

			this.container.setAttribute('data-listed',"");
			this.container.setAttribute('data-rule-act',"block");
			this.badge.disabled = this.parent.listContainer.parentNode.querySelector("button").disabled||false;

			this.badge.setAttribute('title',WHO.locale.get("Contents::Blocked"));

		}
		else

		/* 未登録 */

		{

			this.container.setAttribute('data-listed',rule.listed);
			this.container.setAttribute('data-rule-act',"");

			if(rule.isDocument)
			{
				this.badge.setAttribute('title',WHO.locale.get("Contents::Document"));
			}
			else
			//OPR
			if(rule.listed === "opr")
			{
				this.badge.setAttribute('title',WHO.locale.get("Contents::Blocked::Native"));
				this.badge.disabled = true;
			}
			else
			//簡易ブロック
			if(rule.loaded === "blocked")
			{
				this.badge.setAttribute('title',WHO.locale.get("Contents::Blocked::Auto"));
			}
			else
			if(rule.loaded === "ignored")
			{
				this.badge.setAttribute('title',WHO.locale.get("Contents::Ignored"));
				this.badge.disabled = true;
			}
			else
			if(rule.loaded === "loaded")
			{
				this.badge.setAttribute('title',WHO.locale.get("Contents::Loaded"));
			}
			else
			//読み込み失敗
			if(rule.loaded === "failed")
			{
				this.badge.setAttribute('title',WHO.locale.get("Contents::Failed"));
				this.badge.disabled = true;
			}

		}
		this.container.setAttribute('data-loaded',this.rule.loaded);

	};

	//------------------------------------------------------------------------------------//

/****************************************************************************************************/
/* main                                                                                             */

/* ポップアップが開いた時 */


WHO.locale.translate("configurations/lang.json",function(dic)
{

	WHO.extension.sendRequest('getActiveResources',{method:"open"},mainPage.show.bind(mainPage));
	WHO.extension.addMessageListener('setResources',mainPage.updateResources.bind(mainPage));

});

/****************************************************************************************************/
