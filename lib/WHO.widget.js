// This file is used in "LinkRedirector" also. You can skip review if this is not "LinkRedirector".
function ID(id)
{
	return document.getElementById(id);
}

function clearChildren(id)
{
	var element = ID(id);
	var child = element.firstChild;
	while(child)
	{
		var remove = child;
		child = remove.nextSibling;
		element.removeChild(remove);
	}
}

function downloadJsonData(filename,data)
{

	var blob = new Blob([ JSON.stringify(data,null,"\t") ], { "type" : "application/json" });

	var a = document.createElement('a');
		a.setAttribute('download',filename);
		a.setAttribute('href',window.URL.createObjectURL(blob));
	
	if(WHO.extension.isFirefox)
	{
		var evt = document.createEvent('MouseEvents');
		evt.initMouseEvent('click', true, true, window, 1, 0, 0, 0, 0, false, false, false, false, 0, null);
		a.dispatchEvent(evt);
 	}
	else
	{
		a.click();
	}

}
