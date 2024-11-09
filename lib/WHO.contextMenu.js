// This file is used in "LinkRedirector" also. You can skip review if this is not "LinkRedirector".
/****************************************************************************************************/
/* Context Menu API                                                                                 */
/*

	Manages Context Menus

	WHO.contextMenu

		Methosds

			createItem : MenuItem WHO.contextMenu.createItem(object menuItemProperties)
				Create a menu item.

				menuItemProperties

					type     : string ["separator","normal"]
					contexts : array of strings ["all", "page", "frame", "selection", "link", "editable", "image", "video", "audio", "launcher", "browser_action", or "page_action"]
					title    : string
					onclick  : function(object clickEventParameters)

						clickEventParameters

							pageURL       : string URL of page
							linkURL       : string URL of link
							srcURL        : string URL of src of image or iframe
							selectionText : string
						*	mediaType     : string "image" or "video" or "audio"
							isEditable    : boolean
							tab           : WHO.tab

			show : undefined WHO.contextMenu.show()
				Show the context menus of the extension.

			hide : undeined WHO.contextMenu.hide()
				Hide the context menus of the extension.

			removeAll : undefined WHO.contextMenu.removeAll()

		Properties

			isShown : boolean

	MenuItem

		Methods

			enable : undefined MenuItem.enable()
				Enable the menu item.

			disable : undefined MenuItem.disable()
				Disable the menu item.

			add : undefined MenuItem.add()
				Add the menu item to bottom of menu.

			remove : undefined MenuItem.remove(boolean destroy)
				Remove the menu item from menu.

			update : undefined MenuItem.update(object menuItemProperties)
				Update propeerties of the menu item.

		Properties

			index    : integer
			type     : string ["separator","normal"]
			contexts : array of strings ["all","page","frame","link","selection","editable","image","video","audio"]
			title    : string
                                                                                                    */
/****************************************************************************************************/

// requrire("WHO.extension.js");

