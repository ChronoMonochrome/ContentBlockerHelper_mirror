/****************************************************************************************************/
/* main                                                                                             */

WHO.extension.initializeOptions();

WHO.locale.translate("configurations/lang.json",function(dic)
{

	prefsContextMenus(dic);
	prefsSimpleFilter.init(dic);
	prefsUIProtection(dic);
	prefsBehavior(dic);
	prefsSubscriptions(dic);
	prefsCustomizations.init(dic);
	prefsCSSRules.init(dic);
	prefsTools(dic);
	prefsOperation(dic);

});

/****************************************************************************************************/
