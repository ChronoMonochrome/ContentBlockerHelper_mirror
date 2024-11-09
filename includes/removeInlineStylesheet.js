"use strict";
// Copyright (c) 2016-2016 by FAR/RAKUDA All Rights Reserved

/****************************************************************************************************/
/* ContentBlockHelper RemoveInlineStylesheet                                                        */
/*
                                                                                                    */
/****************************************************************************************************/
var WHO = WHO || {};

WHO.removeInlineStylesheet = 
{
	start : function()
	{
		this.getPrefs();
	},
	getPrefs : function()
	{
		WHO.extension.sendRequest('ContentBlockHelper',
		{
			method:"testSrc",
			src   :
			{
				type : "stylesheet",
				url  : window.location.href,
			}
		},this.detectStyle.bind(this));
	},
	detectStyle : function(message)
	{

		if(message && message.act === "block")
		{
			if(!this.observer)
			{

				this.observer = new window.MutationObserver(function(mutations)
				{

					mutations.forEach(function(e)
					{

						if(e.type ==="childList" && e.addedNodes)
						{
							for(var i = 0,node;node = e.addedNodes[i];++i)
							{

								if(node.nodeType === 1)
								{
									this.neutralizeStyleElement(node);
								}

							}

						}
						else
						if(e.type === "attributes" && e.attributeName === "style")
						{
							this.nuetralizeStyleAttribute(e.target);
						}

					},this);

				}.bind(this));

				/* ノード挿入を監視 */
				this.observer.observe(document.documentElement,
				{
					childList  : true,
					subtree    : true,
					attributes : true,
				});

				/* 注入済み style 要素を無効化 */
				var elements = document.getElementsByTagName("style");

				for(var i = 0,element;element = elements[i];++i)
				{

					this.neutralizeStyleElement(element);

				}

				/* 注入済み style 属性を無効化 */

				var elements = document.querySelectorAll('*');

				for(var i = 0,element;element = elements[i];++i)
				{

					this.nuetralizeStyleAttribute(element);

				}

			}
		}
		else
		if(this.observer)
		{

			this.observer.disconnect();
			this.observer = null;

			var elements = document.querySelectorAll('style');

			for(var i = 0,element;element = elements[i];++i)
			{

				this.activateStyleElement(element);

			}

			var elements = document.querySelectorAll('*[data-cbh-style]');

			for(var i = 0,element;element = elements[i];++i)
			{

				this.activateStyleAttribute(element);

			}
		}
	},

	/* style 要素を無効化する */

	neutralizeStyleElement : function(element)
	{

		if(!element.hasAttribute('data-cbh-dummy') && !element.hasAttribute('data-cbh-blocked'))
		{

			/* src の無い script を削除 */

			if(element.localName === "style")
			{

				element.setAttribute('data-cbh-blocked',"blocked");
				element.setAttribute('data-cbh-style',element.textContent);
				element.textContent = "";

			}

		}

	},

	/* style 要素を再適用する */

	activateStyleElement : function(element)
	{

		if(!element.hasAttribute('data-cbh-dummy'))
		{

			var newElement = element.cloneNode(true);;

			if(element.hasAttribute('data-cbh-style'))
			{
				newElement.textContent = element.getAttribute('data-cbh-style');
				newElement.removeAttribute('data-cbh-style');
			}
			newElement.removeAttribute('data-cbh-blocked');

			element.parentNode.insertBefore(newElement,element);
			element.parentNode.removeChild(element);

		}

	},

	/* style 属性を無効化する */

	nuetralizeStyleAttribute : function(element)
	{
		if(!element.hasAttribute('data-cbh-dummy') && element.hasAttribute('style'))
		{
			var style = element.getAttribute('style');
			element.setAttribute('data-cbh-style',style);
			element.removeAttribute('style');
		}
	},

	/* style 属性を再適用する */

	activateStyleAttribute : function(element)
	{
		var style = element.getAttribute('data-cbh-style');
		element.setAttribute('style',style);
		element.removeAttribute('data-cbh-style');
	},

};

WHO.removeInlineStylesheet.start();
