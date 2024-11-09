"use strict";

var temps =
[
	{name:"5ch Wname",domain:"5ch.net",query:"div:[data-userid]",attname:"data-userid",temp:'div[data-userid*="?"]'},
];



var WHO = WHO || {};

	WHO.w5ch =
	{

		setHandler : function()
		{

			for(var j = 0,tdata;tdata = temps[j];++j)
			{
				var ress = document.querySelectorAll(tdata.query);

				for(var i = 0,res;res = ress[i];++i)
				{

					res.addEventListener('mouseenter',function(e)
					{

						var attr = e.target.getAttribute(tdata.attname');

						WHO.extension.postMessage('ContextMenus',
						{
							method    : "setTempCode",
							blockcode : tdata.temp.replace(/\?/,attr),
						});

					},false);

					res.addEventListener('mouseleave',function(e)
					{

						var attr = e.target.getAttribute(tdata.attname');

						WHO.extension.postMessage('ContextMenus',
						{
							method    : "removeTempCode",
							blockcode : tdata.temp.replace(/\?/,attr),
						});
					},false);

				}

			}
		}

	};


WHO.w5ch.setHandler();
