// This file is used in "LinkRedirector" also. You can skip review if this is not "LinkRedirector".
/****************************************************************************************************/
/* URL API                                                                                          */
/*

	WHO.URL

		Methods

			getFullpath : string WHO.URL.getFullpath(string URL)
			getPage     : string WHO.URL.getFullpath(string URL)
			getServer   : string WHO.URL.getServer(string URL)
			getSite     : string WHO.URL.getSite(string URL)
			getHost     : string WHO.URL.getHost(string URL)
			getHostname : string WHO.URL.getHostname(string URL)
			getDomain   : string WHO.URL.getDomain(string URL|hostname)

			isWebPage   : boolean WHO.URL.isWebPage(string URL)
                                                                                                    */
/****************************************************************************************************/

var WHO = WHO || {};

	WHO.URL =
	{

		_parser :
		{
			webScheme: /^(https?\:)\/\//i,
			page     : /^([^#?]+)(?:[#?].*)?$/i,
			port     : /^([\w\-]+:\/\/[^\/]*)(?:[\/].*)?$/i,
			site     : /^([\w\-]+:\/\/[^\/:]*)(?:[\/:].*)?$/i,
			host     : /^(?:[\w\-]+:\/\/|\|\|)?([^\/]*)(?:[\/].*)?$/i,
			hostname : /^(?:[\w\-]+:\/\/|\|\|)?([^\/:]*)(?:[\/:].*)?$/i,
			domain   : /^(?:[\w\-]+:\/\/|\|\|)?(?:[a-z0-9][^\/:]*?\.(?!(?:(?:[a-z]{2}|com|net|gov|edu|org|info)\.[a-z][a-z]|[a-z][a-z]+)(?:[:\/]|$)))*([a-z0-9][^\/\*\:]*\.(?:(?:[a-z]{2}|com|net|gov|edu|org|info)\.[a-z][a-z]|[a-z][a-z]+))(?:[\/:].*)?$/i,
		},

		getFullpath : function(url)
		{
			return url;
		},

		getPage : function(url)
		{

			var parsedURL = this._parser.page.exec(url);
			if(parsedURL)
			{
				return parsedURL[1];
			}
			else
			{
				return "";
			}

		},

		getPort : function(url)
		{

			var parsedURL = this._parser.port.exec(url);
			if(parsedURL)
			{
				return parsedURL[1];
			}
			else
			{
				return "";
			}

		},

		getSite : function(url)
		{

			var parsedURL = this._parser.site.exec(url);
			if(parsedURL)
			{
				return parsedURL[1];
			}
			else
			{
				return "";
			}

		},

		getHost : function(url)
		{

			var parsedURL = this._parser.host.exec(url);
			if(parsedURL)
			{
				return parsedURL[1];
			}
			else
			{
				return "";
			}

		},

		getHostname : function(url)
		{

			var parsedURL = this._parser.hostname.exec(url);
			if(parsedURL)
			{
				return parsedURL[1];
			}
			else
			{
				return "";
			}

		},

		getDomain : function(url)
		{

			var parsedURL = this._parser.domain.exec(url);
			if(parsedURL)
			{
				return parsedURL[1];
			}
			else
			{
				return WHO.URL.getHostname(url);
			}

		},

		isWebPage : function(url)
		{
			return this._parser.webScheme.test(url);
		},

	};

