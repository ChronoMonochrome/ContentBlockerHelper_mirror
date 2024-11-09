/* 購読リストの設定 */
function prefsSubscriptions()
{
	/* 初期値 */
	var mask;
	var lang = window.navigator.language.split("-")[0];
	var PublicFilter = JSON.parse(WHO.extension.storage.getItem('PublicFilter'))||[];

	for(var i = 0,subscription;subscription = PublicFilter[i];++i)
	{

		addSubscription(subscription);

	}

	/* フィルタを編集したときボタンを赤く */
	ID('SubscriptionsField').addEventListener('input',function(e)
	{
		if(e.target.getAttribute('class') !== "nob")
		{
			ID('SaveChangeSubscriptions').style.color="red";
		}
	},false);
	ID('SubscriptionsField').addEventListener('change',function(e)
	{
		if(e.target.getAttribute('class') !== "nob")
		{
			ID('SaveChangeSubscriptions').style.color="red";
		}
	},false);

	/* 新しい購読候補を追加 */
	ID('AddNewSubscription').addEventListener('click',function(e)
	{

		addSubscription({title:"New filter",url:"http://"});
		ID('SaveChangeSubscriptions').style.color="red";

	},false);

	/* フィルタの変更を保存 */
	ID('SaveChangeSubscriptions').addEventListener('click',saveSubscriptions,false);
	function saveSubscriptions(e)
	{

		mask = new WHO.screenmask();

		var PublicFilter = JSON.parse(WHO.extension.storage.getItem('PublicFilter'))||[];

		var oldindex = {};
		for(var i =0,sub;sub = PublicFilter[i];++i)
		{
			oldindex[sub.url] = sub;
		}

		var newSubscriptions = [];
		var subs = ID('SubscriptionsField').getElementsByClassName('filter');

		for(var i=0,sub;sub=subs[i];++i)
		{
			var url = sub.getElementsByClassName('url')[0].value;
			var use = sub.getElementsByClassName('use')[0].checked;
			var oi  = oldindex[url];
			var newitem =
			{
				use     : use,
				url     : url,
			};

			if(oi)
			{

				newitem.title    = oi.title;
				newitem.homepage = oi.homepage;
				newitem.lang     = oi.lang;

				if(use)
				{
					newitem.block   = oi.block  || [];
					newitem.allow   = oi.allow  || [];
					newitem.ignore  = oi.ignore || [];
					newitem.hide    = oi.hide   || [];
					newitem.show    = oi.show   || [];
					newitem.update  = oi.update;
				}

			}

			newSubscriptions.push(newitem);

		}

		WHO.extension.storage.setItem('PublicFilter',JSON.stringify(newSubscriptions));

//		if(ID('AlwaysSync').checked)
//		{
//
//			WHO.extension.postMessage('Sync',{method:"backupAll"});
//
//		}

		//購読リストを有効に
		WHO.extension.postMessage('ContentBlockHelper',{method:"updateSubscriptions"});//sendRequest にはタイムアウトがあるらしい

	}

	WHO.extension.addMessageListener('Subscriptions',function(message)
	{
		if(message.method === "updated")
		{
			mask.clear();
			showSubscribedRules();
		}
	});

	function showSubscribedRules(err)
	{

		ID('SaveChangeSubscriptions').style.color="";

		if(err)
		{
			alert(err);
		//	window.open("opera:config#PersistentStorage|DomainQuotaForWidgetPreferences","_blank");
		}
		else
		{

			while(ID('SubscriptionsField').firstElementChild)
			{
				ID('SubscriptionsField').removeChild(ID('SubscriptionsField').firstElementChild);
			}

			var PublicFilter    = JSON.parse(WHO.extension.storage.getItem('PublicFilter'))||[];

			for(var i = 0,subscription;subscription = PublicFilter[i];i++)
			{
				addSubscription(subscription);
			}

		}
	}

	/* 購読先の作成 */

	function addSubscription(sub)
	{
		var li    = document.createElement('li');

		var myClass = "filter";
		if(sub.lang && sub.lang.indexOf(lang) < 0)
		{
			myClass = myClass + " foreign";
		}
		li.setAttribute('class',myClass);

		if(sub.update)
		{
			li.setAttribute('title',new Date(sub.update));
		}
		ID('SubscriptionsField').appendChild(li);

		/* 削除ボタン */

		var del = document.createElement('img');
			del.setAttribute('src',"images/delete.png");
			del.setAttribute('alt',"x");
			del.setAttribute('class',"del");
			del.setAttribute('title',WHO.locale.get("Subscriptions::delete"));
			del.addEventListener('click',(function(li)
			{
				return function(e)
				{
					li.parentNode.removeChild(li);
					ID('SaveChangeSubscriptions').style.color="red";
				}
			})(li),false);
		li.appendChild(del);

		/* トグル */

		var nob = document.createElement('input');
			nob.setAttribute('class',"nob");
			nob.type  = "checkbox";
		li.appendChild(nob);

		var use     = document.createElement('input');
			use.setAttribute('class',"use");
			use.type    = "checkbox";
			use.name    = "use"
			use.value   = "on";
			use.checked = sub.use;
			use.addEventListener('change',function(e){changeUse(e.target)},false);
			function changeUse(use)
			{
				if(use.checked)
				{
					use.setAttribute('title',"Enabled");
				}
				else
				{
					use.setAttribute('title',"Disabled");
				}
			}
			changeUse(use);

		li.appendChild(use);

		var label   = document.createElement('a');
			label.setAttribute('href',sub.homepage||sub.url);
			label.setAttribute('target',"_blank");
			label.setAttribute('class',"label");
			label.appendChild(document.createTextNode(sub.title||""));
		li.appendChild(label);

		var title   = document.createElement('input');
			title.setAttribute('class',"title");
			title.type  = "hidden";
			title.name  = "title"
			title.value = sub.title || "";
		label.appendChild(title);

		/* 購読先アドレス */
		var url   = document.createElement('input');
			url.setAttribute('class',"url");
			url.type  = "text";
			url.name  = "url"
			url.value = sub.url || "";
		li.appendChild(url);

		/* フィルタ一覧 */

		if(sub.block)
		{

			var filters = null;

			/* 高度なフィルタ */

		//	if(typeof sub.rules[0] === "object")
		//	{
				filters   = document.createElement('dl');
				filters.setAttribute('class',"filters");

				var Blabel = document.createElement('dt');
					Blabel.appendChild(document.createTextNode(WHO.locale.get('Rule::act::block')));
				filters.appendChild(Blabel);
				var block = document.createElement('dd');
					block.appendChild(document.createTextNode(sub.block.length));
				filters.appendChild(block);

				var Alabel = document.createElement('dt');
					Alabel.appendChild(document.createTextNode(WHO.locale.get('Rule::act::allow')));
				filters.appendChild(Alabel);
				var allow = document.createElement('dd');
					allow.appendChild(document.createTextNode(sub.allow.length));
				filters.appendChild(allow);

				var Ilabel = document.createElement('dt');
					Ilabel.appendChild(document.createTextNode(WHO.locale.get('Rule::act::ignore')));
				filters.appendChild(Ilabel);
				var ignore = document.createElement('dd');
					ignore.appendChild(document.createTextNode(sub.ignore.length));
				filters.appendChild(ignore);

				var Clabel = document.createElement('dt');
					Clabel.appendChild(document.createTextNode(WHO.locale.get('CSSRules')));
				filters.appendChild(Clabel);

				var hide = document.createElement('dd');
					hide.appendChild(document.createTextNode(sub.hide.length));
				filters.appendChild(hide);

				var show = document.createElement('dd');
					show.appendChild(document.createTextNode(sub.show.length));
				filters.appendChild(show);

			li.appendChild(filters);
		}

		return li;
	}


}
