/* UIの保護の設定 */

var UIProtect = 
{

	start : function(url)
	{
		/* 設定値の読み込み */

		this.hostname = WHO.URL.getHostname(url);

		this.prefs = JSON.parse(WHO.extension.storage.getItem('UIProtection'))||
		{
			default : 0,
			site    : {},
		};

		if(typeof this.prefs.site[this.hostname] === "undefined")
		{
			this.myPrefs = this.prefs.default;
		}
		else
		{
			this.myPrefs = this.prefs.site[this.hostname];
		}

		/* フォームの初期化 */

		this.forms = ID('UIProtection').getElementsByTagName('input');

		for(var i = 0,form;form = this.forms[i];++i)
		{
			if(this.myPrefs & (2 ** parseInt(form.value)))
			{
				form.checked = true;
			}
		}

		/* 変更の保存 */

		ID('UIProtection').addEventListener('change',function(e)
		{

			var newPrefs = 0;

			for(var i = 0,form;form = this.forms[i];++i)
			{
				if(form.checked)
				{
					newPrefs = newPrefs | (2 ** parseInt(form.value));
				}
			}

			if(this.prefs.default !== newPrefs)
			{
				this.prefs.site[this.hostname] = newPrefs;
			}
			else
			{
				delete this.prefs.site[this.hostname];
			}

			WHO.extension.storage.setItem('UIProtection',JSON.stringify(this.prefs));

			WHO.extension.postMessage('Config',{method:"setPrefs",name:"UIProtection",value:this.prefs});

		}.bind(this),false);
	},

};
