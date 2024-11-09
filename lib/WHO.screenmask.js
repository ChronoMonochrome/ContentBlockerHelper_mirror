"use strict";

var WHO = WHO||{};

WHO.screenmask = function()
{

	var mask = document.createElement('div');
		mask.style.position = "fixed";
		mask.style.zIndex = "65535";
		mask.style.top    = "0";
		mask.style.left   = "0";
		mask.style.width  = "100%";
		mask.style.height = "100%";
		mask.style.background = "black";
		mask.style.opacity = "0.5";
		mask.style.margin = "0";
	document.body.appendChild(mask);

	this.mask = mask;

};

WHO.screenmask.prototype.clear = function()
{

	this.mask.parentNode.removeChild(this.mask);
	delete this.mask;

};
