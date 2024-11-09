/* イベントブロックの設定 */

function prefsUIProtection()
{

	/* 設定値の読み込み */

	var UIProtection       = JSON.parse(WHO.extension.storage.getItem('UIProtection'))||
	{
		default : 0,
		site    : {},
	};

	/* フォームの初期化 */

	var forms = ID('UIProtection').getElementsByTagName('input');

	for(var i = 0,form;form = forms[i];++i)
	{
		if(UIProtection.default & (2 ** parseInt(form.value)))
		{
			form.checked = true;
		}
	}

	/* 変更の保存 */

	ID('General').addEventListener('change',function(e)
	{

		var newDefault = 0;

		for(var i = 0,form;form = forms[i];++i)
		{
			if(form.checked)
			{
				newDefault = newDefault | (2 ** parseInt(form.value));
			}
		}

		UIProtection.default = newDefault;

		WHO.extension.storage.setItem('UIProtection',JSON.stringify(UIProtection));

		WHO.extension.postMessage('Config',{method:"setPrefs",name:"UIProtection",value:UIProtection});

	},false);

}
