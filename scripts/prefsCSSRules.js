/* CSS 規則の設定 */
var prefsCSSRules =
{

	init : function(dic)
	{

		/* 設定値の読み込み */

		var CSSRules = JSON.parse(WHO.extension.storage.getItem('CSSRules'))||{};

		/* フォームの初期化 */

		Object.keys(CSSRules).sort(function(a,b){return WHO.URL.getDomain(a) > WHO.URL.getDomain(b) ? 1 : -1;}).forEach(function(url)//for(var url in CSSRules)
		{

			var parent = this.createGroup(url);
			parent.value = CSSRules[url].join("\n");

		},this);

		/* フィルタを編集したときボタンを赤く */

		ID('CSSRulesField').addEventListener('input',function(e)
		{
			ID('SaveChangeCSSRules').style.color="red";
		},false);

		//削除

		ID('CSSRulesField').addEventListener('click',this.remove.bind(this),false);

		/* 新しいフィルタを追加 */

		ID('AddNewCSSRule').addEventListener('click',this.add.bind(this),false);

		/* フィルタをクリア */

		ID('ClearCSSRule').addEventListener('click',this.clear.bind(this),false);

		/* CSS 規則の変更を保存 */

		ID('SaveChangeCSSRules').addEventListener('click',this.save.bind(this),false);

	},

	add   : function(e)
	{
		var url = prompt("URL pattern");
		if(!url)
		{
			alert("Error!");
		}
		else
		{
			this.addRule(url,"");
			ID('SaveChangeCSSRules').style.color="red";
		}
	},
	remove :function(e)
	{
		if(e.target.getAttribute('class') === "del")
		{
			var li = e.target.parentNode;
			li.parentNode.removeChild(li);
			ID('SaveChangeCSSRules').style.color="red";
		}
	},
	clear : function(e)
	{

		ID('ClearCSSRule').style.opacity = "0.5";

		var parent = ID('CSSRulesField');

		parent.style.display = "none"

		while(parent.firstElementChild)
		{
			parent.removeChild(parent.firstElementChild);
		}

		parent.style.display = ""

		ID('ClearCSSRule').style.opacity     = "";
		ID('SaveChangeCSSRules').style.color = "red";

	},
	save : function(e)
	{

		var newCSSRules = {};

		var groups  = ID('CSSRulesField').getElementsByClassName('group');
		for(var i=0,group;group=groups[i];++i)
		{
			var url       = group.getElementsByClassName('url')[0].value;
			var selectors = group.getElementsByClassName('filters')[0].value.replace(/^(\r?\n)+/g,"").split(/(?:\r?\n)+/);
			newCSSRules[url] = newCSSRules[url] || [];
			for(var j=0,selector;selector=selectors[j];++j)
			{
				if(newCSSRules[url].indexOf(selector) < 0)
				{
					newCSSRules[url].push(selector);
				}
			}
		}
		WHO.extension.storage.setItem('CSSRules',JSON.stringify(newCSSRules));
		ID('SaveChangeCSSRules').style.color="";

		WHO.extension.postMessage('ContentBlockHelper',{method:"updateCSS"});

	},
	createGroup : function(pattern)
	{
		var li    = document.createElement('li');
			li.setAttribute('title',pattern);
			li.setAttribute('class',"group");

		var del = document.createElement('img');
			del.setAttribute('src',"images/delete.png");
			del.setAttribute('alt',"x");
			del.setAttribute('class',"del");
			del.setAttribute('title',WHO.locale.get("CSSRules::delete"));
		li.appendChild(del);

		var img = document.createElement('img');
			img.setAttribute('width',"16");
			img.setAttribute('width',"16");
			img.setAttribute('src',"http://www.google.com/s2/favicons?domain=" + WHO.URL.getDomain(pattern));
		li.appendChild(img);

		/* フィルタ */
		var url   = document.createElement('input');
			url.setAttribute('class',"url");
			url.type  = "text";
			url.name  = "url"
			url.setAttribute('value',pattern);
			url.addEventListener('change',function(e)
			{
				url.setAttribute('value',this.value);
			},false);
		li.appendChild(url);

		var textarea    = document.createElement('textarea');
			textarea.setAttribute('class',"filters");
		li.appendChild(textarea);

		ID('CSSRulesField').appendChild(li);
		return textarea;
	},

	/* CSS 規則の作成 */
	addRule : function(url,rule)
	{
		var parent = ID('CSSRulesField').querySelector('input[value="' + url + '"] + textarea') || this.createGroup(url);

		parent.value = parent.value ? parent.value + "\n" + rule : rule;
	},
};
