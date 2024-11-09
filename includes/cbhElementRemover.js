"use strict";
// Copyright (c) 2012-2016 by FAR/RAKUDA All Rights Reserved

/****************************************************************************************************/
/* ContentBlockHelper ElementRemover                                                                */
/*
	Hides elements that matches to the custom selector filter.
                                                                                                    */
/****************************************************************************************************/

var WHO = WHO || {};

	/**************************************************************************************/

	WHO.ElementRemover = 
	{
		start : function()
		{

			this.blockStyle      = null; //CSS ブロック用 style 要素

			/* html に data-url 属性を追加する */
			// ~domain##selector なフィルタに必要
			if(document.documentElement instanceof window.HTMLHtmlElement && document.head instanceof window.HTMLHeadElement)
			{

				this.setURLtoHTML();

			}
			else
			{

				document.addEventListener('DOMContentLoaded',this.setURLtoHTML.bind(this),false);

			}

			return this;

		},

		/**************************************************************************************/
		/* URL オレオレ属性を付加 */

		setURLtoHTML : function()
		{

			document.documentElement.setAttribute('data-url',window.location.href.toString());

		},

		//------------------------------------------------------------------------------------//
		/* CSS ブロック用 style 要素の作成 */
		// temp : ハイライト表示

		createCSSBlockStyle : function(CSSRules,temp)
		{

			this.removeCSSBlockStyle();//いったん削除

			// style 要素を作成
			this.blockStyle = document.createElement('style');
			this.blockStyle.setAttribute("data-cbh-dummy","dummy");
			this.blockStyle.type = "text/css";
			document.head.appendChild(this.blockStyle);

			var style = this.blockStyle;

			for(var i = 0;i < CSSRules.length;i+=500)
			{

				var rules = CSSRules.slice(i,i + 500).join(",");

				/* ハイライト */
				if(temp)
				{

					style.appendChild(document.createTextNode(rules + "{background:rgba(255,0,0,0.5) !important;outline:red 1px dashed !important;}\n"));
				//	style.sheet.insertRule(rules + "{background:rgba(255,0,0,0.5) !important;outline:red 1px dashed !important;}\n");

				}
				else
				/* 隠す */
				{

					style.appendChild(document.createTextNode(rules + "{display:none !important;}\n"));
				//	style.sheet.insertRule(rules + "{display:none !important;}\n");

				}
			}

		},

		/* CSS ブロック用 style 要素の削除 */

		removeCSSBlockStyle : function()
		{

			if(this.blockStyle)
			{

				this.blockStyle.parentNode.removeChild(this.blockStyle);
				delete this.blockStyle;

			}

		},
	};

/**************************************************************************************/

WHO.ElementRemover.start();

/**************************************************************************************/
