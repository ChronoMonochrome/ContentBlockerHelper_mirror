"use strict";
// Remove inline script elements and event handlers.
// Bug::Firefox::0012

/* インラインスクリプトを削除する */
var destroyInlineScriptWasLoaded = destroyInlineScriptWasLoaded||false;//重複を避ける

var destroyInlineScript = function()
{

	if(!destroyInlineScriptWasLoaded)
	{

		console.info("Inline scripts are destroyed on",window.location.href);
		destroyInlineScriptWasLoaded = true;

		/* If beforescriptexecute is implemented : now only implemented on Firefox */
		if(typeof document.onbeforescriptexecute === "object")
		{

			//Blink では未実装
			document.addEventListener('beforescriptexecute',function(e)
			{

				if(!e.target.src && !e.target.hasAttribute('data-cbh-dummy'))
				{

				//	console.info("An Inline script is destroyed",window.location.href,e.target);

					e.target.textContent = "";
					e.target.setAttribute('data-cbh-blocked',"blocked");
					e.preventDefault();

				}

			},false);

		}
		else

		/* Blink */
		{

			var observer = new window.MutationObserver(function(mutations)
			{
				mutations.forEach(function(e)
				{

					if(e.type ==="childList" && e.addedNodes)
					{
						for(var i = 0,node;node = e.addedNodes[i];++i)
						{

							if(node.nodeType === 1)
							{
								removeScript(node);
							}

						}

					}
				
				});
			});

			/* ノード挿入を監視 */

			observer.observe(document.documentElement,
			{
				childList  : true,
				subtree    : true,
				attributes : true,
			});

		}

		/* on**** 属性を全て取り除く */
		// blocked/inline-script.js に移行
		// on-- 属性は conten_script から変更しても別の名前空間になって削除できない
		var s = document.createElement("script");
		s.src = chrome.runtime.getURL("blocked/inline-script.js");
		s.setAttribute("data-cbh-dummy","dummy");
		s.setAttribute("id","__OnAttributesRemover__");
		document.documentElement.appendChild(s);

		/* 既に注入された script */

		var scripts = document.getElementsByTagName("script");

		for(var i = 0,node;node = scripts[i];++i)
		{
			if(!node.src)
			{
				console.info("An Inline script is already loaded",window.location.href,node);
			//	removeScript(node);//既に注入された script は削除しても実行される
			}
		}

	}

}

function removeScript(element)
{

	if(!element.hasAttribute('data-cbh-dummy') && !element.hasAttribute('data-cbh-blocked'))
	{

		var newElement = null;

		/* src の無い script を削除 */

		if(element.localName === "script" && !element.src)
		{

		//	console.info("An Inline script is Destroyed",window.location.href,element);

			newElement = document.createElement('script');
			newElement.setAttribute('data-cbh-blocked',"blocked");
			element.parentNode.insertBefore(newElement,element);
			element.parentNode.removeChild(element);

		}

	}

}

// only for firefox because firefox's bug
// Bug::Firefox::0012 : content_script methods called by runtime never access DOM of window.
if(typeof document.onbeforescriptexecute === "object")
{

	chrome.runtime.sendMessage({name:"destroyInlineScript"},function(message)
	{

		if(message && message.destroyInlineScript && message.act === "block")
		{
			destroyInlineScript();
		}

	});

}
else
{
	destroyInlineScript();
}
