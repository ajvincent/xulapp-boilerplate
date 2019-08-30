const Ci = Components.interfaces,
      Cu = Components.utils;

const {XPCOMUtils} = Cu.import("resource://gre/modules/XPCOMUtils.jsm");
XPCOMUtils.defineLazyModuleGetters(this, {
  "Services":   "resource://gre/modules/Services.jsm",
  "setTimeout": "resource://gre/modules/Timer.jsm",
  "NetUtil":    "resource://gre/modules/NetUtil.jsm",
});

// Read preferences at startup
{
  let url = NetUtil.newURI("resource://dbgserver/preferences.js");

  const resProt = Services.io.getProtocolHandler("resource");
  if (!(resProt instanceof Ci.nsIResProtocolHandler))
    throw new Error("didn't get resource:// protocol handler at startup");
  url = Services.io.newURI(resProt.resolveURI(url));

  if (!(url instanceof Ci.nsIFileURL))
    throw new Error("didn't get preferences file url from resource:// protocol");

  Services.prefs.readDefaultPrefsFromFile(url.file);
}

function CmdLineHandler() { /* do nothing */ }

var StartupResolve;
const StartupPromise = new Promise(function(resolve) {
  StartupResolve = resolve;
});
StartupPromise.then(function() {
  try {
    let {
      RemoteDebuggerServer
    } = Cu.import("resource://dbgserver/modules/RemoteDebuggerServer.jsm", {});
    let remoteEnabled = Services.prefs.getBoolPref("devtools.debugger.remote-enabled");
    RemoteDebuggerServer.startstop(remoteEnabled);
  }
  catch (e) {
    dump(e + "\n\n");
    Cu.reportError(e);
  }
});

// Class definition.
CmdLineHandler.prototype = {
  //nsIObserver
  observe: function() {
    StartupResolve();
    Services.obs.removeObserver(this, "final-ui-startup");
  },

  //nsICommandLineHandler
  handle: function() {
    Services.obs.addObserver(this, "final-ui-startup", false);
    setTimeout(StartupResolve, 5000);
    dump("CmdLineHandler.handle()\n\n");
  },

  // properties required for XPCOM registration
  classDescription: "Developer Tools command line handler",
  classID:          Components.ID("{4936C2B6-B592-4030-A05F-56D1003D761A}"),
  contractID:       "@xulapp/debugger/clh;1",
  
  // nsISupports
  QueryInterface: ChromeUtils.generateQI([
    Ci.nsIObserver,
    Ci.nsICommandLineHandler
  ])
};

this.NSGetFactory = XPCOMUtils.generateNSGetFactory([CmdLineHandler]);
