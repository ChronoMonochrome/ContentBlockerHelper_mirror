/* 自作フィルタの設定 */
var prefsCustomizations =
{

	typemap:{},
	rtypes :
	[
		"main_frame"       ,
		"sub_frame"        ,
		"popup"            ,
		"redirect"         ,
		"ping"             ,
		"xmlhttprequest"   ,
		"script"           ,
		"stylesheet"       ,
		"font"             ,
		"image"            ,
		"audio"            ,
		"video"            ,
	//	"media"            ,
		"object"           ,
	//	"object-subrequest",
		"other"            ,
	],

	init : function()
	{

		WHO.extension.sendRequest('ContentBlockHelper',{method:"getTypemap"},function(message)
		{

			/* 設定値の読み込み */

			this.typemap = message.typemap;

			var CustomFilter = JSON.parse(WHO.extension.storage.getItem('CustomFilter'))||
			{
				ignore:[],
				block :[],
				allow :[],
			};

			var rules = [];

			["ignore","block","allow"].forEach(function(act)//for(var act in CustomFilter)
			{

				for(var i = 0,rule;rule = CustomFilter[act][i];++i)
				{
					rules.push
					({
						act : act,
						pattern       : rule.pattern,
						level         : rule.level,
						types         : rule.types,
						includeDomains: rule.includeDomains,
						excludeDomains: rule.excludeDomains,
					});
				}

			});

			/* ルールを並び替える */

			rules.sort(function(a,b)
			{
				var dsa = ((/^(?:\|\||https?:\/\/)([^\^\/]+)/g.exec(a.pattern)||[])[1]||"").split(".");
				var dsb = ((/^(?:\|\||https?:\/\/)([^\^\/]+)/g.exec(b.pattern)||[])[1]||"").split(".");

				var ndsa = [];
				var ndsb = [];

				for(var i = 0;i < dsa.length;++i)
				{

					ndsa.unshift(dsa[dsa.length - 1 - i]);
					ndsb.unshift(dsb[dsb.length - 1 - i]);

					var da = ndsa.join(".");
					var db = ndsb.join(".");
					if(da > db)
					{

						return 1;
						break;

					}
					else
					if(da < db)
					{

						return -1;
						break;

					}

				}

				return 0;

			}).forEach(function(rule)
			{
				this.createItem(rule);
			},this);

		}.bind(this));


		/* フィルタを編集したときボタンを赤く */

		ID('CustomizationsField').addEventListener('input',function(e)
		{
			ID('SaveChangeCustomizations').style.color="red";
		},false);

		ID('CustomizationsField').addEventListener('change',function(e)
		{
			ID('SaveChangeCustomizations').style.color="red";
		},false);

		ID('ClearCustomizations').addEventListener('click',this.clear.bind(this),false);

		/* フィルタの変更を保存 */

		ID('SaveChangeCustomizations').addEventListener('click',this.save.bind(this),false);

		/* フィルタを追加 */

		ID('AddNewCustomizations').addEventListener('click',this.addNew.bind(this),false);

	},

	addNew : function()
	{
		var newRule = prompt(WHO.locale.get("Customizations::pattern"),"||example.domain.com^*");
		if(newRule)
		{
			this.createItem(
			{
				act    :"block",
				pattern:newRule
			});
			ID('SaveChangeCustomizations').style.color = "red";
		}
	},

	clear : function(e)
	{

		ID('ClearCustomizations').style.opacity = "0.5";

		var parent = ID('CustomizationsField');

		parent.style.display = "none"

		while(parent.firstElementChild)
		{
			parent.removeChild(parent.firstElementChild);
		}

		parent.style.display = ""

		ID('ClearCustomizations').style.opacity    = "";
		ID('SaveChangeCustomizations').style.color = "red";

	},

	/* フィルタを保存する */

	save : function()
	{
		ID('SaveChangeCustomizations').style.color = "red";

		var newFilters = this.getNewFilters();//フォームからフィルタを取得
		WHO.extension.storage.setItem('CustomFilter',JSON.stringify(newFilters));

		WHO.extension.postMessage('ContentBlockHelper',{method:"updateCustomizations"});

//		if(ID('AlwaysSync').checked)
//		{
//
//			WHO.extension.postMessage('Sync',{method:"backupAll"});
//
//		}

		window.location.reload();

	},

	/* フォームからフィルタを取得 */

	getNewFilters : function()
	{

		var newFilters = 
		{
			block :[],
			allow :[],
			ignore:[],
		};

		var ix =//index
		{
			block:{},
			allow:{},
			ignore:{},
		};

		var list = ID('CustomizationsField').getElementsByTagName('li');

		for(var i = 0,item;item = list[i];++i)
		{
			var pattern = item.querySelector('.pattern').value;
			if(pattern)
			{

				var rule = {pattern:pattern};

				var skip = false;

				var act = item.querySelector('.act').getAttribute('value') || "block";

				if(act !== "ignore")
				{

					//resource types
					var types = [];
					var boxs = item.querySelectorAll('.resource');
					for(var r = 0,box;box = boxs[r];++r)
					{
						if(box.hasAttribute('data-apply'))
						{
							types.push(box.value);
						}
					}
					if(types.length)
					{
						rule.types = types;
					}
					//hosting level
					var level = 0;
					var hostboxs = item.querySelectorAll('.host');
					for(var h = 0,hostbox;hostbox = hostboxs[h];++h)
					{
						if(hostbox.hasAttribute('data-apply'))
						{
							level |= (1 << h);
						}
					}
					if(level)
					{
						rule.level = level;
					}

					var includeDomains = [];
					var excludeDomains = [];
					var domainboxs = item.querySelectorAll('button.domain');
					for(var d = 0,domainbox;domainbox = domainboxs[d];++d)
					{
						var domaintype = domainbox.getAttribute('data-type');
						if(domaintype === "includeDomains")
						{
							includeDomains.push(domainbox.value);
						}
						else
						if(domaintype === "excludeDomains")
						{
							excludeDomains.push(domainbox.value);
						}
					}

					//IncludeDomains
					if(includeDomains.length)
					{
						rule.includeDomains = includeDomains.sort();
					}
					//ExcludeDomains
					if(excludeDomains.length)
					{
						rule.excludeDomains = excludeDomains.sort();
					}

				}

				/* 重複をチェック */
				if(ix[act][pattern])
				{
					for(var j = 0;j < ix[act][pattern].length;++j)
					{
						var r = ix[act][pattern][j];
						if(
							r.level === rule.level &&
							(
								(!r.includeDomains && !rule.includeDomains) ||
								(r.includeDomains && rule.includeDomains && r.includeDomains.join("|") === rule.includeDomains.join("|"))
							) &&
							(
								(!r.excludeDomains && !rule.excludeDomains) ||
								(r.excludeDomains && rule.excludeDomains && r.excludeDomains.join("|") === rule.excludeDomains.join("|"))
							) &&
							(
								(!r.types && !rule.types) ||
								(r.types && rule.types && r.types.toString() === rule.types.toString())
							)
						)
						{
							skip = true;
						}
					}
				}
				else
				{
					ix[act][pattern] = [];
				}

				if(!skip)
				{
					newFilters[act].push(rule);

					ix[act][pattern].push(rule);

				}

			}
		}

		return newFilters;

	},

	/* フィルタの作成 */

	createItem : function(rule)
	{

		var li    = document.createElement('li');
			li.setAttribute('class',"filter");

		/* 削除ボタン */

		var del = document.createElement('img');
			del.setAttribute('src',"images/delete.png");
			del.setAttribute('alt',"x");
			del.setAttribute('class',"del");
			del.setAttribute('title',WHO.locale.get("Customizations::delete"));
			del.addEventListener('click',(function(li)
			{
				return function(e)
				{
					li.parentNode.removeChild(li);
					ID('SaveChangeCustomizations').style.color = "red";
				}

			})(li),false);
		li.appendChild(del);

		/* フィルタの種類（禁止/許可/無視） */

		var act = document.createElement('input');
			act.setAttribute('type',"image");
			act.setAttribute('class',"act");
			act.setAttribute('name',"type");
			act.setAttribute('value',rule.act);
			act.setAttribute('src',"images/rules/" + rule.act + ".png")
			act.setAttribute('width',"16");
			act.setAttribute('height',"16");
			act.setAttribute('title',WHO.locale.get("Rule::act::" + rule.act));
			act.addEventListener('click',function(e)
			{

				ID('SaveChangeCustomizations').style.color="red";

				if(this.value === "block")
				{
					this.value = "allow";
					this.src   = "images/rules/allow.png"
					this.title = WHO.locale.get("Rule::act::allow");
				}
				else
				if(this.value === "allow")
				{
					this.value = "ignore";
					this.src   = "images/rules/ignore.png"
					this.title = WHO.locale.get("Rule::act::ignore");
				}
				else
				if(this.value === "ignore")
				{
					this.value = "block";
					this.src   = "images/rules/block.png"
					this.title = WHO.locale.get("Rule::act::block");
				}

				e.preventDefault();
				return false;

			},false);
		//	act.checked = (rule.type === "include");
		li.appendChild(act);

		/* ルール */

		var text = document.createElement('input');
			text.setAttribute('type',"text");
			text.setAttribute('class',"pattern");
			text.setAttribute('value',rule.pattern);
		li.appendChild(text);

		/* オプション */

		// resource types
		this.rtypes.forEach(function(rtype)
		{
			var img = document.createElement('img');
				img.setAttribute('width',"16");
				img.setAttribute('height',"16");
				img.setAttribute('src',"./images/types/" + rtype + ".png");
			var button = document.createElement('button');
				button.setAttribute('type',"button");
				button.setAttribute('class',"option resource");
				button.setAttribute('title',WHO.locale.get("Rule::type::" + rtype));
				button.setAttribute('value',rtype);
				if(rule.types && rule.types.indexOf(rtype) > -1)
				{
					button.setAttribute('data-apply',"true");
				}
				button.appendChild(img);
				button.addEventListener('click',function(e)
				{

					ID('SaveChangeCustomizations').style.color="red";

					if(this.hasAttribute('data-apply'))
					{
						this.removeAttribute('data-apply');
					}
					else
					{
						this.setAttribute('data-apply',"true");
					}

				},false)
			li.appendChild(button);
		},this);

		// Hosting level

		["foreign","similar","related","same","inline"].forEach(function(level,i)
		{
			var button = document.createElement('button');
				button.setAttribute('type',"button");
				button.setAttribute('class',"host");
		//		button.setAttribute('type',"checkbox");
				button.setAttribute('value',i);
				button.setAttribute('title',WHO.locale.get("Rule::host::" + level));
				if(rule.level & (1 << i))
				{
					button.setAttribute('data-apply',"true");
				}
				button.addEventListener('click',function(e)
				{

					ID('SaveChangeCustomizations').style.color="red";

					if(this.hasAttribute('data-apply'))
					{
						this.removeAttribute('data-apply');
					}
					else
					{
						this.setAttribute('data-apply',"true");
					}

				},false)
			li.appendChild(button);
		},this);

		// Specific domains

		if(rule.includeDomains)
		{
			rule.includeDomains.forEach(function(domain)
			{

				var button = this.getDomainButton(domain,"includeDomains");
				li.appendChild(button);

			},this);
		}

		if(rule.excludeDomains)
		{
			rule.excludeDomains.forEach(function(domain)
			{

				var button = this.getDomainButton(domain,"excludeDomains");
				li.appendChild(button);

			},this);
		}

		var newdomain = document.createElement('span');
			newdomain.setAttribute('class',"domain");
		li.appendChild(newdomain);

		var text = document.createElement('input');
			text.setAttribute('type',"text");
		newdomain.appendChild(text);

		var include = document.createElement('input');
			include.setAttribute('type',"image");
			include.setAttribute('src',"./images/hosts/include.png");
			include.setAttribute('width',"16");
			include.setAttribute('height',"16");
			include.setAttribute('title',WHO.locale.get("Rule::include"));
			include.addEventListener('click',function(e)
			{
				e.preventDefault();
				if(text.value)
				{
					var button = this.getDomainButton(text.value,"includeDomains");
					li.insertBefore(button,newdomain);
				}
				text.value = "";
			}.bind(this),false);
		newdomain.appendChild(include);

		var exclude = document.createElement('input');
			exclude.setAttribute('type',"image");
			exclude.setAttribute('src',"./images/hosts/exclude.png");
			exclude.setAttribute('width',"16");
			exclude.setAttribute('height',"16");
			exclude.setAttribute('title',WHO.locale.get("Rule::exclude"));
			exclude.addEventListener('click',function(e)
			{
				e.preventDefault();
				if(text.value)
				{
					var button = this.getDomainButton(text.value,"excludeDomains");
					li.insertBefore(button,newdomain);
				}
				text.value = "";
			}.bind(this),false);
		newdomain.appendChild(exclude);

		newdomain.addEventListener('focus',function(e)
		{
			newdomain.style.width = "auto";
		},true);

		newdomain.addEventListener('blur',function(e)
		{
			newdomain.style.width = "";
		},true);

		ID('CustomizationsField').appendChild(li);

		return li;
	},
	getDomainButton : function(domain,type)
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

		button.addEventListener('click',function(e)
		{

			ID('SaveChangeCustomizations').style.color="red";

			var type = this.getAttribute('data-type');
			if(type === "includeDomains")
			{
				this.setAttribute('data-apply',"true");
				this.setAttribute('data-type',"excludeDomains");
			}
			else
			if(type === "excludeDomains")
			{
				this.removeAttribute('data-apply');
				this.removeAttribute('data-type');
			}
			else
			{
				this.setAttribute('data-apply',"true");
				this.setAttribute('data-type',"includeDomains");
			}
		},false);

		return button;

	},
};
