// This file is used in "LinkRedirector" also. You can skip review if this is not "LinkRedirector".
/****************************************************************************************************/
/* Popup Client API                                                                                 */
/*

// This file provides the Popup API.

	WHO.popup

		Methods

			setSize : undefined WHO.popup.setSize(object windowSize)

	windowSize

		Properties

			width  : string cssSize
			height : string cssSize
                                                                                                    */
/****************************************************************************************************/

var WHO = WHO || {};

//	WHO.popup = {};

	WHO.extension.postMessage('__Popup__',{method:"setPort",url:window.location.href});

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

		WHO.popup = 
		{
			setSize : function(size)
			{
				document.body.style.minWidth  = size.width  + "px";
				document.body.style.minHeight = size.height + "px";
			},
		}

		document.addEventListener('DOMContentLoaded',function(e)
		{

			WHO.extension.sendRequest('__Popup__',{method:"getSize"},function(message){WHO.popup.setSize(message.size)});

		});

	}

	/********************************************************************************************/
