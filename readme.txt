QuaBEx : Quadruple Browser Extension Framework

QuaBEx can build browser extensions with common code for Opera,Chrome,Firefox

Most simple directories of QuaBEx.

/extensionname.safariextension
     |- package.json                       : Configuration file for Jetpack Firefox
     |- Info.plist                         : Configuration file for Safari
     |
     |- /lib
     |       |- main.js                    : Configuration script for Jetpack Firefox
     |       |- WHO
     |               |- QuaBEx.js          : Management messaging,tabs,libs for Jetpack Firefox
     |               |- contextMenu.js     : Management context menus for Jetpack Firefox (Optional)
     |               |- xhr.js             : Provice xmlHttpRequest for Jetpack Firefox (Optional)
     |
     |- /data
             |- readme.txt                 : This
             |- config.xml                 : Configuration file for Presto Opera
             |- manifest.json              : Configuration file for Chrome, OPR, WebExtensions Firefox
             |- index.html                 : Background page
             |- popup.html                 : Extension pop-up page
             |- options.html               : Preferences page
             |
             |- /includes                  : Content Scripts
             |       |- WHO.active.js      : Management active page (Optional)
             |
             |- /scripts
             |       |- background.js      : Background process
             |
             |- /lib
             |       |- WHO.widget.js      : Common functions
             |       |- WHO.jetpack.js     : Provide messaging for Jetpack Firefox
             |       |- WHO.extension.js   : Management messaging ports
             |       |- WHO.extension.client.js     : Management messaging for Content scripts
             |       |- WHO.locale.js      : Provide locale data
             |       |- WHO.utils.js       :
             |       |- WHO.xhr.js         : Provide xmlHttpRequest (Optional)
             |       |- WHO.contextMenu.js : Management context menus (Optional)
             |       |- WHO.tabs.js        : Management tabs
             |       |- WHO.active.js      : Managiment active tab
             |       |- WHO.toolbar.js     : (Optional)
             |       |- WHO.popup.js       : (Optional)
             |       |- WHO.popup.client.js: (Optional)
             |       |- WHO.sidebar.js     : (Optional)
             |       |- WHO.panel.js       : (Optional)
             |       |- WHO.panel.client.js: (Optional)
             |       |- WHO.URL.js           : Provide functions to get informations of URL strings
             |
             |- /locales                   : Locale files
             |
             |- /_locales                  : Locale files for Chrome