var WHO = WHO || {};

	/********************************************************************************************/

	/* #     # ###### ######  ###### #     # ####### ###### #     #  #####  ###  #####  #     # */
	/* #     # #      #     # #       #   #     #    #      ##    # #     #  #  #     # ##    # */
	/* #     # #      #     # #        # #      #    #      # #   # #        #  #     # # #   # */
	/* #  #  # #####  ######  #####     #       #    #####  #  #  #  #####   #  #     # #  #  # */
	/* #  #  # #      #     # #        # #      #    #      #   # #       #  #  #     # #   # # */
	/* #  #  # #      #     # #       #   #     #    #      #    ## #     #  #  #     # #    ## */
	/*  ## ##  ###### ######  ###### #     #    #    ###### #     #  #####  ###  #####  #     # */

	if(WHO.extension.isWebExtension)
	{
		WHO.contextMenu =
		{
			_items     : [],
			_index     : 1000,

			_createItem : function(para)
			{
				if(para.type === "separator")
				{
					return chrome.contextMenus.create(
					{
					//	id      :_id,//must be string
						type    :"separator",
						contexts:para.contexts||["all"]
					});
				}
				else
				{

					return chrome.contextMenus.create(
					{
					//	id      : _id,// must be string
						type    :para.type||'normal',
						contexts:para.contexts||["all"],
						title   :para.title||"menu",
					//	icon    :para.icon,
						onclick :para.onclick ? function(data,_tab)
						{
						//	console.log(data);
							para.onclick(
							{
								pageURL       : data.pageUrl||data.frameUrl,
								linkURL       : data.linkUrl,
								srcURL        : data.srcUrl,
								selectionText : data.selectionText,
								isEditable    : data.editable,
								tab           :_tab ? new WHO.extension._tab(_tab) : null,
							});
						} : null,
						enabled :!(para.disabled||false),
					}/*,function(){}*/);
				}
			},

			isShown    : false,

			createItem : function(para,callback)
			{
				var id;// = String(++WHO.contextMenu._id);
			//	para.id = id;//must be string

				if(WHO.contextMenu.isShown)
				{

					id = WHO.contextMenu._createItem(para);

				}

				var item =
				{
					_index   : ++WHO.contextMenu._index,
					_id      : id,
					_para    : para,
					_removed : false,

					enable  : function()
					{
						this.disabled = false;
						this._para.disabled = false;

						if(WHO.contextMenu.isShown && !this._removed && this._id)
						{
							chrome.contextMenus.update(this._id,{enabled:true});
						}

					},
					disable : function()
					{
						this.disabled = true;
						this._para.disabled = true;

						if(WHO.contextMenu.isShown && !this._removed && this._id)
						{
							chrome.contextMenus.update(this._id,{enabled:false});
						}

					},
					add : function()
					{

						if(this._removed)
						{

							if(WHO.contextMenu.isShown)
							{

								this._id = WHO.contextMenu._createItem(this._para);;

							}

							this._removed = false;

						}

					},
					remove : function(destroy)
					{

						this._removed = true;

						if(this._id)
						{
							chrome.contextMenus.remove(this._id/*,function(){}*/);
							delete this._id;
						}

						if(destroy)
						{
							delete this._para;
							for(var i = 0,item;item = WHO.contextMenu._items[i];++i)
							{
								if(this._index === item._index)
								{
									WHO.contextMenu._items.splice(i,1);
									break;
								}
							}
						}

					},
					update  : function(newpara)
					{

						this._para = 
						{
							type    :newpara.type    ||this._para.type,
							contexts:newpara.contexts||this._para.contexts,
							title   :newpara.title   ||this._para.title,
						//	icon    :newpara.icon    ||this._para.icon,
							disabled:newpara.disabled||this._para.disabled,
						//	enabled :typeof newpara.disabled === "undefined" ? !this._para.disabled : !para.disabled,
							onclick :newpara.onclick ||this._para.onclick,
						};
						var _para = this._para;
						if(WHO.contextMenu.isShown)
						{
							chrome.contextMenus.update(this._id,
							{
								type    :this._para.type,
								contexts:this._para.contexts,
								title   :this._para.title,
							//	icon    :this._para.icon,
								enabled :typeof newpara.disabled === "undefined" ? !this._para.disabled : !para.disabled,
								onclick :_para.onclick ? function(data,_tab)
								{
									_para.onclick(
									{
										pageURL       : data.pageUrl||data.frameUrl,
										linkURL       : data.linkUrl,
										srcURL        : data.srcUrl,
										selectionText : data.selectionText,
										isEditable    : data.editable,
										tab           :_tab ? new WHO.extension._tab(_tab) : null,
									});
								} : null,
							},function(){});
						}
					},
				};

				Object.defineProperty(item,"type",
				{
					enumerable : true,
					writable   : false,
					value      : para.type||"normal",
				});

				Object.defineProperty(item,"contexts",
				{
					enumerable : true,
					get        : function()
					{
						return this._para.contexts||[];
					},
				});

				Object.defineProperty(item,"title",
				{
					enumerable : true,
					get        : function()
					{
						return this._para.title||"";
					},
					set        : function(title)
					{
						var newpara =
						{
							title : title ||""
						};
						if(WHO.contextMenu.isShown)
						{
							chrome.contextMenus.update(this._id,newpara,function(){});
						}
					},
				});

				WHO.contextMenu._items.push(item);

				return(item);
			},

			show   : function()
			{
				if(!WHO.contextMenu.isShown)
				{
					for(var i = 0,item;item = WHO.contextMenu._items[i];++i)
					{
						if(!item._removed)
						{
							var id = WHO.contextMenu._createItem(item._para);
							WHO.contextMenu._items[i]._id = id;
						}
					}
					WHO.contextMenu.isShown = true;
				}
			},

			hide   : function()
			{
				if(WHO.contextMenu.isShown)
				{
					WHO.contextMenu.isShown = false;
					chrome.contextMenus.removeAll(function(){});
					for(var i = 0,item;item = WHO.contextMenu._items[i];++i)
					{
						delete WHO.contextMenu._items[i]._id;
					}
				}
			},

			removeAll : function()
			{
				WHO.contextMenu.isShown = false;
				chrome.contextMenus.removeAll(function(){});
				WHO.contextMenu._items = [];
			},

		};
	}

	/********************************************************************************************/
	/*
	else

	{
		WHO.contextMenu =
		{
			isShon : false,

			createItem : function(para,callback)
			{
				var itemObject =
				{
					enable  : function(){},
					disable : function(){},
					update  : function(para){},
					remove  : function(){},
				};
				return(itemObject);
			},
			show   : function(){},
			hide   : function(){},
			removeAll : function(){},
		};
	}
	                                                                                            */
	/********************************************************************************************/
