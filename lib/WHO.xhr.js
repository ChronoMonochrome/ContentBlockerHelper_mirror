// This file is used in "LinkRedirector" also. You can skip review if this is not "LinkRedirector".

// This file wraps the XHR API.

/****************************************************************************************************/
/* XMLHttpRequest ライブラリ                                                                        */
/*      Copyright (c) 2012-2013 by FAR/RAKUDA All Rights Reserved                                   */
/*      Original Namespace : LinkRedirector                                                         */
/****************************************************************************************************/

// "permissions":[<URL patterns>]

var WHO = WHO || {};

	/* XMLHttpRequest */

	if(!WHO.extension.isJetpack)
	{

		WHO.XHR = function(para)
		{
			var xhr = new XMLHttpRequest();

			var method = (para.method||"GET").toUpperCase();

			xhr.open(method,para.url||para.action,(para.async||false),(para.username||null),(para.password||null));

			/* レスポンスの型を設定 */
			if(para.responseType)
			{
				xhr.responseType = para.responseType;// ""||"document"||"json"||"blob"||"arraybuffer";
			}

			/* リクエストヘッダ */
			if(para.contentType)
			{
				xhr.setRequestHeader("Content-Type",para.contentType);
			}
			else
			if(method == "POST")
			{
				xhr.setRequestHeader("Content-Type","application/x-www-form-urlencoded;charset=utf-8");
			}

			/* その他のヘッダ */
			if(para.requestHeader)
			{
				for(var key in para.requestHeader)
				{
					xhr.setRequestHeader(key,para.requestHeader[key]);
				}
			}

			/*タイムアウト*/
			//非同期の場合のみタイムアウト
			if(para.async)
			{
				xhr.ontimeout = function()
				{
					console.log("Http Timeout in " + para.url);
					if(para.ontimeout){para.ontimeout(xhr);}
					xhr.abort();
				};
				xhr.timeout = 1000*(para.wait||0);
			}

			/*コールバック*/
			if(para.callback)
			{
				xhr.onreadystatechange = function()
				{
				//	if(this.readyState === 3)//LOADING
				//	{
                //
				//		if(this.response)
				//		{
				//			console.log(this.response);
				//		}
                //
				//	}
				//	else
					if(this.readyState === 4)//DONE
					{
					//	//タイムアウト解除
					//	if(this.timeout) 
					//	{ 
					//		clearTimeout(this.timeout);
					//		this.timeout = null;
					//	}
						//200 成功
						if(this.status == 200)
						{
							para.callback(this);
						}
						else
						//204 削除済み
						if(this.status == 204)
						{
						//	console.info(this.statusText,para.url);
							if(para.callback){para.callback(this);}
						}
						else
						//400 不正なリクエスト
						if(this.status == 400)
						{
						//	console.error(this.statusText,para.method);
							if(para.onerror){para.onerror(this);}
						}
						else
						//404 見つかりません
						if(this.status == 404)
						{
						//	console.error(this.statusText,para.url);
							if(para.onerror){para.onerror(this);}
						}
						//0
						//401 認証エラー
						//500 サーバーエラー
						//501 
						//エラー
						else
						{
						//	console.error(this.statusText);
							if(para.onerror){para.onerror(this);}
						}
					}
				};
			}
			/*リクエスト送信*/
			try
			{
				var data = para.data ? para.data : null;
				xhr.send(data);
			}
			// 例外エラー
			catch(error)
			{
			//	if(para.errorCallback)
			//	{
			//		para.errorCallback(error, request);
			//	}
			//	else
			//	{
			//	//	console.error(error.message);
			//	}
			}
		};
	}
	else
	{
		var _requestID = 0;
		WHO.XHR = function(para)
		{
			if(para.callback)
			{
				var requestID  = ++_requestID;
				para.requestID = requestID;
				self.port.on('XHR',function(data)
				{
					if(data.responseID === requestID)
					{
						self.port.removeListener('XHR',arguments.callee);
						para.callback(data.response);
					}
				});
			}
			self.port.emit('XHR',{
				url:para.url,
				requestID:para.requestID
			});
		};
	}
