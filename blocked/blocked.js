// Firefox では読み込まれない
// Bug::Firefox::0015::1257781 - Redirecting to moz-extension:// with webRequest.onBeforeSendHeaders fails with Security Error
// A page of "about:blank" is not catch this message.
window.parent.postMessage(
{
	method:"setBlockedFrame",
},window.location.search.replace(/^\?/,""));
