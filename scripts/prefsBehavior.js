/* 全般の機能設定 */

function prefsBehavior()
{

	/* 設定値の読み込み */

	var behavior       = JSON.parse(WHO.extension.storage.getItem('behavior'))||
	{
		subscribeinterval:10,
		alwayssync       :false,
	};

	/* フォームの初期化 */

	ID('SubscribeInterval').value = behavior.subscribeinterval||0;
//	ID('AlwaysSync').checked      = behavior.alwayssync;

	/* 変更の保存 */

	ID('General').addEventListener('change',function(e)
	{

		behavior.subscribeinterval = parseInt(ID('SubscribeInterval').value);
//		behavior.alwayssync        = ID('AlwaysSync').checked;

		WHO.extension.storage.setItem('behavior',JSON.stringify(behavior));
		WHO.extension.postMessage('Config',{method:"setPrefs",name:"behavior",value:behavior});

//		if(e.target === ID('AlwaysSync'))
//		{
//
//			if(ID('AlwaysSync').checked)
//			{
//				alert(WHO.lang["General::AlwaysSync::description"]);
//
//				WHO.extension.postMessage('Sync',{method:"beginSync"});
//
//			}
//
//		}

	},false);

}
