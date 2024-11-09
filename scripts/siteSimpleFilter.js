/* 簡易ブロックの設定 */
var simpleFilter = 
{

	types : 
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
	start : function(url,contents)
	{

		var top = 40;

		/* 初期値 */
		this.hostname = WHO.URL.getHostname(url);
		this.domain   = WHO.URL.getDomain(url);

		this.rules = JSON.parse(WHO.extension.storage.getItem('SimpleFilter'))||{};
		this.containers = {};
		this.forms = {};
		this.siteRules  = {};

		Object.keys(contents).forEach(function(src,i)
		{

			var type = contents[src].type;
			type = type === "subdocument" ? "sub_frame" : type;
			this.forms[type] = true;

		},this);

		this.types.forEach(function(type)
		{

			this.rules[type] = this.rules[type]||0;

			if(this.forms[type])
			{

				this.initSiteRule(type);

				/* フォームの初期化 */
				this.containers[type] = this.createContainer(type);
				this.containers[type].value      = (this.siteRules[type] + 1).toString(2).length - 1;//script === 3 ? 7 : script||0;// 3:同一ドメイン → 7:同一ホスト
				this.setTitle(type);

				top = top + 16;

			}

		},this);

		ID('Details').style.top = top + "px";


		/* 変更の保存 */

		ID('SimpleFilter').addEventListener('input',function(e)
		{

			mainPage.lock = false;

			this.types.forEach(function(type)
			{

				if(this.forms[type])
				{

					this.siteRules[type] = (1 << (parseInt(this.containers[type].value)||0)) - 1;
					this.setTitle(type);
					this.save(type);

				}

			},this);

			WHO.extension.postMessage('ContentBlockHelper',{method:"updateSimpleFilter"});  //簡易フィルタを再読み込み
			WHO.extension.postMessage('ContentBlockHelper',{method:"updateResourcesState"});// リソースの表示を切り替える
		//	WHO.extension.sendRequest('getActiveResources',{method:"update"},mainPage.updateResources.bind(mainPage));

		}.bind(this),false);

	},

	setTitle : function(type)
	{

		var element = this.containers[type];
		var value   = element.value;

		element.title = WHO.locale.get("Rule::type::"+ type) + " : " + WHO.locale.get("SimpleFilter::level::" + value);

	},

	/* ドメイン毎の設定を取得する */

	initSiteRule : function(type)
	{

		var siteRule = JSON.parse(WHO.extension.storage.getItem('SimpleFilter_' + type))||{};
		var level    = null;

		// 古い設定があるとき
		if(typeof siteRule[this.hostname] !== "undefined")
		{
			level = siteRule[this.hostname]
		}

		// 現在の設定 → ドメイン毎に同じにする
		if(typeof siteRule[this.domain] !== "undefined")
		{
			level = level | siteRule[this.domain]
		}

		this.siteRules[type] = level === null ? this.rules[type] : level;

	},

	/* 設定を保存する */

	save : function(type)
	{

		var filterName = "SimpleFilter_" + type;
		var filters = JSON.parse(WHO.extension.storage.getItem(filterName))||{};

		delete filters[this.hostname];//古い設定を削除

		if(this.siteRules[type] !== this.rules[type])
		{
			filters[this.domain] = this.siteRules[type];
		}
		// 一般設定と同じ時 → 設定を削除
		else
		{
			delete filters[this.domain];
		}

		WHO.extension.storage.setItem(filterName,JSON.stringify(filters));

	},

	createContainer : function(type)
	{
		var p      = document.createElement('p');
		var label  = document.createElement('label');
		p.appendChild(label);
		var before = document.createElement('img');
			before.setAttribute('src',"images/types/" + type + ".png");
			before.setAttribute('title',WHO.locale.get("SimpleFilter::level::0"));
		var input  = document.createElement('input');
			input.setAttribute('type',"range");
			input.setAttribute('min',"0");
			input.setAttribute('max',"5");
		var after  = document.createElement('img');
			after.setAttribute('src',"images/types/" + type + ".png");
			after.setAttribute('title',WHO.locale.get("SimpleFilter::level::5"));
		label.appendChild(before);
		label.appendChild(input);
		label.appendChild(after);

		ID('SimpleFilter').appendChild(p);

		return input;

	},

};
