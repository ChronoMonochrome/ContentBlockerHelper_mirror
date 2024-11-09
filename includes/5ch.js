"use strict";





var WHO = WHO || {};

	WHO.w5ch =
	{

		setHandler : function()
		{

			var ress = document.querySelectorAll('div[data-userid]');

			for(var i = 0,res;res = ress[i];++i)
			{

				res.addEventListener('mouseenter',function(e)
				{

					var userID = e.target.getAttribute('data-userid');

					WHO.extension.postMessage('ContextMenus',
					{
						method : "setUserID",
						userID : userID,
					});

				},false);

			}

		}

	};


WHO.w5ch.setHandler();
