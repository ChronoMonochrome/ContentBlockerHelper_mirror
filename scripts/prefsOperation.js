/* ショートカットキーの設定 */

function prefsOperation()
{

	/* 設定値の読み込み */

	var shortcutkey = JSON.parse(WHO.extension.storage.getItem('shortcutkey'))||
	{
		button :
		{
			altKey   : true,
			shiftKey : true,
			ctrlKey  : false,
			keyCode  : 66//"b"
		},
		iframe :
		{
			altKey   : true,
			shiftKey : true,
			ctrlKey  : false,
			keyCode  : 73//"i"
		},
		module :
		{
			altKey   : true,
			shiftKey : true,
			ctrlKey  : false,
			keyCode  : 77//"m"
		},
		script :
		{
			altKey   : true,
			shiftKey : true,
			ctrlKey  : false,
			keyCode  : 83//"s"
		},
		css :
		{
			altKey   : true,
			shiftKey : true,
			ctrlKey  : false,
			keyCode  : 67//"c"
		},
		finish :
		{
			altKey   : true,
			shiftKey : true,
			ctrlKey  : false,
			keyCode  : 68//"d"
		},
	};

	/* フォームの初期化 */

	var lis = document.querySelectorAll('#Shortcutkey li');
	for(var i = 0,li;li = lis[i];++i)
	{
		var mode = li.getAttribute('class');
		var select = li.getElementsByTagName('select')[0];
		li.querySelector('[name="altKey"]').checked   = shortcutkey[mode].altKey;
		li.querySelector('[name="shiftKey"]').checked = shortcutkey[mode].shiftKey;
		li.querySelector('[name="ctrlKey"]').checked  = shortcutkey[mode].ctrlKey;
		addKey(select,27,"ESC");
		addKey(select,13,"Enter");
		addKey(select,8,"Backspace");
		addKey(select,46,"Insert");
		addKey(select,46,"Delete");
		addKey(select,37,"Left");
		addKey(select,38,"Up");
		addKey(select,39,"Right");
		addKey(select,40,"Down");
		setFunctionKeyCode(select);//Function
		setKeyCode(select,48,57);//0-9
		setKeyCode(select,65,91);//a-z
		addKey(select,188,",");
		addKey(select,190,".");
		addKey(select,191,"/");
		addKey(select,219,"[");
		addKey(select,220,"\\");
		addKey(select,221,"]");
		select.value = shortcutkey[mode].keyCode;
	}

	function setKeyCode(select,s,e)
	{
		for(var keyCode = s;keyCode < e;++keyCode)
		{
			var char = String.fromCharCode(keyCode);
			addKey(select,keyCode,char);
		}
	}
	function setFunctionKeyCode(select)
	{
		for(var keyCode = 1;keyCode <= 12;++keyCode)
		{
			var char = "F" + keyCode;
			addKey(select,111 + keyCode,char);
		}
	}

	function addKey(select,keyCode,char)
	{
		var option = document.createElement('option');
			option.setAttribute('value',keyCode);
			option.appendChild(document.createTextNode(char));
		select.appendChild(option);
	}

	/* 変更の保存 */

	ID('Shortcutkey').addEventListener('change',function(e)
	{
		var lis = document.querySelectorAll('#Shortcutkey li');
		for(var i = 0,li;li = lis[i];++i)
		{
			var mode = li.getAttribute('class');
			shortcutkey[mode].altKey   = li.querySelector('[name="altKey"]').checked;
			shortcutkey[mode].shiftKey = li.querySelector('[name="shiftKey"]').checked;
			shortcutkey[mode].ctrlKey  = li.querySelector('[name="ctrlKey"]').checked;
			shortcutkey[mode].keyCode  = parseInt(li.getElementsByTagName('select')[0].value);
		}
		WHO.extension.storage.setItem('shortcutkey',JSON.stringify(shortcutkey));
		WHO.extension.postMessage('Config',{method:"setPrefs",name:"shortcutkey",value:shortcutkey});
	},false);

}
