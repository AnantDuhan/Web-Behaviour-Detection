// modules are defined as an array
// [ module function, map of requires ]
//
// map of requires is short require name -> numeric require
//
// anything defined in a previous bundle is accessed via the
// orig method which is the require for previous bundles
parcelRequire = (function (modules, cache, entry, globalName) {
  // Save the require from previous bundle to this closure if any
  var previousRequire = typeof parcelRequire === 'function' && parcelRequire;
  var nodeRequire = typeof require === 'function' && require;

  function newRequire(name, jumped) {
    if (!cache[name]) {
      if (!modules[name]) {
        // if we cannot find the module within our internal map or
        // cache jump to the current global require ie. the last bundle
        // that was added to the page.
        var currentRequire = typeof parcelRequire === 'function' && parcelRequire;
        if (!jumped && currentRequire) {
          return currentRequire(name, true);
        }

        // If there are other bundles on this page the require from the
        // previous one is saved to 'previousRequire'. Repeat this as
        // many times as there are bundles until the module is found or
        // we exhaust the require chain.
        if (previousRequire) {
          return previousRequire(name, true);
        }

        // Try the node require function if it exists.
        if (nodeRequire && typeof name === 'string') {
          return nodeRequire(name);
        }

        var err = new Error('Cannot find module \'' + name + '\'');
        err.code = 'MODULE_NOT_FOUND';
        throw err;
      }

      localRequire.resolve = resolve;
      localRequire.cache = {};

      var module = cache[name] = new newRequire.Module(name);

      modules[name][0].call(module.exports, localRequire, module, module.exports, this);
    }

    return cache[name].exports;

    function localRequire(x){
      return newRequire(localRequire.resolve(x));
    }

    function resolve(x){
      return modules[name][1][x] || x;
    }
  }

  function Module(moduleName) {
    this.id = moduleName;
    this.bundle = newRequire;
    this.exports = {};
  }

  newRequire.isParcelRequire = true;
  newRequire.Module = Module;
  newRequire.modules = modules;
  newRequire.cache = cache;
  newRequire.parent = previousRequire;
  newRequire.register = function (id, exports) {
    modules[id] = [function (require, module) {
      module.exports = exports;
    }, {}];
  };

  var error;
  for (var i = 0; i < entry.length; i++) {
    try {
      newRequire(entry[i]);
    } catch (e) {
      // Save first error but execute all entries
      if (!error) {
        error = e;
      }
    }
  }

  if (entry.length) {
    // Expose entry point to Node, AMD or browser globals
    // Based on https://github.com/ForbesLindesay/umd/blob/master/template.js
    var mainExports = newRequire(entry[entry.length - 1]);

    // CommonJS
    if (typeof exports === "object" && typeof module !== "undefined") {
      module.exports = mainExports;

    // RequireJS
    } else if (typeof define === "function" && define.amd) {
     define(function () {
       return mainExports;
     });

    // <script>
    } else if (globalName) {
      this[globalName] = mainExports;
    }
  }

  // Override the current require with this new one
  parcelRequire = newRequire;

  if (error) {
    // throw error from earlier, _after updating parcelRequire_
    throw error;
  }

  return newRequire;
})({"settings.js":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.defaultSettings = void 0;
const defaultSettings = {
  styling: 'opacity',
  backend: 'jsvader',
  threshold: 0.5,
  ranking: true,
  onlyTexts: false,
  enabled: false
};
exports.defaultSettings = defaultSettings;
},{}],"popup/popup.js":[function(require,module,exports) {
"use strict";

var _settings = require("../settings.js");

const thisSiteCheckId = 'selected-thissiteonly-check';

function withTab(tabCallback) {
  chrome.tabs.query({
    active: true,
    currentWindow: true
  }, tabs => {
    tabCallback(tabs[0]);
  });
}

function tabDomain(tab) {
  return tab.url.match(/:\/\/[a-z0-9\-._~%]+/gi)[0].slice(3);
}

function getById(id) {
  return document.getElementById(id);
}

function saveOptions(event) {
  chrome.storage.local.get({
    storedSettings: {
      global: _settings.defaultSettings
    }
  }, stored => {
    const storedSettings = stored.storedSettings;
    const thisSiteOnly = getById(thisSiteCheckId).checked;
    const thisSiteOnlyUpdated = event.target.id == thisSiteCheckId;
    const switchedToThisSiteOnly = thisSiteOnlyUpdated && thisSiteOnly;
    const newSettings = {
      styling: getById('selected-styling').value,
      backend: getById('selected-backend').value,
      threshold: getById('selected-threshold').value / 100,
      ranking: getById('selected-ranking-check').checked,
      onlyTexts: getById('selected-onlytexts-check').checked,
      enabled: getById('selected-enabled-check').checked || switchedToThisSiteOnly
    };
    withTab(tab => {
      const switchedToGlobal = thisSiteOnlyUpdated && !thisSiteOnly;

      if (switchedToGlobal) {
        // remove domain settings and restore global
        delete storedSettings[tabDomain(tab)]; // delete tab settings
      } else {
        // update settings according to thisSiteOnly toggle
        const key = thisSiteOnly ? tabDomain(tab) : 'global';
        storedSettings[key] = newSettings;
      }

      chrome.storage.local.set({
        storedSettings: storedSettings
      });
      loadOptions(); // sync view in case view needs to change
    });
  });
}

function loadOptions() {
  chrome.storage.local.get({
    storedSettings: {
      global: _settings.defaultSettings
    }
  }, stored => {
    const storedSettings = stored.storedSettings;
    withTab(tab => {
      // use this site settings if defined
      getById('selected-thissiteonly-check').checked = storedSettings[tabDomain(tab)] !== undefined;
      const settings = storedSettings[tabDomain(tab)] || storedSettings.global;
      const threshold = Math.round(settings.threshold * 100);
      getById('selected-styling').value = settings.styling;
      getById('selected-backend').value = settings.backend;
      getById('selected-threshold').value = threshold;
      getById('threshold-text').innerText = `${threshold}%`;
      getById('selected-ranking-check').checked = settings.ranking;
      getById('selected-onlytexts-check').checked = settings.onlyTexts;
      getById('selected-enabled-check').checked = settings.enabled;
    });
  });
}

function updateStatsText() {
  chrome.storage.local.get({
    stats: {}
  }, stored => {
    withTab(tab => {
      const tabStats = stored.stats[tab.id];
      const positives = tabStats.total - tabStats.negatives;
      let text = '';

      if (!isNaN(positives)) {
        const percentageText = `${(100 * positives / tabStats.total).toFixed(1)}%`;
        text = `${percentageText} (${positives} / ${tabStats.total})`;
      }

      getById('positivity-score').innerText = text;
    });
  });
}

function main() {
  // options
  loadOptions(); // add options listeners

  document.querySelectorAll('.stored-options').forEach(el => el.onchange = saveOptions); // stats

  updateStatsText(); // watch for stats changes

  chrome.storage.onChanged.addListener(changes => {
    if (changes.stats != null) updateStatsText();
  });
}

main();
},{"../settings.js":"settings.js"}]},{},["popup/popup.js"], null)
//# sourceMappingURL=/popup.672aa036.js.map