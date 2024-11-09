// Copyright (c) 2012-2016 by FAR/RAKUDA All Rights Reserved

/****************************************************************************************************/
/* ContentBlockHelper FilterMaker                                                                   */
/*
	Makes rules by GUI on WebPages
                                                                                                    */
/****************************************************************************************************/

var WHO = WHO || {};

	/**************************************************************************************/

	WHO.FilterMaker = function(CSSRules)
	{

		var self = this;

		this.CSSRules = CSSRules||[];

		/* 初期設定 */

		this.mode            = null; //現在のブロックモード
		this.targetElement   = null; //マウスカーソルのあるエレメント
		this.blockContainers = [];


		/* 設定の読み込み */

		this.selectionElement = "span";

		this.clickElementHandler = function(e){self.showCSSRulesSelector(e)};
		this.mouseoverHandler    = function(e){self.elementMouseover(e)};
		this.mouseoutHandler     = function(e){self.elementMouseout(e)};

		/* 言語ファイルの読み込み */

		this.lang = {};
	//	WHO.extension.getLocaleFile("configurations/clientlang.json",function(file)
	//	{
	//		self.lang = JSON.parse(file)||{};
	//		console.log(self.lang);
	//	});

		WHO.extension.sendRequest('ContentBlockHelper',{method:"getClientLang"},function(message)
		{

			self.lang = message.lang;

		});

		this.resumeBlocking = function(e)
		{

			WHO.extension.sendRequest('ContentBlockHelper',{method:"changeMode",mode:""});

		}

		window.addEventListener('unload',this.resumeBlocking);

		return this;

	};

	/**************************************************************************************/

	//------------------------------------------------------------------------------------//
	/* 規則追加モードを開始する */

	WHO.FilterMaker.prototype.enterAppendMode = function(mode,URLRules)
	{

		/* 以前のマウスオーバースタイルを元に戻す */

		if(this.targetElement)
		{
			this.targetElement.style.background = this.background;
			this.targetElement = null;
		}

		this.targetRule = null;
		this.URLRules   = URLRules||
		{
			ignore : {},
			allow  : {},
			block  : {},
		};

		/* ブロックする対象を切り替えたとき→いったん消す */

		this.clearHelperContainers();

		this.mode = mode;//コンテナが重複しないように。

		/* 自作リスト用のセレクターを表示 */

		if(!this.selector)
		{
			this.createRuleSelector();
		}

		if(mode === "css")
		{

			var regA = /[^\w*]/g;
			var regB = /\*/g;

			/* 自作 CSS 規則を取得 */

			WHO.extension.sendRequest('ContentBlockHelper',{method:"getCSSRules"},(function(self){return function(message)
			{

				self.myCSSRules = [];
				var CSSRules = JSON.parse(message.CSSRules)||{};
				for(var url in CSSRules)
				{
					if((new RegExp("^" + (url.replace(regA,"\\$&").replace(regB,".*")) + "$")).test(window.location.href))
					{
						self.myCSSRules = self.myCSSRules.concat(CSSRules[url]);
					}
				}

				if(!self.overcursor)
				{
					self.createOvercursor();
				}

				document.body.addEventListener('click',    self.clickElementHandler,false);
				document.body.addEventListener('mouseover',self.mouseoverHandler,false);
				document.body.addEventListener('mouseout', self.mouseoutHandler,false);
			}})(this));

		}
		else
		{

			/* ブロックされた要素を表示する */

			WHO.ContentBlockHelper.reloadElementResources(document.body.querySelectorAll('iframe[data-cbh-blocked],embed[data-cbh-blocked],audio[data-cbh-blocked],video[data-cbh-blocked],object[data-cbh-blocked],img[data-cbh-blocked]'));

			/* 恒久リストを追加するためのフレームを表示 */
			// Opera

			var iframes = document.body.querySelectorAll('iframe');
			var embeds  = document.body.querySelectorAll('embed');
			var audios  = document.body.querySelectorAll('audio');
			var videos  = document.body.querySelectorAll('video');
			var objects = document.body.querySelectorAll('object');
			var imgs    = document.body.querySelectorAll('img');

			if(mode === "iframe")
			{

				this.visibleElementChromes(iframes);
				this.visibleElementChromes(embeds,true);
				this.visibleElementChromes(audios,true);
				this.visibleElementChromes(videos,true);
				this.visibleElementChromes(objects,true);
				this.visibleElementMasks(imgs);

			}
			else
			if(mode === "module")
			{

				this.visibleScriptsInHead();

			}
			else
			if(mode === "script")
			{

				this.visibleScriptsOfCreater();

			}
			else
			if(mode === "linkedcontents")
			{

				this.visibleElementChromes(iframes);
				this.visibleElementChromes(embeds,true);
				this.visibleElementChromes(audios,true);
				this.visibleElementChromes(videos,true);
				this.visibleElementChromes(objects,true);
				this.visibleElementMasks(imgs);
				this.visibleScriptsInHead();
				this.visibleScriptsOfCreater();

			}
		}

	};

	/* ブロックを終了する */

	WHO.FilterMaker.prototype.leaveAppendMode = function()
	{

		if(this.targetElement)
		{
			this.targetElement.style.background = this.background;
			this.targetElement = null;
		}

		if(this.mode)
		{

			/* 恒久リスト追加用コンテナをクリア */

			this.clearHelperContainers();

			/* 自作リスト用セレクタを削除 */

			this.deleteRuleSelector();
			this.deleteOvercursor();

			/* CSS ブロックを適用 */

			WHO.extension.postMessage('ContentBlockHelper',{method:"updateResourcesState"});
			window.removeEventListener('unload',this.resumeBlocking);

		}

		delete this.myCSSRules;
		delete this.URLRules;

	};

	/* ヘルパーコンテナを全て削除する */

	WHO.FilterMaker.prototype.clearHelperContainers = function()
	{
		if(this.mode === "css")
		{

			//CSS
			document.body.removeEventListener('click',    this.clickElementHandler,false);
			document.body.removeEventListener('mouseover',this.mouseoverHandler,false);
			document.body.removeEventListener('mouseout', this.mouseoutHandler,false);

		}
		else
		if(this.mode)
		{

			var containers = this.blockContainers;

			containers.forEach(function(container,i,myArray)//for(var i=0,container=null;container=containers[i];i++)
			{
				var next = container.nextElementSibling;
				if(next)
				{
					var nextStyle = window.getComputedStyle(next,"");
					if(next.style.position == "relative" && nextStyle.getPropertyValue('top') == "auto" && nextStyle.getPropertyValue('left') == "auto" && nextStyle.getPropertyValue('bottom') == "auto" && nextStyle.getPropertyValue('right') == "auto")
					{
						next.style.position = "";
					}
				}
				container.parentNode.removeChild(container);
			});

			this.blockContainers = [];

		}

		this.mode = null;//コンテナが重複しないように
//		window.removeEventListener('mousemove',this.clearListener,false);
	};

	//------------------------------------------------------------------------------------//

	/* マスクを作成 */

	WHO.FilterMaker.prototype.visibleElementMasks = function(imgs)
	{

		var scheme = /^https?:\/\//i;

		for(var i=0,element;element=imgs[i];i++)
		{

			var src = element.src||element.data;

			if(scheme.test(src)/* && element.offsetParent*/)
			{
				var mask = this.appendMask(element,src,"yellow");
			}

		}

	};

	/* 外枠を作成 */

	WHO.FilterMaker.prototype.visibleElementChromes = function(elements,outside)
	{

		var scheme = /^https?:\/\//i;

		for(var i=0,element;element=elements[i];i++)
		{

			var src = element.src||element.data;

			if(scheme.test(src)/* && element.offsetParent*/)
			{
				var mask = this.appendChrome(element,src,"blue",14,outside);
			}

		}

	};

	/* head 内スクリプトを視覚化 */

	WHO.FilterMaker.prototype.visibleScriptsInHead = function()
	{

		var head = document.getElementsByTagName('head')[0];
		var scripts = document.getElementsByTagName('head')[0].getElementsByTagName('script');

		var container = this.createInstantiatedContainer();
			container.style.display  = "block";
			container.style.position = "fixed";
			container.style.top      = "0";
			container.style.width    = "100%";

		var scheme = /^https?:\/\//i;
		for(var i=0,element;element=scripts[i];i++)
		{

			var src  = element.src;

			if(src && scheme.test(src))
			{
				var mask = this.createMask(src,"green","script");
				container.appendChild(mask);
			}

		}

		document.documentElement.appendChild(container);

		this.blockContainers.push(container);

	};

	/* script を視覚化 */

	WHO.FilterMaker.prototype.visibleScriptsOfCreater = function(elements)
	{
		var scheme = /^https?:\/\//i;
		var container;

		//script

		var scripts = document.body.getElementsByTagName('script');//全ての script 要素

		for(var i=0,element;element=scripts[i];i++)
		{

			// 外部スクリプト
			if(element.src && scheme.test(element.src))
			{

				var src  = element.src.match(/^[^?]+/)[0];

				/* script に続く要素を探す */

				var next = undefined,tmp = element;

				while(tmp.nextElementSibling && !next)
				{
					tmp = tmp.nextElementSibling;
					if((tmp.offsetParent) || (tmp.localName === "script" && tmp.src))
					{
						next = tmp;
					}
				}

				//要素の前方にある script

				if(next)
				{
					// script の次の要素の外周に表示
					if(next.offsetParent)
					{
						// 要素の外周に表示
						if(container)
						{

							this.appendInstantiatedContainer(container,next,"olive");
							container.style.height = "auto";
							container.style.top = (parseInt(container.style.top) - container.offsetHeight) + "px";
							container = undefined;

							this.appendChrome(next,src,"red",20);
						}
						// script の次の要素の外周に表示
						else
						{

							this.appendChrome(next,src,"red",20);

						}
					}
					else
					{

						// コンテナ作成
						container = container || this.createInstantiatedContainer();
						var instance = this.createMask(src,"brown","script");
						container.appendChild(instance);

					}
				}

				//要素の後方にある script

				else// if(element.offsetParent)
				{
					/// script を含む親要素の最初の子要素の上部に表示
					if(container)
					{
						var instance = this.createMask(src,"brown","script");
						container.appendChild(instance);

						// コンテナの追加
						this.appendInstantiatedContainer(container,element.parentNode.firstElementChild,"purple");
					//	container.style.top = (parseInt(container.style.top) + container.nextSibling.offsetHeight) + "px";
						container.style.top = (parseInt(container.style.top) + container.offsetHeight) + "px";
						container.style.height = "auto";
						container = undefined;

					}
					// script を含む親要素の上部に表示
					else
					{
						var instance = this.appendMask(element.parentNode,src,"purple");
							instance.style.top = (parseInt(instance.style.top) + parseInt(instance.style.height)) + "px";
							instance.style.height        = "16px";
							instance.style.zIndex        = "65534";
					}
				}
			}
		}
	};

	/* マスクコンテナ */

	WHO.FilterMaker.prototype.createMask = function(src,color,tagName)
	{

		var mask = document.createElement(this.selectionElement);
			mask.setAttribute("data-cbh-dummy","dummy");

			mask.appendChild(document.createTextNode(src.match(/https?:\/\/([^?]+)/)[1]))

			mask.setAttribute('title',src);
			mask.style.display       = "block";
			mask.style.overflow      = "hidden";
			mask.style.zIndex        = "65533";
			mask.style.width         = "100%";
			mask.style.height        = "16px";
			mask.style.fontFamily    = "arial";
			mask.style.fontSize      = "12px";
			mask.style.lineHeight    = "12px";
			mask.style.textAlign     = "left";
			mask.style.letterSpacing = "normal";
			mask.style.background    = "transparent";
			mask.style.color         = "white";
			mask.style.margin        = "0";
			mask.style.padding       = "0";
			mask.style.border        = "none";
			mask.style.boxShadow     = "inset 0 12px 10px " + color + ",inset 0 -12px 10px " + color;
			mask.addEventListener('click',    (function(block){return function(e){block.showURLPatternSelector(e,src,tagName);}})(this),false);
			mask.addEventListener('mouseover',(function(block){return function(e){block.hideRuleSelector(e);}})(this),false);

		return mask;

	};

	/* マスクを表示 */

	WHO.FilterMaker.prototype.appendMask = function(element,src,color)
	{

		var mask = this.createMask(src,color,element.tagName.toLowerCase());

		this.adjustPosition(element,mask);

		document.documentElement.appendChild(mask);

		this.blockContainers.push(mask);

		return mask;

	};

	/* 外枠を追加 */

	WHO.FilterMaker.prototype.appendChrome = function(element,src,color,width,outside)
	{

		var border = (width / 2) + "px";

		//左
		var left = this.appendMask(element,src,color);
			left.style.boxShadow = "inset " + border + " 0 " + border + " " + color + "";
			left.style.width  = width + "px";

		if(outside)
		{
			left.style.left   = (parseInt(left.style.left) - width) + "px";
		}

		//右
		var right = this.appendMask(element,src,color);
			right.style.boxShadow = "inset -" + border + " 0 " + border + " " + color + "";

		if(outside)
		{
			right.style.left   = (parseInt(right.style.left) + parseInt(right.style.width)) + "px";
		}
		else
		{
			right.style.left   = (parseInt(right.style.left) + parseInt(right.style.width) - width) + "px";
		}

			right.style.width  = width + "px";

		//下
		var bottom = this.appendMask(element,src,color);
			bottom.style.boxShadow = "inset 0 -" + border + " " + border + " " + color + ",inset " + border + " 0 " + border + " " + color + ",inset -" + border + " 0 " + border + " " + color + "";

		if(outside || parseInt(bottom.style.height) <= width * 2)
		{
			bottom.style.top    = (parseInt(bottom.style.top) + parseInt(bottom.style.height)) + "px";
		}
		else
		{
			bottom.style.top    = (parseInt(bottom.style.top) + parseInt(bottom.style.height) - width) + "px";
		}

			bottom.style.height = width + "px";

		//上
		var top = this.appendMask(element,src,color);
			top.style.boxShadow = "inset 0 " + border + " " + border + " " + color + ",inset " + border + " 0 " + border + " " + color + ",inset -" + border + " 0 " + border + " " + color + "";

		if(outside || parseInt(top.style.height) <= width * 2)
		{
			top.style.top    = (parseInt(top.style.top) - width) + "px";
		}

			top.style.height = width + "px";

	};

	/* script 用コンテナ */

	WHO.FilterMaker.prototype.appendInstantiatedContainer = function(container,element,color)
	{

		var scripts = container.getElementsByTagName(this.selectionElement);

		for(var i = 0,instance;instance = scripts[i];i++)
		{

			instance.style.boxShadow     = "inset 0 12px 10px " + color + ",inset 0 -12px 10px " + color;

		}

		this.adjustPosition(element,container);

		document.documentElement.appendChild(container);

		this.blockContainers.push(container);

	};

	WHO.FilterMaker.prototype.createInstantiatedContainer = function()
	{

		var container = document.createElement('div');
			container.setAttribute("data-cbh-dummy","dummy");

	//		container.style.position   = "absolute";
			container.style.zIndex     = "65534";
			container.style.width      = "auto";
			container.style.height     = "auto";
			container.style.fontSize   = "12px";
			container.style.lineHeight = "0";
			container.style.background = "transparent";

		return container;

	};

	//------------------------------------------------------------------------------------//
	/* URL規則を選択する */

	WHO.FilterMaker.prototype.showURLPatternSelector = function(e,src,tagName)
	{
		var self = this;

		var rules = [];
		var whitelisted = false;

		var resource = 
		{
			"iframe":(1 <<  1),
			"script":(1 <<  6),
			"style" :(1 <<  7),
			"img"   :(1 <<  9),
			"audio" :(1 << 10),
			"video" :(1 << 11),
			"object":(1 << 12),
			"embed" :(1 << 12),
		}[tagName];

		/* 既存ルール */
		var regA           = /[\s\!\"\#\$\%\&\'\(\)\+\,\-\.\/\:\;\<\=\>\?\@\[\\\]\_\`\{\|\}\~]/g; //^を除く特殊文字
		var regWildcard    = /\*/g;
		var regMultiScheme = /^\\\|\\\|/;	// ||
		var regSeparator   = /\^/g;		// ^

 		var myIndexs = src.split(/(?:^https?:\/\/|[^\*a-z0-9])/gi);
	//	var index;

		myIndexs[0] = "*";

		for(var act in {allow:"",block:""})
		{

			myIndexs.some(function(index,idx)//for(var idx = 0;idx < myIndexs.length;++idx)
			{

			//	index = myIndexs[idx];
				if(this.URLRules[act][index])
				{

					return this.URLRules[act][index].some(function(rule,i)//for(var i = 0;i < this.URLRules[act][index].length;++i)
					{
					//	var rule = this.URLRules[act][index][i];

						var reg = new RegExp("^" + rule.pattern
									.replace(regA,"\\$&")
									.replace(regWildcard   ,".*")
								//	.replace(regSeparator  ,"[\\!\\\"\\#\\$\\&\\'\\(\\)\\*\\+\\,\\/\\:\\;\\<\\=\\>\\?\\@\\[\\\\\\]\\^\\`\\{\\|\\}\\~]")
									.replace(regSeparator  ,"[^\\w\\d\\-\\_\\.\\%]")
									.replace(regMultiScheme,"^\\w+://(\\w[\\w\\_\\-]*\\.)*?")
									 + "$","i");

						if(reg.test(src))
						{

							//購読リストの許可規則に含まれているときは表示しない
							if(!rule.options || !rule.options.resources || rule.options.resources & resource)
							{

								if(act === "allow")
								{

									rules = [
									{
										pattern : rule.pattern,
										status  : rule.status,
										act     : "allow",
										options : rule.options,
									}];

									whitelisted = true;

									return true;;

								}

								if(rule.status["cus"] || rule.status["sub"])
								{
									rules.push(
									{
										pattern : rule.pattern,
										status  : rule.status,
										act     : act,
										options : rule.options,
									});
								}

							}

						}
					},this);
				}
			},this);
		}

		/* ルール作成 */

		if(!whitelisted)
		{
			src = src.replace(/\?.*$/,"");
			var dirs = src.match(/(^https?:\/\/|[^\/]+?\/|[^\/]+?$)/g);
			var subs = dirs[1].match(/([^\/\*\:\.][^\/\*\:\.]+\.(?:\w{2}\.\w{2}|\w+)(?=(?:\:\d*)?\/)|[^\.]+\.)/g);

			//ホストネーム
			var pattern = "";
			for(var i = subs.length - 1;i >= 0;--i)
			{
				pattern = subs[i] + pattern;
				rules.push(
				{
				//	pattern : dirs[0] + "*." + pattern + "*",
					pattern : "||" + pattern + "^*",
					status  : {},
					options : {resources:resource},
				});
			}

			//ディレクトリ
			var pattern = dirs[1];
			for(var i = 2;i < dirs.length - 1;i++)
			{
				pattern = pattern + dirs[i];
				rules.push(
				{
					pattern : "||" + pattern + "*",
					status  : {},
					options : {resources:resource},
				});

			}

			//フルパス
			rules.push(
			{
				pattern : src.replace(/[#?].*$/,"*"),
				status  : {},
				options : {resources:resource},
			});

		}

		/* ルール表示 */

		this.selectorSlider.value = 0;
		this.selectorSlider.setAttribute('max',rules.length - 1);

		this.createSelectorItem(rules[0]);

		var slideFunction = function()
		{
			var rule = rules[self.selectorSlider.value];

			self.createSelectorItem(rule);
		};
		this.selectorSlider.addEventListener('input',slideFunction,false);

		var applyFunction =(function(){return function(e)
		{

			var rule = rules[self.selectorSlider.value];

			if(rule.act === "block")
			{
				if(rule.status["cus"])
				{
					self.updateRule("removeBlockRule",rule.pattern,rule.options);
				}
				else
				if(rule.status["sub"])
				{
					self.updateRule("addAllowRule",rule.pattern,rule.options);
				}
			}
			else
			// 許可規則の削除
			if(rule.act === "allow")
			{
				if(rule.status["cus"])
				{
					self.updateRule("removeAllowRule",rule.pattern,rule.options);
				}
			}
			else
			// 規則の追加
			{
				self.updateRule("addBlockRule",rule.pattern,rule.options) || self.updateRule("addAllowRule",rule.pattern,rule.options);
			}

			self.hideRuleSelector(document.body);

			hideHandler();

			e.preventDefault();

			WHO.extension.sendRequest('ContentBlockHelper',{method:"changeMode",mode:""});

		}})();

		this.selectorButton.addEventListener('click',applyFunction,false);

		//セレクターからマウスが外れたとき

		var hideHandler = (function(){return function(e)
		{
			self.selectorSlider.removeEventListener('input',slideFunction,false);
			self.selectorButton.removeEventListener('click',applyFunction,false);
			document.body.removeEventListener('mouseover',arguments.callee,true);
		}})();

		document.body.addEventListener('mouseover',hideHandler,true);

		this.showRuleSelector(e);

	};

	/* 規則の追加 */

	WHO.FilterMaker.prototype.updateRule = function(execute,pattern,options)
	{

		if(confirm(this.lang["Confirm::" + execute] + "\n\n" + pattern))
		{

			WHO.extension.postMessage('ContentBlockHelper',{method:"UpdateRule",execute:execute,pattern:pattern,options:options});
			return true;

		}

	};

	//------------------------------------------------------------------------------------//
	/* CSS 規則を選択する */

	WHO.FilterMaker.prototype.showCSSRulesSelector = function(e)
	{
		e.preventDefault();

		this.removeOptions();

		this.isSelected = false;

		var element = this.targetElement;

		var rules = this.getNewCSSSelectors(element);

		if(element.hasAttribute('href'))
		{
			rules.unshift(element.tagName.toLowerCase() + '[href^="' + element.href.toString().match(/https?:\/\/.*\//) + '"]');
		}

		if(rules.length > 0)
		{
			this.setCSSRulesToSelector(rules);

			this.showRuleSelector(e);
		}

	};

	/* CSS 規則の候補を作成する */

	WHO.FilterMaker.prototype.getNewCSSSelectors = function(element)
	{
		var attrs     = ["name","type","width","height","tabindex","data-userid"];
		var current   = element;
		var selectors = [];//規則の候補
		var ancestors = [];//祖先
		var parents   = [];//親

		var unique = "body";

				/**/
				function addNode(node)
				{
					if(selectors.indexOf(node) < 0)
					{
						selectors.push(node);
					}
				}

		var nodes = [];

		while(current)
		{

			//html 要素の時

			if(current.nodeType === 1)
			{

				nodes.unshift(current);

			}

			current  = current.parentNode;	//親要素へ

		}

		//ルート要素から子要素へ順にチェック
		for(var n = 1,current;current = nodes[n];++n)
		{

			var myAncestors = ancestors.concat();//現在のループでの祖先要素
			var myParents = parents.concat();//現在のループでの親要素
			var parents   = [];//次のループでの親要素を示す
			var root = "";

			var tagName = current.localName;	//現在の要素名
			var num = 0;

			var classes = [];
			var subclass = "";//複合型クラス .hoge.fuga

			/* class 属性がある時 */
			//current.class > branch
			if(current.hasAttribute('class'))
			{
				var _classes  = current.getAttribute("class").split(" ");//class をスペースで分解
				for(var i = 0,CLASS;CLASS = _classes[i];++i)
				{
					if(/^[\w\-]+$/i.test(CLASS))
					{
						classes.push("." + CLASS);
					}
				}
			}

			/* class 属性がなかった時 */
			//その他の属性
			//current[attrs] > branch
			if(classes.length === 0 && current === element)
			{
				var attrclass = "";
				for(var i = 0,attr;attr = attrs[i];++i)
				{
					if(current.hasAttribute(attr))
					{
						attrclass = attrclass + '[' + attr + '="' + current.getAttribute(attr) + '"]';
					}
				}

				classes = [attrclass];

			}

			if(classes.length > 0)
			{
				for(var i = 0,CLASS;CLASS = classes[i];++i)
				{
					subclass = subclass + CLASS;
					var myNum = document.querySelectorAll(tagName + subclass).length;
					if(myNum < num || num === 0)
					{
						num = myNum;
						addNode(tagName + subclass);
						ancestors.push(tagName + subclass);
						parents.push(tagName + subclass);
					}
					//該当が1つの時は特定要素を示す
					if(myNum === 1 && !root)
					{
						root = tagName + subclass;
					}
				}
			}

			for(var i = 0,ancestor;ancestor = myAncestors[i];++i)
			{
				var myNum = document.querySelectorAll(ancestor + " " + tagName + subclass).length;
				if(myNum < num || num === 0)
				{
					num = myNum;
					addNode(ancestor + " " + tagName + subclass);
					ancestors.push(ancestor + " " + tagName + subclass);
					parents.push(ancestor + " " + tagName + subclass);
				}
			}

			/* サイト生成のdata属性 */
			var dataattrs = current.attributes;
			for(var i = 0,attr;attr = dataattrs[i];++i)
			{
				if(/^data\-/.test(attr.name))
				{
					addNode(tagName + ' [' + attr.name + '="' + attr.value + '"]');
				}
			}

			/* id 属性がある時 */
			if(current.hasAttribute('id'))
			{

				var id = current.getAttribute("id");
				if(/^[a-zA-Z][\w\-]*$/.test(id))
				{
					root = '#' + id;
				}
				else
				{
					root = '*[id="' + id + '"]'
				}

				//#id
				addNode(root);
				ancestors.push(root);
				parents.push(root);

			}

			if(tagName !== "body")
			{
				/* 単一セレクターの生成 */

				var brothers = current.parentNode.querySelectorAll(tagName + subclass);//親ノード直下以外のノードも含まれる
				var sub = 0;//親ノード直下のノード数（兄弟ノード数）
				for(var i=0,brother;brother = brothers[i];++i)
				{
					if(brother.parentNode === current.parentNode)
					{
						++sub;
					}
				}
				if(sub > 1)
				{
					//current:nth-of-type(n) > branch
					//親ノード内のタグの位置を判定
					var brothers = current.parentNode.querySelectorAll(tagName);//同じノード内にある同じタグの要素
					var all = 0;//親ノード内の同じタグの数
					var nth = 0;//現在のノードの位置
					for(var i=0,brother;brother = brothers[i];++i)
					{
						if(brother.parentNode === current.parentNode)
						{
							++all;
							if(brother === current)
							{
								nth = all;
							}
						}
					}
					subclass = subclass + ":nth-of-type(" + nth + ")";
				}
				num = 0;
				for(var i = 0,parent;parent = myParents[i];++i)
				{
					var myNum = document.querySelectorAll(parent + ">" + tagName + subclass).length;
					var globalNum = document.querySelectorAll(tagName + subclass).length;
					if(globalNum > myNum && (myNum < num || num === 0))
					{
						num = myNum;
						addNode(parent + ">" + tagName + subclass);
						parents.push(parent + ">" + tagName + subclass);
					}
				}
				if(!root)
				{
					unique = unique + ">" + tagName + subclass;
					addNode(unique);
				}
			}

			if(root)
			{
				unique = root;
			}

			/* 既存の CSS Rules の追加 */
			checkCSSRules : for(var i = 0,rule;rule = this.myCSSRules[i];++i)
			{
				if(selectors.indexOf(rule) < 0)
				{
					var exists = document.querySelectorAll(rule);
					for(var p = 0,exist;exist = exists[p];++p)
					{
						if(current === exist)
						{
							selectors.push(rule);
							continue checkCSSRules;
						}
					}
				}
			}

		}

		return selectors.reverse();

	};

	/**/

	WHO.FilterMaker.prototype.setCSSRulesToSelector = function(rules)
	{
		var self = this;

		this.selectorSlider.value = 0;
		this.selectorSlider.setAttribute('max',rules.length - 1);

		function setRule(rule)
		{

			var num = document.querySelectorAll(rule).length;
			self.selectorInput.value = rule;
			if(num === 1)
			{
				self.selectorStyle.sheet.insertRule(rule+' *{background:green !important;}',0);
				self.selectorStyle.sheet.insertRule(rule+'{background:green !important;outline:red 1px solid !important}',0);
			}
			else
			{
				self.selectorStyle.sheet.insertRule(rule+' *{background:yellow !important;}',0);
				self.selectorStyle.sheet.insertRule(rule+'{background:yellow !important;outline:red 1px solid !important}',0);
			}

			if(self.myCSSRules.indexOf(rule) > -1)
			{
				self.selector.style.background = "rgba(255,196,196,0.8)";
				self.selectorButton.value = self.lang["ApplyButton::RemoveCSSRule"];
			}
			else
			{
				self.selector.style.background = "rgba(196,224,255,0.8)";
				self.selectorButton.value = self.lang["ApplyButton::AddCSSRule"];
			}

		}

		setRule(rules[0]);

		var slideFunction = function()
		{
			self.selectorStyle.sheet.deleteRule(0)
			self.selectorStyle.sheet.deleteRule(0)

			var rule = rules[self.selectorSlider.value];

			setRule(rule);
		};

		this.selectorSlider.addEventListener('input',slideFunction,false);

		var applyFunction =(function(){return function(e)
		{

			var rule = self.selectorInput.value;

			self.updateCSSRule(rule);

			self.hideRuleSelector(document.body);

			hideHandler();

			e.preventDefault();

		}})();

		this.selectorButton.addEventListener('click',applyFunction,false);

		//セレクターからマウスが外れたとき

		var hideHandler = (function(){return function(e)
		{

			self.selectorStyle.sheet.deleteRule(0);
			self.selectorStyle.sheet.deleteRule(0);

			self.selectorSlider.removeEventListener('input',slideFunction,false);
			self.selectorButton.removeEventListener('click',applyFunction,false);
			document.body.removeEventListener('mouseover',arguments.callee,true);

		}})();

		document.body.addEventListener('mouseover',hideHandler,true);

	};

	/* 要素上に移動 */

	WHO.FilterMaker.prototype.elementMouseover = function(e)
	{
		e.preventDefault();
		this.targetElement = e.target;
		if(["iframe","object","embed","audio","video"].indexOf(this.targetElement.localName) > -1)
		{
			this.adjustPosition(this.targetElement,this.overcursor);
			this.overcursor.style.display    = "block";
			this.overcursor.style.visibility = "visible";
		}
		else
		{
			this.background = this.targetElement.style.background;
			this.targetElement.style.background = "rgba(192,192,255,0.5)";
		}
	};

	/* 要素から離れる */

	WHO.FilterMaker.prototype.elementMouseout = function(e)
	{
		e.preventDefault();
		if(this.targetElement && ["iframe","object","embed","audio","video"].indexOf(this.targetElement.localName) < 0)
		{
			e.target.style.background = this.background;
			this.targetElement = null;
		}
	};

	/* CSS 規則の追加と削除 */

	WHO.FilterMaker.prototype.updateCSSRule = function(rule)
	{

		// CSSRules に有るとき
		//削除
		if(this.CSSRules.indexOf(rule) > -1)
		{
			if(confirm(this.lang["Confirm::RemoveCSSRule"] + "\n\n" + rule))
			{
				this.CSSRules.splice(this.CSSRules.indexOf(rule),1);
				WHO.extension.postMessage('ContentBlockHelper',{method:"removeCSSRule",rule:rule});
			}
		}
		else

		//CSSRules に無いとき
		//追加
		{
			if(confirm(this.lang["Confirm::AddCSSRule"] + "\n\n" + rule))
			{
				this.CSSRules.push(rule);
				WHO.extension.postMessage('ContentBlockHelper',{method:"addCSSRule",rule:rule});
			}
		}

		WHO.extension.sendRequest('ContentBlockHelper',{method:"changeMode",mode:""});

	};

	//------------------------------------------------------------------------------------//
	/* ルールセレクターの作成 */

	WHO.FilterMaker.prototype.createRuleSelector = function()
	{

		var self = this;

		if(document.documentElement instanceof window.HTMLHtmlElement)
		{
			var selector = document.createElement('div');
				selector.setAttribute("data-cbh-dummy","dummy");
				selector.style.display     = "none";
				selector.style.visibility  = "hidden";
				selector.style.top         = "0";
				selector.style.left        = "0";
				selector.style.zIndex      = "65535";
				selector.style.margin      = "0";
				selector.style.padding     = "1em";
				selector.style.border      = "solid black 1px";
				selector.style.borderRadius= "8px";
				selector.style.background  = "rgba(196,224,255,0.8)";
				selector.style.textAlign   = "left";
				selector.style.fontFamily  = "arial";
				selector.style.fontSize    = "12px";
				selector.style.width       = "360px";
			if(!window.TouchList)
			{
				selector.style.position    = "fixed";
			//	selector.style.whiteSpace  = "nowrap";
			}
			else
			{
				selector.style.position    = "absolute";
			}
				selector.style.maxHeight   = "20em";
				selector.style.overflowY   = "auto !important";
				selector.style.overflowX   = "hidden";
				selector.style.boxShadow   = "8px 8px 4px rgba(0,0,0,0.4)";

			var slider = document.createElement('input');
				slider.setAttribute("data-cbh-dummy","dummy");
				slider.setAttribute('type',"range");
				slider.style.margin     = "0";
				slider.style.padding    = "0";
				slider.style.border     = "none";
				slider.style.background = "transparent";
				slider.style.width      = "100%";

			var input = document.createElement('output');
				input.setAttribute("data-cbh-dummy","dummy");
				input.style.display    = "block";
				input.style.margin     = "0";
				input.style.padding    = "0";
				input.style.border     = "none";
				input.style.background = "transparent";
				input.style.width      = "100%";
				input.style.height     = "3em";

			var button = document.createElement('input');
				button.setAttribute("data-cbh-dummy","dummy");
				button.setAttribute('type',"button");
				button.setAttribute('value',"Apply");
				button.appendChild(document.createTextNode("Apply"));
				button.style.margin      = "0";
				button.style.padding     = "0.5em";
				button.style.border      = "outset 2px #666";
				button.style.borderRadius= "4px";
				button.style.background  = "#ccd";

			selector.appendChild(slider);
			selector.appendChild(input);
			selector.appendChild(button);

			this.selector = selector;
			this.selectorSlider = slider;
			this.selectorInput  = input;
			this.selectorButton = button;
			document.documentElement.appendChild(this.selector);

			var style = document.createElement('style');
				style.setAttribute("data-cbh-dummy","dummy");
				style.setAttribute('type',"text/css");
			this.selectorStyle = style;
			document.head.appendChild(style);

			this.hideHandler = (function(block){return function(e){block.hideRuleSelector(e.target);}})(this);
			document.body.addEventListener('mouseover',this.hideHandler,true);
		}
	};

	/* ルールセレクターの削除 */

	WHO.FilterMaker.prototype.deleteRuleSelector = function()
	{
		if(this.selector)
		{
			document.body.removeEventListener('mouseover',this.hideHandler,true);
			this.selector.parentNode.removeChild(this.selector);
			this.selectorStyle.parentNode.removeChild(this.selectorStyle);
			delete this.selectorButton;
			delete this.selectorInput;
			delete this.selectorSlider;
			delete this.selectorStyle;
			delete this.selector;
		}
	};

	/* オーバーカーソルの作成 */
	// マウスが hover している要素を強調する

	WHO.FilterMaker.prototype.createOvercursor = function()
	{
		if(document.documentElement instanceof window.HTMLHtmlElement)
		{

			var self = this;

			var cursor = document.createElement('div');
				cursor.setAttribute("data-cbh-dummy","dummy");
				cursor.style.display     = "none";
				cursor.style.visibility  = "hidden";
				cursor.style.top         = "0";
				cursor.style.left        = "0";
				cursor.style.zIndex      = "65534";
				cursor.style.padding     = "0";
				cursor.style.background  = "rgba(192,192,255,0.5)";
				cursor.style.position    = "absolute";

			this.overcursor = cursor;

			document.documentElement.appendChild(this.overcursor);

			this.overcursor.addEventListener('mouseout',function(e)
			{
				cursor.style.visibility = "hidden";
				cursor.style.display    = "none";
				cursor.style.top         = "0";
				cursor.style.left        = "0";
			},false);
			this.overcursor.addEventListener('click',function(e){self.showCSSRulesSelector(e)},false);

		}
	};

	/* オーバーカーソルを削除する */

	WHO.FilterMaker.prototype.deleteOvercursor = function()
	{
		if(this.overcursor)
		{
			this.overcursor.parentNode.removeChild(this.overcursor);
			delete this.overcursor;
		}
	};

	/* ルールアイテムの作成 */

	WHO.FilterMaker.prototype.createSelectorItem = function(rule)
	{
		var self = this;

		this.removeOptions();

		this.selectorInput.value = rule.pattern;

		function addOptionsImage(title,src)
		{
			var img = document.createElement('img');
				img.setAttribute("data-cbh-dummy","dummy");
				img.setAttribute('src',src);
				img.setAttribute('title',title);
			self.selector.appendChild(img);
		}

		if(rule.options)
		{
			if(rule.options.thirdParty)
			{
				addOptionsImage("Third Party","data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAg9JREFUeNqkU89rE0EYfbubjZu4pLWSipfGqlQpelARb7YgHhTBgwfRRVCKepSCRYoHLyJi/wM96KW5CR48qYfmUKjStMGghZY2irHNNptoStptsj/Gb6Z0cRs95cGbGXbe9775Zr+RGGNoBxE+nLv9EYqiiA89PQfELEnSBHHgX0GUNPNidO9gYPA3THMFup6AqqrPj6TUgYe3ki0GNx4VA2N552aj0UClUiZa6U+fy8adx4tYrTohTb1eR8iAMf+K53lLRLbNTt1nutYcX/xuoWRthgzW1mqhenD66rulyVmL+b4fcHauys5ce89mvv5iHNNfKmx5dUOsSc8nESuG/ktvRNZmsymYn7fYxbsfWJaCOKgUxjXnh0SgWG8byFt1O3BdFxSMb8UaXr5ewJN7x9F/MI6pXAnG/Qkk90RR+FEzjJGM0O+4A1kYVH/bmJwxcf3CPiQ7PGTzJTwYm8az4T7SSPB9KT2VswxaZ0IGiqLBcTwsmxs40RdHV0JF0Wxg/O1PjA4dwrHDHVgp+6SL8Q5JEwdDjRSN6nR8D8nOXSSSsL7JkF+wcfNyCt1dKm8qoeFwXYWSrYc7UdMSdEQVsVgEns/IwMHZU93Q40og5JotJOgOai0Ghdy833vyaAwR+jOp/RpkWQpE2TlbaFrNghJ2jzx9ZY8Bdu9/3kyBa6jhWjakdl+jjDbxR4ABAPjFI5E3WpRkAAAAAElFTkSuQmCC");
			}
			if(rule.options.firstParty)
			{
				addOptionsImage("First Party","data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAB3RJTUUH3gMBAiEOc18mwAAAAAlwSFlzAAAewQAAHsEBw2lUUwAAAARnQU1BAACxjwv8YQUAAAGoSURBVHjavVNNK0RRGH7ux8zVZZghFtRkRMaCIcrG0j+wpkj2FhMhfsDsSGJrY8E/sFQiYspHFhhmMSgfZbhzv2a8582Mbokp5a3nnPec87zPfc7bucAfQxLD4MTTEE0JQqSMmmtCfHutdkss1M/NRHzYH+ntqPi1+vA8F0msW+JjXwKFQiESa1PgOPa3RX6/DMvKc97TrhLfLDmVxWBZWSrOfQtFcbGw+ozUncNr1zWZ7xEwjGfYtknIIXWf51lAUQqYXc5g9+gOKxtp3svnbeZ7BN7fn0jdImUTEwtJ3D7Q3VQZ04sp7Byk0dJoYGZUJwELPp/E/GJwD0zzlaxZJOJwPja3j/5YHfaSj+hs1TE/HuLzmpoAdF1jjkeAukCNcdmFyEXsJTPo76rH1EgdNE2l4mpypUKSpBKnJKBpPrZsGA7nxTi+eMGb247mBv3rzrLs4XAPAoEAwuEwotEoBvqaeF3EZOIMFzfi7j6Goii873EQCtXygVBfnu3+8SEJjuB7HASDwevTK4fv+BtOLm3mexxUVlbFlzaz9DyzZf0Lgl8G75/iA1ZCu7oOWjYrAAAAAElFTkSuQmCC");
			}
			if(rule.options.includeDomains)
			{
				addOptionsImage(rule.options.includeDomains.join("|"),"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAipJREFUeNqkU89PE0EUft2fs7V1xSxUgUgvPQlpjAoIlwonjly8SpSEP8CQ4NGDp3IxnBrQmBgPevBmuEljAj01Iam3JoiGQMgugf6wXfan82bZCU2MFyb5dt58831v38y+TYRhCFcZEj4Kz7YhlUqDrt8AQrSsIAhLlJ6jyF3o6hSbQRCUbLu732icQbvdgvK76ShBPKhgQYDzYuFeyng0dg0G+6PtQ9PLV2p/8uVqd5Fqlin1vqeC2KzJdmnl6YiSva1AdDSf7d3JJGDkVhomR1Xj9cavUiMIIE4i4MN13WzgdYorC0PKcL+Aa/A8jx5thwFj5HAPNahFD0/QarWXZsd1Y3hA5GZEs9lkiNcsCdXMPNQN9PAjdLv23OzkABPEA2PKs3hv7yf4vsdiUZRg4m4S1j/beMkvpej8Qi47mKSzAw+ebF26VlYgzL+oc+bLag4yfSLz8AokKQkQYiXnUfy/7y7RC6aJYx1LQMj1ev13J38z6UDl4xQXP37+g81bb0c5Z1mncGBGHl6jpvVtfq+62ET00joclGe4zKkqgUot8vAEqpoulasJy2xooCgayDJhIERniNeIoxMVdmqyhR6eQBTlfccjy6sfPOf4VGVCSSLwdS3DgDFyh9T85hM4qEVPTydiZ5lnIbxat4uF+4oxnZdhCJuR4sAUYHvXhXLVtTp22NPKCWzZmcVjWoUSc9hh//yZKLBs9mbfd+DbRiZKcJXxV4ABAHraB71xvvTRAAAAAElFTkSuQmCC");
			}
			if(rule.options.excludeDomains)
			{
				addOptionsImage(rule.options.excludeDomains.join("|"),"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAhNJREFUeNqkU89rE1EQnuzvXZOulW2ibbG59KSyiKjVXkKLhx69ebNIoX+AFOLRg6d48Zi2iOBJ/4FeRIJQewoIAS+5VCmVshGbJtnd7E9n3roLCzWXDszbtzPf972Zt7OFOI7hIibQUnu2D8ViCXT9MiiKWuU4bhPDa+iL/3Bd9L0oipqu6xz2+6cwHA6g9XY5EUgNAescjBu120Xjwa1LMDuTpI+twDzojMxW29lAzBaG3uUqSMmq6DbrTxek6jUJktZClrteKcDC1RIs3ZSNV7s/mv0oglSEo8X3/WoU2I36+pw0P8PROwRBkHOKUY4whCVOJjAYDDdX7+nGfJk/l5wTQczKXd0gTtaC47hrq0tlBkiN9qPRCGzbYfswDFic5wW4f0ODnY8uXfILIemfW6zOavj04PHz73B2NkBRIobsDFHUQJKm8AvpsF0PoDLNM07WgiBoADFVMp5IVpQiYvGCkcY4aQuKMtXt/rTNK5oHn7YfThycXi+CIyvhZAKqOr33pe2bTx6pWIE9UUCWFTjojBkna0GWS81Wu9Cz+iqWq2LZyn/9128ZvnbEHnEyAZ4XD71A2Xr9PvBO/sgMKAh5p9gxkt98AI+wxMlNIk2WdRrDyx23UbsjGcumCHNljl3ukRXC/jcfWm2/Z7txbpQLNLIrGydYhZTGaMLO/ZnQqWx2chh68Hm3kghcxP4KMABtvA0u5lR/awAAAABJRU5ErkJggg==");
			}
			if(rule.options.resources)
			{
				if(rule.options.resources & 32)
				{
					addOptionsImage("subdocument","data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAUtJREFUeNqcUz1LxEAQndnsQU6LaKFyFhb5E6nttbKyVvDsT1IFQg5sLGzPH+EPSedvsDkQwVwgcPnadWZzsYqJZpqFNztv3pudxTAMLwFgBuNiLauqOl0ul6sx1UEQzPH28VN3JU+y57shAqUUyizLYH51DFo3PIgIq9cPiKLopcW6gu/5vn8vN5sElD4iAtUkQABjdT3jDr8SCCGA7KNMki/QdFHtuglUwBgX13Xda6EsS5Bpmhr5bTckZsaGCNhCURQot9ucuiujwgwGARjj4iECUoBSKUHdNNStX0o0WL8CnoFRMJnsGwutAk0JxoYILMuCPM9R2vZBM8QdgaCTsSECzhsF0+mhkS0s8WPBYBRSyt5XYAV4frPu3Jb07WJwE23b3kPXdRdxHD/RUvzrH7A6z/Me0HGca/JzNuYz0Uu8Y9++/yW+BRgANjnCyUDgDUsAAAAASUVORK5CYII=");
				}
				if(rule.options.resources & 4)
				{
					addOptionsImage("image","data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAcVJREFUeNrEkz1rFFEUhp+587nzmY2JYXeNki1isWKihZ0gaGFjIULA3sYfEQikFVsrwTaF+gdsY2ljF4KdYuNmY9yM2bkz47kzECxlU3jgMncu87znPS9zrbquuUgpLljO1s7OI3n25+S/OWVZDt7u7r6ah36yvf3cKbW2Ksnh7ksLZYFriy1ZMw0mnrQjK5AzGXa4BKMe6Aq2btcY1tFaq1K+3Lhi4TmQCbAUwfef0HHbdxPz5BRuyKAbAzidgWEM6+iiaAT60T7rvTW6Ub/pfH0FVpJWKBdgeKl1cqZb0UZA2EZAVxUfPr3mYxDy8NZj7o3uN5aNI2M7L2AxhKJsz0LXjFG1AoURELWDwwMWsgX2Tt5wfPKV1eWr9BZXuZx26XjS2gpb2GtH+13VFI3AbKZKUTs7HvDjl8N07PFu8plOcEgURsRRTBzHJHFClqQi3GdtecCdaz6GPXcw7D3A8zx83ycMQ5IkJssSut1UlsBZRCohRJGL8hW6zs8d2JU4+LvqJuGSXNJTKpe9YjqtOToqCYKgaXJzVBkHtjMZjz3bdXn/4uk//j6mWY7tehjWyjY3n4mD4VwXSakv1n+/jX8EGAAI68BpoWbP4wAAAABJRU5ErkJggg==");
				}
				if(rule.options.resources & 2)
				{
					addOptionsImage("script","data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAWBJREFUeNqMU71Kw1AUPjf35qaDS8EnsBRB6VA6xVWHDik+RX2FQnHqA7g6ZHLoIo5FCt0U3FwcJYPZuuggNmn6k3iO5ucW8SYfHDh/35eTe+5lzmAABMMwQJqmjW4LKiJJkolQAvui1xuedjoO+lpiEEXvl6579Tafm2K9WmX5lt1uOx+LhZYsLQtuptPJq+/fCtP0Rbhc5sVP9L9KBPYYg7vZ7Ilz7m22WxBBEOTFTRzDGpM6UI/K2REwUJ1MB6r/K8BIALehA/sjEIZ5wLEoSgSoR+WIUA2waHKuFaCeHU4URYU6fr1MgHpUjnoPGI0vyybAHuTkJy2SQkDwCr9APcjJb7CAYu9ygacb455pVdlGstWy1CcB5MhC4BfH593uyYvn/UyAjwosMimhlhrFlE9nrxWHCnB41Gz23dHobL9eh5JLANfj8QNynrPnxoxG4wATfaiOxxjgPhP4FmAAzLaGkO1fyo4AAAAASUVORK5CYII=");
				}
				if(rule.options.resources & 16)
				{
					addOptionsImage("object","data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAf1JREFUeNqkk09rE0EYh38zO8muEkI3aNF40lMOetLPIEFajyn1z8GD2CTeKmoQLN4FC6UmKOpBUCmlFy8evFk8+wmKQptKqezWpJpsdnd831e6em27MDuzwzy/95nZXWWtxWEuU6vVJqk/eUB+06RpWm63253RaLQvMpfLoV6vz5gkSXQURWg2m6Aw8Jb22v/PtA6DQQTecanko9N5ynOaAxQv5FapVKTvNaowS6tIvn4Hm8VlH96NKr41FmBMDru7PVnHrOYUTueJOI7BNoNXHzB+fQLD4RBB8BOnb01ha34F+bwH1/VEnxkxIEgxyJoM89i7egnd3jby92o4Rso8Pl6/jODhWzEwJi/rmNV0yww4wN6ehI0TrM8uIo0SGqfYvPscVA7+3BRV9yjAiAGzEsBpHIDGhMB2FOPC/H2CUgHPP7kDxKk8H5mtwnHMnoHODLhZmvzx4r2EbIRbfwNii+7ONo0tfr/5JL3jOJmBoVPODLhyRCfPYPD6I9JuCK019CkfpWsXcTRUYqKUEgNmMwM+xPVHL8E76b1bxbnGFYyNnYDvl3F2Zhq/lj/LBxQ8XqG7+mdAr0pz9UKhgH6/T3oJnLUNfHmwSNUdMdiZe0ZVgSGBfLmuI8bMmjAMXV7UarX29Skzw6wqFos3Ke3MQf4kCllTh/2d/wgwACqtZl9ffv0vAAAAAElFTkSuQmCC");
				}
				if(rule.options.resources & 1)
				{
					addOptionsImage("other","data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAmZJREFUeNp8U0tPE1EUPndenTLMtEhpC0LBGiKIMVFX7Log+gNM+y9k4caFCUR3soJI4k8gNrjTXRPjRhMJCyFNfCQOBBibKVIYpgPTzp3rGUprW4WbfLl3zuM73z33DGGMQa4A3Yud73nEKuIdwmkPyM80dg4uWIXC+vLmpj5tmpW87/tlNL1GZBE97XHCRQTp9NAj3GY3Nn5O8zyXjcWiDxOJaC4WiwDHcR/Ql2kROA7rSOZQlygKbGAgkk+nB1crFftppXL8OCBD9/2ZmXvzzVgS9ODOq3oXAWG6/uUZISSnacpkPN7nxOPRt+Gw1OxHFXtAWgS3XzpQ3ufaFTDfrxLX3Qo+pxA5JMuqqjLZ36/B2NggvHnQIDjL6otQGB3loY5CArguQK2mACFK4C4i5rHQTcuyb+m68aRUon+LNQ+9vQQmJkIQiUqgRSRQNREx3t3boixfWzAM7/+vEA4TSI0QcE4AfL9h07QbsLvz7VzNAKrrQXWsk4AxP+NTbwGbd1cQOF5VCW2NEvRCCBMZHwVzvzECjHXNgXVgroykk8krMRFOT+tgljwdS54FnNhWQ53sQ2rYA8eV/yXYL+0pap8K1qGDsEAQQku8IOI1KLgnDkgh+SxYFHyIynh/InQ28fC3Obfx6eNxcX1tr2zszlJKlwN7kBwsJMp4Xu0z9eoeozVGWJ12KPApXcSHXwxeVpQa1arWIRwfHZzPBbcyPnU9mbiqgGO7sLNd1gGGLv8Xtr8XW2fCcUoyNQz2119gGgbwvLR0KYGx9QOq9lG7aW7tfeG5IIiWJIdfxIdSy03HHwEGAHFs937fLUK7AAAAAElFTkSuQmCC");
				}
			//	if(rule.options.resources & 8)
			//	{
			//		addOptionsImage("stylesheet","data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAttJREFUeNqkU11MUmEYfs8fCAJ5VBQoUxPwD01LUEu0dE3bbC6t1sqa67b7LrppXVWri65sq7Vq8651UWttmU1N+rPEnJo20AA3GGeiJCjC4Rx6Dy5n157tOe+77/ue5/353o9IpVKwm48e7GOARIfEH4GWIIBGU4m+BW0hIgu2tiKIMGIeQ37EuOsiOvQOMQpxFDeO5wrGBl2kvCORSADVYebpinxYF5biQfGnKplMQvy76wV4l6/h+cV/AgYk9qp0B6r2N3Q2bvbPlOxpqIKUKILz4UtGf6MTfLSTsVrbQCp5kON61J6QCyB1WxIoSpHU1WJ7T3O2sa4uuhomOY6D0NAQhPx+0PUeAQLrC4fD4HC8BY4LQPW+kyCWaauDc1+aSUFM9Znaets1hTU2iSylozxlgSW3G/IvNAJrNQJJUbBXdgiWljxgyrIDSxlAW1ZfjtwKGrNUs8XVFdGVVZApFMDI5aBsrQHWZvyv2zq1CXSlJviVLIL70UbA/hSX5nnsVFsJ2Z1dUKJX52jl3jnn4virZw6ej8cMxkq9lLpcqUyXINUu2QdBOxiNRmBZFt4HWDO9GoOB10/7czGIiBhFTAWG39082NoF0+Oj3qlPI1yVrSnPUt9SKPA8SP2R+iHZltCjYalmB+IM3v85koDHeOFdphprLiWTgXtizK3TG2wLkw43k5GR7sXFAhd4PB44n/PVVxod+Ubca6cAiUAR6Ym8XmQ53H3s7JVaIZEgN2ORtfjGBk/LZEymKksjZUAxDKYqrI8+uTW4ubZyl2bIFNDk9jjXNp2+ZEnGYukVhVKjydRkgygIOKEEkDKGX5wcW5gfezPPx6LPKRI+01LkHc+B+j0zESwwW7QZKrVC5JNC5M/KxrLfG/G7Zpd9s04umYg7kTigYIhpiUDcOUFss1HHimKX0TUjVFtLEEB4MYEfePKDnAKfHMcPBYDG4Sd2+xpJ2OX3V4ABACtAI1yXa37KAAAAAElFTkSuQmCC");
			//	}
			}
		}

		// 一時リストにある
		this.selectorButton.disabled = false;
		if(rule.act === "block")
		{
			this.selector.style.background = "rgba(255,196,196,0.8)";
			if(rule.status["cus"])
			{
				this.selectorButton.setAttribute('value',this.lang["ApplyButton::RemoveBlockRule"]);
			}
			else
			{
				this.selectorButton.setAttribute('value',this.lang["ApplyButton::AddAllowRule"]);
			}
		}
		else
		// 認可リストにある
		if(rule.act === "allow")
		{
			this.selector.style.background = "rgba(196,255,196,0.8)";
			if(rule.status["cus"])
			{
				this.selectorButton.setAttribute('value',this.lang["ApplyButton::RemoveAllowRule"]);
			}
			else
			if(rule.status["sub"])
			{
				this.selectorButton.setAttribute('value',this.lang["ApplyButton::Disabled"]);
				this.selectorButton.disabled = true;
			}
		}
		// リストにない
		else
		{
			this.selector.style.background = "rgba(196,224,255,0.8)";
			this.selectorButton.setAttribute('value',this.lang["ApplyButton::AddRule"]);
		}

	};

	/* ルールセレクターを表示する */

	WHO.FilterMaker.prototype.showRuleSelector = function(e)
	{

		var offsetLeft = 0,offsetRight = 0,offsetTop = 0,offsetBottom = 0;

		if(window.TouchList)
		{
			offsetLeft   = window.scrollX;
			offsetRight  = document.documentElement.offsetWidth  - window.innerWidth  - window.scrollX;
			offsetTop    = window.scrollY;
			offsetBottom = document.documentElement.offsetHeight - window.innerHeight - window.scrollY;
		}

		this.selector.style.display    = "block";
		var y = e.clientY - this.selector.offsetHeight / 2;
		if(y < 0 ) y = 0;
		if(y + this.selector.offsetHeight > window.innerHeight) y = window.innerHeight - this.selector.offsetHeight;
		var x = e.clientX - this.selector.offsetWidth / 2;
		if(x < 0 ) x = 0;
		if(x + this.selector.offsetWidth > window.innerWidth) x = window.innerWidth - this.selector.offsetWidth;
		this.selector.style.top        = (y + offsetTop)   + "px";
		this.selector.style.left       = (x + offsetLeft)  + "px";

		this.selector.style.visibility = "visible";

		this.selectorSlider.focus();

	};

	/* ルールセレクターを隠す */

	WHO.FilterMaker.prototype.hideRuleSelector = function(element)
	{

		if(element !== this.selector)
		{
			this.selector.style.visibility = "hidden";
			this.selector.style.display    = "none";
			this.selector.style.top         = "0";
			this.selector.style.left        = "0";
		}

	};

	/* ルールセレクターからオプションアイコンを削除する */

	WHO.FilterMaker.prototype.removeOptions = function()
	{

		var child = this.selector.getElementsByTagName('img');

		while(child[0])
		{
			this.selector.removeChild(child[0]);
		}

	};

	//------------------------------------------------------------------------------------//
	/* 位置を修正 */
	//追加モードのクリックエリアの位置を調整する

	WHO.FilterMaker.prototype.adjustPosition = function(element,img)
	{

		var bounds = element.getBoundingClientRect();

		var top    = bounds.top;
		var left   = bounds.left;
		//fixed な要素の調整
		var elem = element; // .offsetParent;
		img.style.position = "absolute";
		while(elem)
		{
			var estyle   = window.getComputedStyle(elem,'');
			var position = estyle.getPropertyValue("position");
			if(position == "fixed")
			{
				img.style.position = "fixed";
			}
			elem = elem.offsetParent; 
		}

		// fixed 以外はスクロール量を考慮
		if(img.style.position!="fixed")
		{
			var html = document.documentElement;
			var body = document.body;
			left = left + (body.scrollLeft || html.scrollLeft) - html.clientLeft;
			top  = top  + (body.scrollTop  || html.scrollTop)  - html.clientTop;
		}

		//リストの表示方向
		img.style.top  = top + "px";
		img.style.left = left + "px";

		/* フレームのサイズ */
		img.style.width  = (element.offsetWidth - 0) + "px";
		img.style.height = (element.offsetHeight- 0) + "px";

	};

/**************************************************************************************/
