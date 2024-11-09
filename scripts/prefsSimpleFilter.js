/* 簡易ブロックの設定 */

var prefsSimpleFilter = 
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
	init : function(dic)
	{

		this.dic    = dic;
		this.inputs = {};

		/* 設定値の読み込み */

		this.rules       = JSON.parse(WHO.extension.storage.getItem('SimpleFilter'))||{};

		this.types.forEach(function(type)
		{

			this.rules[type] = this.rules[type]||0;
			/* フォームの初期化 */
			this.inputs[type]       = this.createContainer(type);
			this.inputs[type].value = ((this.rules[type]||0) + 1).toString(2).length - 1;
			this.setTitle(type);

		},this);


		/* 変更の保存 */

		ID('General').addEventListener('change',this.save.bind(this),false);

	},

	setTitle : function(type)
	{

		var value   = this.inputs[type] .value;

		this.inputs[type].title = WHO.locale.get("Rule::type::"+ type) + " : " + WHO.locale.get("SimpleFilter::level::" + value);

	},

	save : function(e)
	{

		this.types.forEach(function(type)
		{

			this.rules[type] = (1 << (parseInt(this.inputs[type].value)||0)) - 1;
			this.setTitle(type);

		},this);


		WHO.extension.storage.setItem('SimpleFilter',JSON.stringify(this.rules));

		WHO.extension.postMessage('ContentBlockHelper',{method:"updateSimpleFilter"});

	},

	createContainer : function(type)
	{
		var p      = document.createElement('p');
		var label  = document.createElement('label');
		p.appendChild(label);
		label.appendChild(document.createTextNode(WHO.locale.get("Rule::type::" + type)));
		var span = document.createElement('span');
		label.appendChild(span);
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
		span.appendChild(before);
		span.appendChild(input);
		span.appendChild(after);

		ID('SimpleFilter').appendChild(p);

		return input;

	},

};
