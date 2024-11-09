// Remove on-- attributes as event handlers.
// Added at document_start onto html tag.
// このスクリプトが実行される時には既に<script>タグは読み込まれているので削除できない

var __onAttributesRemoverWasLoaded = __onAttributesRemoverWasLoaded||false;//重複を避ける

(function()
{

	if(!__onAttributesRemoverWasLoaded)
	{

		__onAttributesRemoverWasLoaded = true;

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
							removeAttributes(node);
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


		/* 既に読み込まれた on-- attributes の削除 */
		var elements = document.getElementsByTagName("*");
	
		for(var i = 0,element;element = elements[i];++i)
		{
			removeAttributes(element);
		}

	}

	function removeAttributes(element)
	{

		if(!element.hasAttribute('data-cbh-dummy'))
		{

			/* on-- 属性を削除*/
			var attributes = element.attributes;
			for(var i = attributes.length - 1;i >= 0;--i)
			{
				var attname = attributes[i].localName;
				if(attname.indexOf("on") === 0)
				{
					element[attname] = null;
					element.removeAttribute(attname);
					element.setAttribute(attname,"/*removed by ContentBlockHelper*/");
					element.setAttribute('data-cbh-handler',attname);
				}
			}

		}

	}

	/* remove self */
	var my = document.getElementById('__OnAttributesRemover__');
		my.parentNode.removeChild(my);

})();
