/* コンテキストメニューの設定 */

function prefsContextMenus()
{

	var storage = WHO.extension.storage;

	/* 設定値の読み込み */

	var contextMenusConfig = JSON.parse(storage.getItem('contextMenusConfig'))||
	{
		show    : true,
	};

	/* フォームの初期化 */

	var ContextMenu     = document.getElementById('ContextMenu');
	ContextMenu.checked = contextMenusConfig.show;

	/* 変更の保存 */

	ContextMenu.addEventListener('change',saveContextMenuConfig,false);

	function saveContextMenuConfig()
	{

		contextMenusConfig.show  = ContextMenu.checked;

		storage.setItem('contextMenusConfig',JSON.stringify(contextMenusConfig));

		WHO.extension.postMessage('ContextMenus',{method:"setConfig",config:contextMenusConfig});

	}

}
