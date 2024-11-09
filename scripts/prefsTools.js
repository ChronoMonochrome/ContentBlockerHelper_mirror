/* 設定データの入出力 */

function prefsTools()
{

	/* フィルタをインポート */
	ID('ImportPreferences').addEventListener('change',openPreferencesFile,false);

	function openPreferencesFile(e)
	{
		var reader = new FileReader();
		reader.onload = function(e)
		{
			try
			{
				importPreferences(JSON.parse(e.target.result));
			}
			catch(e)
			{
				alert("Error! It's not the preferences ContentBlockHelper!");
			}
		}
		if(ID('ImportPreferences').files[0])
		{
			reader.readAsText(ID('ImportPreferences').files[0], "utf-8");
		}
	}

	function importPreferences(prefs)
	{

		/* 画面をマスクする */

		var mask = new WHO.screenmask();

		/* 設定を読み込んだ後にページを再読み込み */

		WHO.extension.addMessageListener('Subscriptions',function(message)
		{
			if(message.method === "updated")
			{
				mask.clear();
				window.location.reload();
			}
		});

		/* 設定を読み込む */

		WHO.extension.storage.setItem('dataVersion'             ,prefs.dataVersion);

		Object.keys(prefs).forEach(function(key)
		{

			if(key !== "dataVersion")
			{
				WHO.extension.storage.setItem(key,JSON.stringify(prefs[key]));
			}

		},this);

		/* 設定を適用する */

		WHO.extension.postMessage('ContentBlockHelper',{method:"UpdateData"});//データ形式の更新

		WHO.extension.postMessage('Config',{method:"setPrefs",name:"behavior",value:prefs.behavior});
		WHO.extension.postMessage('Config',{method:"setPrefs",name:"shortcutkey",value:prefs.shortcutkey});
		WHO.extension.postMessage('Config',{method:"setPrefs",name:"UIProtection",value:prefs.UIProtection});

		WHO.extension.postMessage('ContentBlockHelper',{method:"updateSimpleFilter"});
		WHO.extension.postMessage('ContentBlockHelper',{method:"updateCustomizations"});
		WHO.extension.postMessage('ContentBlockHelper',{method:"updateSubscriptions"});

	}

	/* 設定データをエクスポート */
	ID('ExportPreferences').addEventListener('click',exportPreferences,false);
	function exportPreferences(e)
	{

		var Sub = [];
		var PublicFilter = JSON.parse(WHO.extension.storage.getItem('PublicFilter'))||[];
		PublicFilter.forEach(function(sub)
		{
			Sub.push(
			{
				"url" : sub.url,
				"use" : sub.use,
			});
		});

		var prefs = 
		{
			dataVersion              : JSON.parse(WHO.extension.storage.getItem('dataVersion')),
			behavior                 : JSON.parse(WHO.extension.storage.getItem('behavior')),
			shortcutkey              : JSON.parse(WHO.extension.storage.getItem('shortcutkey')),
			UIProtection             : JSON.parse(WHO.extension.storage.getItem('UIProtection')),
			SimpleFilter             : JSON.parse(WHO.extension.storage.getItem('SimpleFilter')),
			PublicFilter             : Sub,
			CustomFilter             : JSON.parse(WHO.extension.storage.getItem('CustomFilter')),
			CSSRules                 : JSON.parse(WHO.extension.storage.getItem('CSSRules')),
		};

		// サイト毎の簡易フィルタ
		prefsSimpleFilter.types.forEach(function(type)
		{

			prefs["SimpleFilter_" + type] = JSON.parse(WHO.extension.storage.getItem('SimpleFilter_' + type));

		},this);

		var date = (new Date()).toISOString().slice(0,10);
		var browser = WHO.extension.isOPR ? "Opera" : WHO.extension.isFirefox ? "Firefox" : WHO.extension.isVivaldi ? "Vivaldi" : "Chrome";

		downloadJsonData(browser + "-" + date + ".cbh",prefs);

		ID('ExportPreferences').nextElementSibling.style.opacity="";

		e.preventDefault();

	}

}
