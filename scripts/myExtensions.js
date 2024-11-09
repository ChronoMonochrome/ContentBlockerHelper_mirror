/* This Script is loaded by ONLY popup.html */

/* Banner of Whochan's Extensions */


document.addEventListener('DOMContentLoaded',function(e)
{

	/* 他の拡張の宣伝 */

	var FARs = document.querySelectorAll('#FAR>li');

	var num = parseInt(Math.random() * FARs.length);
	for(var i = 0,far;far = FARs[i];++i)
	{
		if(i === num)
		{
			far.style.display = "block";
		}
		else
		{
			far.style.display = "";
		}
	}

	/* SNS ボタン */

	// this file is used on every my extensions.
	// so getting title and url from the popup page is useful method.
	var name = window.top.document.title;
//	var url  = "https://far.whochan.com/wlog.cgi/" + name;

	/* Twitter */

	var twitter = document.getElementById('TwitterButton');
		twitter.setAttribute('href',"https://twitter.com/intent/tweet?screen_name=whochan&text=How to ...&hashtags=," + name/* + "&url=" + url*/);
		twitter.addEventListener('click',function(e)
		{
			window.open(this.href,"TWwindow","width=500,height=400,menubar=no, toolbar=no, scrollbars=yes");
			e.preventDefault();
		});

	/* Facebook */

//	var facebook = document.getElementById('FacebookButton');
//		facebook.setAttribute('href',"http://www.facebook.com/share.php?u=" + url);
//		facebook.addEventListener('click',function(e)
//		{
//			window.open(this.href,"FBwindow","width=500,height=400,menubar=no, toolbar=no, scrollbars=yes");
//			e.preventDefault();
//		});

});
