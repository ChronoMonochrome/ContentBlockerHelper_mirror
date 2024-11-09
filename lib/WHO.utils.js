// This file is used in "LinkRedirector" also. You can skip review if this is not "LinkRedirector".
/****************************************************************************************************/
/* Utilities API                                                                                    */
/*

	Provides some utilities

	WHO.utils

		Methods

			openExtensionPage : boolean WHO.tabs.isSelected(object WHO.tab)

		Properties
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

		WHO.utils =
		{

			/* Open extension's URL page */

			openExtensionPage : function(file,hash)
			{

				chrome.tabs.create({url:WHO.extension._baseDir + (file||"options.html") + hash})

			},

		};


	}

	else

	/********************************************************************************************/

	/*    ### ###### ###### #####    ###    #####  #    ## */
	/*      # #        #    #    #  #   #  #     # #   #   */
	/*      # #        #    #    # #     # #       #  #    */
	/*      # #####    #    #    # ####### #       # #     */
	/*      # #        #    #####  #     # #       ## #    */
	/* #    # #        #    #      #     # #     # #   #   */
	/*  ####  ######   #    #      #     #  #####  #    ## */

	if(WHO.extension.isJetpack)
	{

		WHO.utils =
		{

			openExtensionPage : function(file,hash)
			{

				self.port.emit('systemMethod',{method:"openLocaleTab",para:{filename:(file||"options.html"),hash:hash}});

			},

		};

	}

	/**************************************************************************************/
