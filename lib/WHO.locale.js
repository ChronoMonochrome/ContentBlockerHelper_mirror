// This file is used in "LinkRedirector" also. You can skip review if this is not "LinkRedirector".
/****************************************************************************************************/
/* Language API                                                                                     */
/*

// This file provides Locale API.

	Object WHO.locale

		Methods

			get       : strings WHO.locale.get(strings id,String defaultString)
				Gets strings value tied to id.

			load      : void WHO.locale.load(String filename,Function callback)
				Load dictionary file and set it dic property.

			translate : void WHO.locale.translate(Strings filename,Function callback)
				Load dictionary file and set it dic property and translate all documents.

			loadJSONFile : void WHO.locale.loadJSONFile(Strings filename,Function callback)
				Load dictionary file.

				Any callback gets dictionary data.

		Properties

			dic : object dictionary
                                                                                                    */
/****************************************************************************************************/

// requrire("WHO.extension.js"||"0.extension.js");

var WHO = WHO || {};

	WHO.locale =
	{

		dic       : {},

		get : function(id,def)
		{

			return this.dic[id]||def||id;

		},

		/* 特定の要素を言語ファイルに応じて書き換える */

		_translateElement : function(element)
		{

			var self = this;

			var child = element.childNodes;

			for(var i = 0;i < child.length;++i)
			{
				var node = child[i];

				//テキスト

				if(node && node.nodeType === 3)
				{

					node.nodeValue = node.nodeValue.replace(/\[\:([\w:]+)\:\]/gi,function(a,a1){return self.dic[a1]||a});

				}
				else

				//属性値

				if(node.nodeType === 1)
				{

					this._translateElement(node);
					var attrs = node.attributes;
					for(var j = 0;j < attrs.length;++j)
					{
						var attr = attrs[j];
						attr.value = attr.value.replace(/\[\:([\w:]+)\:\]/gi,function(a,a1){return self.dic[a1]||a});
					}

				}
			}

		},

		/* 辞書ファイルを読み込んでセットする */

		load : function(filename,callback)
		{

			var self = this;

			this.loadJSONFile(filename||"configurations/lang.json",function(dic)
			{

				self.dic = dic;
				callback(dic);

			});

		},

		/* 言語設定ファイルを読み込んで html を書き換える */

		translate : function(filename,callback)
		{

			var self = this;

			this.loadJSONFile(filename||"configurations/lang.json",function(dic)
			{

				self.dic = dic;

				/* html lang="en" を変更 */
				if(document && document.documentElement)
				{

					document.documentElement.setAttribute('lang',dic["lang"]);

				}

				if(!document.readyState || document.readyState === "loading")
				{
					/* DOM が構築されていない時*/
					document.addEventListener('DOMContentLoaded',function _onload()
					{

						document.removeEventListener('DOMContentLoaded',_onload);//イベントを削除

						self._translateElement(document.body);
						document.body.style.display = "block";
						callback(dic);

					});

				}
				else
				{

					self._translateElement(document.body);
					document.body.style.display = "block";
					callback(dic);

				}

			});

		},

	};

/****************************************************************************************************/

	// Bug::Firefox::0005 : chrome.runtime.getPackageDirectoryEntry is not implemented.
	if(WHO.extension.isFirefox || WHO.extension.isEdge || (!WHO.extension.isBackground && !WHO.extension.isExtensionPage))
	{

		WHO.locale.loadJSONFile = function(filename,callback)
		{

			var dic = {};
			var files = [filename];
			var locale = window.navigator.language;
			if(/(\w+)-(\w)/.test(locale))
			{
				files.push("locales/" + RegExp.$1 + "/" + filename);
			}
			files.push("locales/" + locale + "/" + filename);

			/* 一時オブジェクトの結合 */
			var addData = function(obj)
			{
				for(var key in obj)
				{
					dic[key] = obj[key];
				}
			};

			var loadJSONFile = function()
			{
				if(files.length > 0)
				{
					_getData(WHO.extension.getURL(files.shift()),function(obj)
					{

						addData(obj);
						loadJSONFile();

					},function()
					{
						callback(dic);
						callback = function(){};
					});//onerror
				}
				else
				{
					callback(dic);
					callback = function(){};
				}
			};

			loadJSONFile();

			function _getData(fullpath,callback,onerror)
			{
				var xhr = new XMLHttpRequest();
				try
				{
					xhr.open("GET",fullpath,true);
					xhr.responseType = "json";
					xhr.onload = function(e)
					{
						if(xhr.readyState === 4)
						{
							if(xhr.status === 200)
							{
								callback(xhr.response);
							}
							else
							{
								onerror(xhr.statusText);
							}
						}
					};
					xhr.onerror = function(e)
					{
						onerror(xhr.statusText);
					};
					xhr.send(null);
				}
				catch(e)
				{
					onerror(e);
				}
			}

		};

	}
	else
	if(WHO.extension.isBlink)
	{

		WHO.locale.loadJSONFile = function(filename,callback)
		{

			var dic = {};
			var files = [filename];
			var locale = window.navigator.language;
			if(/(\w+)-(\w)/.test(locale))
			{
				files.push("locales/" + RegExp.$1 + "/" + filename);//ja
			}
			files.push("locales/" + locale + "/" + filename);//ja-jp

			/* 一時オブジェクトの結合 */
			var addData = function(obj)
			{
				for(var key in obj)
				{
					dic[key] = obj[key];
				}
			};

			var loadJSONFile = function(dir)
			{
				if(files.length > 0)
				{
					dir.getFile(files.shift(),{},function(file)
					{
						file.file(function(blob)
						{

							var reader = new FileReader();

							reader.onload = function(r)
							{

								addData(JSON.parse(r.target.result));
								loadJSONFile(dir);

							};

							reader.readAsText(blob,"utf-8");
						});

					},function()
					{
						callback(dic);
					});
				}
				else
				{
					callback(dic);
				}
			};

			chrome.runtime.getPackageDirectoryEntry(loadJSONFile);

		};

	}

/****************************************************************************************************/
