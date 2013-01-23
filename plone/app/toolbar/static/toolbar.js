
/**
 * almond 0.1.1 Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*jslint sloppy: true */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var defined = {},
        waiting = {},
        config = {},
        defining = {},
        aps = [].slice,
        main, req;

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {},
            nameParts, nameSegment, mapValue, foundMap, i, j, part;

        //Adjust any relative paths.
        if (name && name.charAt(0) === ".") {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that "directory" and not name of the baseName's
                //module. For instance, baseName of "one/two/three", maps to
                //"one/two/three.js", but we want the directory, "one/two" for
                //this normalization.
                baseParts = baseParts.slice(0, baseParts.length - 1);

                name = baseParts.concat(name.split("/"));

                //start trimDots
                for (i = 0; (part = name[i]); i++) {
                    if (part === ".") {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === "..") {
                        if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                            //End of the line. Keep at least one non-dot
                            //path segment at the front so it can be mapped
                            //correctly to disk. Otherwise, there is likely
                            //no path mapping for a path starting with '..'.
                            //This can still fail, but catches the most reasonable
                            //uses of ..
                            return true;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            }
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                break;
                            }
                        }
                    }
                }

                foundMap = foundMap || starMap[nameSegment];

                if (foundMap) {
                    nameParts.splice(0, i, foundMap);
                    name = nameParts.join('/');
                    break;
                }
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            return req.apply(undef, aps.call(arguments, 0).concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (waiting.hasOwnProperty(name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!defined.hasOwnProperty(name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    function makeMap(name, relName) {
        var prefix, plugin,
            index = name.indexOf('!');

        if (index !== -1) {
            prefix = normalize(name.slice(0, index), relName);
            name = name.slice(index + 1);
            plugin = callDep(prefix);

            //Normalize according
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            p: plugin
        };
    }

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    main = function (name, deps, callback, relName) {
        var args = [],
            usingExports,
            cjsModule, depName, ret, map, i;

        //Use name if no relName
        relName = relName || name;

        //Call the callback to define the module, if necessary.
        if (typeof callback === 'function') {

            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i++) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = makeRequire(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = defined[name] = {};
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = {
                        id: name,
                        uri: '',
                        exports: defined[name],
                        config: makeConfig(name)
                    };
                } else if (defined.hasOwnProperty(depName) || waiting.hasOwnProperty(depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else if (!defining[depName]) {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback.apply(defined[name], args);

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                    cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = require = req = function (deps, callback, relName, forceSync) {
        if (typeof deps === "string") {
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 15);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        config = cfg;
        return req;
    };

    define = function (name, deps, callback) {

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        waiting[name] = [name, deps, callback];
    };

    define.amd = {
        jQuery: true
    };
}());

define("requireLib", function(){});

// Patterns 
//
// Author: Rok Garbas
// Contact: rok@garbas.si
// Version: 1.0
// Depends: jquery.js
//
// Description: 
//
// License:
//
// Copyright (C) 2010 Plone Foundation
//
// This program is free software; you can redistribute it and/or modify it
// under the terms of the GNU General Public License as published by the Free
// Software Foundation; either version 2 of the License.
//
// This program is distributed in the hope that it will be useful, but WITHOUT
// ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
// FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
// more details.
//
// You should have received a copy of the GNU General Public License along with
// this program; if not, write to the Free Software Foundation, Inc., 51
// Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
//

/*jshint bitwise:true, curly:true, eqeqeq:true, immed:true, latedef:true,
  newcap:true, noarg:true, noempty:true, nonew:true, plusplus:true,
  undef:true, strict:true, trailing:true, browser:true, evil:true */
/*global define:false */

define('js/patterns',[
  'jquery'
], function($, undefined) {
  

  var error = $.error,
      _registry = {};

  // Get options from element's data attributes
  // Collect options from parent tree of elements
  function getOptions($el, prefix, options) {
    options = options || {};

    // get options from parent element first, stop if element tag name is 'body'
    if ($el.size() !== 0 && !$.nodeName($el[0], 'body')) {
      options = getOptions($el.parent(), prefix, options);
    }

    // collect all options from element
    if($el.length) {
      $.each($el[0].attributes, function(index, attr) {
        if (attr.name.substr(0, ('data-'+prefix).length) === 'data-'+prefix) {
          if (attr.value === 'true') {
            options[$.camelCase(attr.name.substr(('data-'+prefix).length+1))] = true;
          } else if (attr.value === 'false') {
            options[$.camelCase(attr.name.substr(('data-'+prefix).length+1))] = false;
          } else {
            options[$.camelCase(attr.name.substr(('data-'+prefix).length+1))] = attr.value;
          }
        }
      });
    }

    return options;
  }


  function initializePattern($el, patternName, extra_options) {
    var pattern = new _registry[patternName]($el, getOptions(
          $el, patternName, extra_options));
    return pattern;
  }

  function initializePatternsForElement($el) {
    $.each(($el.data('pattern') || '').split(' '), function(i, patternName) {
      if (patternName.length !== 0) {
        if (_registry[patternName] === undefined) {
          //error('Pattern you try to initialize "' + patternName + '" does not exists.');
          return;
        }
        if (typeof $el.data('pattern-' + patternName) !== 'object') {
          $el.data('pattern-' + patternName, initializePattern($el, patternName));
        }
      }
    });
  }

  // Initialize patterns over some context/dom element.
  // Patterns already initialized won't be initialized again.
  function initializePatterns(context) {
    // first initialize patterns for current context
    if ($(context)[0] !== $(document)[0]) {
      initializePatternsForElement($(context));
    }
    // then initialize for its childrens
    $('[data-pattern]', context).each(function() {
      initializePatternsForElement($(this));
    });
  }

  // Register pattern
  function registerPattern(Pattern) {
    if (!Pattern.prototype.name) {
      //error('Pattern you try to register has no name.');
      return;
    }
    if (_registry[Pattern.prototype.name] !== undefined) {
      //error('Pattern with name "' + Pattern.prototype.name + '" was already ' +
      //      'registered. Please select different name.');
      return;
    }

    _registry[Pattern.prototype.name] = Pattern;

    if (Pattern.prototype.jqueryPlugin) {
      $.fn[Pattern.prototype.jqueryPlugin] = function(method, options) {
        $(this).each(function() {
          var $el = $(this),
              pattern = $el.data('pattern-' + Pattern.prototype.name);
          if (typeof method === "object") {
            options = method;
            method = undefined;
          }
          if (!pattern || typeof(pattern) === 'string') {
            pattern = initializePattern($el, Pattern.prototype.name, options);
            $el.data('pattern-' + Pattern.prototype.name, pattern);
          }
          if (method && typeof method === 'string' && pattern && pattern[method]) {
            pattern[method].apply(pattern, [options]);
          }
        });
        return this;
      };
      $.fn[Pattern.prototype.jqueryPlugin].Constructor = Pattern.constructor;
    }
  }

  // Base Pattern
  var BasePattern = function($el, options) {
    this.$el = $el.addClass('pattern-' + this.name);
    this.options = options;
    if (this.init) {
      this.init();
    }
  };
  BasePattern.prototype = { constructor: BasePattern };
  BasePattern.extend = function(NewPattern) {
    var Base = this;
    var Constructor;

    if (NewPattern && NewPattern.hasOwnProperty('constructor')) {
      Constructor = NewPattern.constructor;
    } else {
      Constructor = function() { Base.apply(this, arguments); };
    }

    var Surrogate = function() { this.constructor = Constructor; };
    Surrogate.prototype = Base.prototype;
    Constructor.prototype = new Surrogate();

    $.extend(true, Constructor.prototype, NewPattern);

    Constructor.__super__ = Base.prototype;
    return Constructor;
  };

  // Public API
  window.Patterns = {
    _registry: _registry,
    initialize: initializePatterns,
    register: registerPattern,
    getOptions: getOptions,
    Base: BasePattern
  };

  return window.Patterns;
});

/**
 * jQuery TextExt Plugin
 * http://textextjs.com
 *
 * @version 1.3.1
 * @copyright Copyright (C) 2011 Alex Gorbatchev. All rights reserved.
 * @license MIT License
 */
(function($, undefined)
{
	/**
	 * TextExt is the main core class which by itself doesn't provide any functionality
	 * that is user facing, however it has the underlying mechanics to bring all the
	 * plugins together under one roof and make them work with each other or on their
	 * own.
	 *
	 * @author agorbatchev
	 * @date 2011/08/19
	 * @id TextExt
	 */
	function TextExt() {};

	/**
	 * ItemManager is used to seamlessly convert between string that come from the user input to whatever 
	 * the format the item data is being passed around in. It's used by all plugins that in one way or 
	 * another operate with items, such as Tags, Filter, Autocomplete and Suggestions. Default implementation 
	 * works with `String` type. 
	 *
	 * Each instance of `TextExt` creates a new instance of default implementation of `ItemManager`
	 * unless `itemManager` option was set to another implementation.
	 *
	 * To satisfy requirements of managing items of type other than a `String`, different implementation
	 * if `ItemManager` should be supplied.
	 *
	 * If you wish to bring your own implementation, you need to create a new class and implement all the 
	 * methods that `ItemManager` has. After, you need to supply your pass via the `itemManager` option during
	 * initialization like so:
	 *
	 *     $('#input').textext({
	 *         itemManager : CustomItemManager
	 *     })
	 *
	 * @author agorbatchev
	 * @date 2011/08/19
	 * @id ItemManager
	 */
	function ItemManager() {};

	/**
	 * TextExtPlugin is a base class for all plugins. It provides common methods which are reused
	 * by majority of plugins.
	 *
	 * All plugins must register themselves by calling the `$.fn.textext.addPlugin(name, constructor)`
	 * function while providing plugin name and constructor. The plugin name is the same name that user
	 * will identify the plugin in the `plugins` option when initializing TextExt component and constructor
	 * function will create a new instance of the plugin. *Without registering, the core won't
	 * be able to see the plugin.*
	 *
	 * <span class="new label version">new in 1.2.0</span> You can get instance of each plugin from the core 
	 * via associated function with the same name as the plugin. For example:
	 *
	 *     $('#input').textext()[0].tags()
	 *     $('#input').textext()[0].autocomplete()
	 *     ...
	 *
	 * @author agorbatchev
	 * @date 2011/08/19
	 * @id TextExtPlugin
	 */
	function TextExtPlugin() {};

	var stringify = (JSON || {}).stringify,
		slice     = Array.prototype.slice,
		p,
		UNDEFINED = 'undefined',

		/**
		 * TextExt provides a way to pass in the options to configure the core as well as
		 * each plugin that is being currently used. The jQuery exposed plugin `$().textext()` 
		 * function takes a hash object with key/value set of options. For example:
		 *
		 *     $('textarea').textext({
		 *         enabled: true
		 *     })
		 *
		 * There are multiple ways of passing in the options:
		 *
		 * 1. Options could be nested multiple levels deep and accessed using all lowercased, dot
		 * separated style, eg `foo.bar.world`. The manual is using this style for clarity and
		 * consistency. For example:
		 *
		 *        {
		 *            item: {
		 *                manager: ...
		 *            },
		 *
		 *            html: {
		 *                wrap: ...
		 *            },
		 *
		 *            autocomplete: {
		 *                enabled: ...,
		 *                dropdown: {
		 *                   position: ...
		 *                }
		 *            }
		 *        }
		 *
		 * 2. Options could be specified using camel cased names in a flat key/value fashion like so:
		 *
		 *        {
		 *            itemManager: ...,
		 *            htmlWrap: ...,
		 *            autocompleteEnabled: ...,
		 *            autocompleteDropdownPosition: ...
		 *        }
		 *
		 * 3. Finally, options could be specified in mixed style. It's important to understand that
		 * for each dot separated name, its alternative in camel case is also checked for, eg for 
		 * `foo.bar.world` it's alternatives could be `fooBarWorld`, `foo.barWorld` or `fooBar.world`, 
		 * which translates to `{ foo: { bar: { world: ... } } }`, `{ fooBarWorld: ... }`, 
		 * `{ foo : { barWorld : ... } }` or `{ fooBar: { world: ... } }` respectively. For example:
		 *
		 *        {
		 *            itemManager : ...,
		 *            htmlWrap: ...,
		 *            autocomplete: {
		 *                enabled: ...,
		 *                dropdownPosition: ...
		 *            }
		 *        }
		 *
		 * Mixed case is used through out the code, wherever it seems appropriate. However in the code, all option
		 * names are specified in the dot notation because it works both ways where as camel case is not
		 * being converted to its alternative dot notation.
		 *
		 * @author agorbatchev
		 * @date 2011/08/17
		 * @id TextExt.options
		 */

		/**
		 * Default instance of `ItemManager` which takes `String` type as default for tags.
		 *
		 * @name item.manager
		 * @default ItemManager
		 * @author agorbatchev
		 * @date 2011/08/19
		 * @id TextExt.options.item.manager
		 */
		OPT_ITEM_MANAGER = 'item.manager',
		
		/**
		 * List of plugins that should be used with the current instance of TextExt. The list could be
		 * specified as array of strings or as comma or space separated string.
		 *
		 * @name plugins
		 * @default []
		 * @author agorbatchev
		 * @date 2011/08/19
		 * @id TextExt.options.plugins
		 */
		OPT_PLUGINS = 'plugins',
		
		/**
		 * TextExt allows for overriding of virtually any method that the core or any of its plugins
		 * use. This could be accomplished through the use of the `ext` option.
		 *
		 * It's possible to specifically target the core or any plugin, as well as overwrite all the
		 * desired methods everywhere.
		 *
		 * 1. Targeting the core:
		 *
		 *        ext: {
		 *            core: {
		 *                trigger: function()
		 *                {
		 *                    console.log('TextExt.trigger', arguments);
		 *                    $.fn.textext.TextExt.prototype.trigger.apply(this, arguments);
		 *                }
		 *            }
		 *        }
		 *
		 * 2. Targeting individual plugins:
		 *
		 *        ext: {
		 *            tags: {
		 *                addTags: function(tags)
		 *                {
		 *                    console.log('TextExtTags.addTags', tags);
		 *                    $.fn.textext.TextExtTags.prototype.addTags.apply(this, arguments);
		 *                }
		 *            }
		 *        }
		 *
		 * 3. Targeting `ItemManager` instance:
		 *
		 *        ext: {
		 *            itemManager: {
		 *                stringToItem: function(str)
		 *                {
		 *                    console.log('ItemManager.stringToItem', str);
		 *                    return $.fn.textext.ItemManager.prototype.stringToItem.apply(this, arguments);
		 *                }
		 *            }
		 *        }
		 *
		 * 4. And finally, in edge cases you can extend everything at once:
		 *
		 *        ext: {
		 *            '*': {
		 *                fooBar: function() {}
		 *            }
		 *        }
		 *
		 * @name ext
		 * @default {}
		 * @author agorbatchev
		 * @date 2011/08/19
		 * @id TextExt.options.ext
		 */
		OPT_EXT = 'ext',
		
		/**
		 * HTML source that is used to generate elements necessary for the core and all other
		 * plugins to function.
		 *
		 * @name html.wrap
		 * @default '<div class="text-core"><div class="text-wrap"/></div>'
		 * @author agorbatchev
		 * @date 2011/08/19
		 * @id TextExt.options.html.wrap
		 */
		OPT_HTML_WRAP = 'html.wrap',

		/**
		 * HTML source that is used to generate hidden input value of which will be submitted 
		 * with the HTML form.
		 *
		 * @name html.hidden
		 * @default '<input type="hidden" />'
		 * @author agorbatchev
		 * @date 2011/08/20
		 * @id TextExt.options.html.hidden
		 */
		OPT_HTML_HIDDEN = 'html.hidden',
		
		/**
		 * Hash table of key codes and key names for which special events will be created
		 * by the core. For each entry a `[name]KeyDown`, `[name]KeyUp` and `[name]KeyPress` events 
		 * will be triggered along side with `anyKeyUp` and `anyKeyDown` events for every 
		 * key stroke.
		 *
		 * Here's a list of default keys:
		 *
		 *     {
		 *         8   : 'backspace',
		 *         9   : 'tab',
		 *         13  : 'enter!',
		 *         27  : 'escape!',
		 *         37  : 'left',
		 *         38  : 'up!',
		 *         39  : 'right',
		 *         40  : 'down!',
		 *         46  : 'delete',
		 *         108 : 'numpadEnter'
		 *     }
		 *
		 * Please note the `!` at the end of some keys. This tells the core that by default
		 * this keypress will be trapped and not passed on to the text input.
		 *
		 * @name keys
		 * @default { ... }
		 * @author agorbatchev
		 * @date 2011/08/19
		 * @id TextExt.options.keys
		 */
		OPT_KEYS = 'keys',

		/**
		 * The core triggers or reacts to the following events.
		 *
		 * @author agorbatchev
		 * @date 2011/08/17
		 * @id TextExt.events
		 */

		/**
		 * Core triggers `preInvalidate` event before the dimensions of padding on the text input
		 * are set.
		 *
		 * @name preInvalidate
		 * @author agorbatchev
		 * @date 2011/08/19
		 * @id TextExt.events.preInvalidate
		 */
		EVENT_PRE_INVALIDATE = 'preInvalidate',

		/**
		 * Core triggers `postInvalidate` event after the dimensions of padding on the text input
		 * are set.
		 *
		 * @name postInvalidate
		 * @author agorbatchev
		 * @date 2011/08/19
		 * @id TextExt.events.postInvalidate
		 */
		EVENT_POST_INVALIDATE = 'postInvalidate',
		
		/**
		 * Core triggers `getFormData` on every key press to collect data that will be populated
		 * into the hidden input that will be submitted with the HTML form and data that will
		 * be displayed in the input field that user is currently interacting with.
		 *
		 * All plugins that wish to affect how the data is presented or sent must react to 
		 * `getFormData` and populate the data in the following format:
		 *
		 *     {
		 *         input : {String},
		 *         form  : {Object}
		 *     }
		 *
		 * The data key must be a numeric weight which will be used to determine which data
		 * ends up being used. Data with the highest numerical weight gets the priority. This
		 * allows plugins to set the final data regardless of their initialization order, which
		 * otherwise would be impossible.
		 *
		 * For example, the Tags and Autocomplete plugins have to work side by side and Tags
		 * plugin must get priority on setting the data. Therefore the Tags plugin sets data
		 * with the weight 200 where as the Autocomplete plugin sets data with the weight 100.
		 *
		 * Here's an example of a typical `getFormData` handler:
		 * 
		 *     TextExtPlugin.prototype.onGetFormData = function(e, data, keyCode)
		 *     {
		 *         data[100] = self.formDataObject('input value', 'form value');
		 *     };
		 *
		 * Core also reacts to the `getFormData` and updates hidden input with data which will be
		 * submitted with the HTML form.
		 *
		 * @name getFormData
		 * @author agorbatchev
		 * @date 2011/08/19
		 * @id TextExt.events.getFormData
		 */
		EVENT_GET_FORM_DATA = 'getFormData',

		/**
		 * Core triggers and reacts to the `setFormData` event to update the actual value in the
		 * hidden input that will be submitted with the HTML form. Second argument can be value
		 * of any type and by default it will be JSON serialized with `TextExt.serializeData()`
		 * function.
		 *
		 * @name setFormData
		 * @author agorbatchev
		 * @date 2011/08/22
		 * @id TextExt.events.setFormData
		 */
		EVENT_SET_FORM_DATA = 'setFormData',

		/**
		 * Core triggers and reacts to the `setInputData` event to update the actual value in the
		 * text input that user is interacting with. Second argument must be of a `String` type
		 * the value of which will be set into the text input.
		 *
		 * @name setInputData
		 * @author agorbatchev
		 * @date 2011/08/22
		 * @id TextExt.events.setInputData
		 */
		EVENT_SET_INPUT_DATA = 'setInputData',
		
		/**
		 * Core triggers `postInit` event to let plugins run code after all plugins have been 
		 * created and initialized. This is a good place to set some kind of global values before 
		 * somebody gets to use them. This is not the right place to expect all plugins to finish
		 * their initialization.
		 *
		 * @name postInit
		 * @author agorbatchev
		 * @date 2011/08/19
		 * @id TextExt.events.postInit
		 */
		EVENT_POST_INIT = 'postInit',

		/**
		 * Core triggers `ready` event after all global configuration and prepearation has been
		 * done and the TextExt component is ready for use. Event handlers should expect all 
		 * values to be set and the plugins to be in the final state.
		 *
		 * @name ready
		 * @author agorbatchev
		 * @date 2011/08/19
		 * @id TextExt.events.ready
		 */
		EVENT_READY = 'ready',

		/**
		 * Core triggers `anyKeyUp` event for every key up event triggered within the component.
		 *
		 * @name anyKeyUp
		 * @author agorbatchev
		 * @date 2011/08/19
		 * @id TextExt.events.anyKeyUp
		 */

		/**
		 * Core triggers `anyKeyDown` event for every key down event triggered within the component.
		 *
		 * @name anyKeyDown
		 * @author agorbatchev
		 * @date 2011/08/19
		 * @id TextExt.events.anyKeyDown
		 */

		/**
		 * Core triggers `[name]KeyUp` event for every key specifid in the `keys` option that is 
		 * triggered within the component.
		 *
		 * @name [name]KeyUp
		 * @author agorbatchev
		 * @date 2011/08/19
		 * @id TextExt.events.[name]KeyUp
		 */

		/**
		 * Core triggers `[name]KeyDown` event for every key specified in the `keys` option that is 
		 * triggered within the component.
		 *
		 * @name [name]KeyDown
		 * @author agorbatchev
		 * @date 2011/08/19
		 * @id TextExt.events.[name]KeyDown
		 */

		/**
		 * Core triggers `[name]KeyPress` event for every key specified in the `keys` option that is 
		 * triggered within the component.
		 *
		 * @name [name]KeyPress
		 * @author agorbatchev
		 * @date 2011/08/19
		 * @id TextExt.events.[name]KeyPress
		 */

		DEFAULT_OPTS = {
			itemManager : ItemManager,

			plugins : [],
			ext : {},

			html : {
				wrap   : '<div class="text-core"><div class="text-wrap"/></div>',
				hidden : '<input type="hidden" />'
			},

			keys : {
				8   : 'backspace',
				9   : 'tab',
				13  : 'enter!',
				27  : 'escape!',
				37  : 'left',
				38  : 'up!',
				39  : 'right',
				40  : 'down!',
				46  : 'delete',
				108 : 'numpadEnter'
			}
		}
		;

	// Freak out if there's no JSON.stringify function found
	if(!stringify)
		throw new Error('JSON.stringify() not found');

	/**
	 * Returns object property by name where name is dot-separated and object is multiple levels deep.
	 * @param target Object Source object.
	 * @param name String Dot separated property name, ie `foo.bar.world`
	 * @id core.getProperty
	 */
	function getProperty(source, name)
	{
		if(typeof(name) === 'string')
			name = name.split('.');

		var fullCamelCaseName = name.join('.').replace(/\.(\w)/g, function(match, letter) { return letter.toUpperCase() }),
			nestedName        = name.shift(),
			result
			;

		if(typeof(result = source[fullCamelCaseName]) != UNDEFINED)
			result = result;

		else if(typeof(result = source[nestedName]) != UNDEFINED && name.length > 0)
			result = getProperty(result, name);

		// name.length here should be zero
		return result;
	};

	/**
	 * Hooks up specified events in the scope of the current object.
	 * @author agorbatchev
	 * @date 2011/08/09
	 */
	function hookupEvents()
	{
		var args   = slice.apply(arguments),
			self   = this,
			target = args.length === 1 ? self : args.shift(),
			event
			;

		args = args[0] || {};

		function bind(event, handler)
		{
			target.bind(event, function()
			{
				// apply handler to our PLUGIN object, not the target
				return handler.apply(self, arguments);
			});
		}

		for(event in args)
			bind(event, args[event]);
	};

	function formDataObject(input, form)
	{
		return { 'input' : input, 'form' : form };
	};

	//--------------------------------------------------------------------------------
	// ItemManager core component
	
	p = ItemManager.prototype;

	/**
	 * Initialization method called by the core during instantiation.
	 *
	 * @signature ItemManager.init(core)
	 *
	 * @param core {TextExt} Instance of the TextExt core class.
	 *
	 * @author agorbatchev
	 * @date 2011/08/19
	 * @id ItemManager.init
	 */
	p.init = function(core)
	{
	};

	/**
	 * Filters out items from the list that don't match the query and returns remaining items. Default 
	 * implementation checks if the item starts with the query.
	 *
	 * @signature ItemManager.filter(list, query)
	 *
	 * @param list {Array} List of items. Default implementation works with strings.
	 * @param query {String} Query string.
	 *
	 * @author agorbatchev
	 * @date 2011/08/19
	 * @id ItemManager.filter
	 */
	p.filter = function(list, query)
	{
		var result = [],
			i, item
			;

		for(i = 0; i < list.length; i++)
		{
			item = list[i];
			if(this.itemContains(item, query))
				result.push(item);
		}

		return result;
	};

	/**
	 * Returns `true` if specified item contains another string, `false` otherwise. In the default implementation 
	 * `String.indexOf()` is used to check if item string begins with the needle string.
	 *
	 * @signature ItemManager.itemContains(item, needle)
	 *
	 * @param item {Object} Item to check. Default implementation works with strings.
	 * @param needle {String} Search string to be found within the item.
	 *
	 * @author agorbatchev
	 * @date 2011/08/19
	 * @id ItemManager.itemContains
	 */
	p.itemContains = function(item, needle)
	{
		return this.itemToString(item).toLowerCase().indexOf(needle.toLowerCase()) == 0;
	};

	/**
	 * Converts specified string to item. Because default implemenation works with string, input string
	 * is simply returned back. To use custom objects, different implementation of this method could
	 * return something like `{ name : {String} }`.
	 *
	 * @signature ItemManager.stringToItem(str)
	 *
	 * @param str {String} Input string.
	 *
	 * @author agorbatchev
	 * @date 2011/08/19
	 * @id ItemManager.stringToItem
	 */
	p.stringToItem = function(str)
	{
		return str;
	};

	/**
	 * Converts specified item to string. Because default implemenation works with string, input string
	 * is simply returned back. To use custom objects, different implementation of this method could
	 * for example return `name` field of `{ name : {String} }`.
	 *
	 * @signature ItemManager.itemToString(item)
	 *
	 * @param item {Object} Input item to be converted to string.
	 *
	 * @author agorbatchev
	 * @date 2011/08/19
	 * @id ItemManager.itemToString
	 */
	p.itemToString = function(item)
	{
		return item;
	};

	/**
	 * Returns `true` if both items are equal, `false` otherwise. Because default implemenation works with 
	 * string, input items are compared as strings. To use custom objects, different implementation of this 
	 * method could for example compare `name` fields of `{ name : {String} }` type object.
	 *
	 * @signature ItemManager.compareItems(item1, item2)
	 *
	 * @param item1 {Object} First item.
	 * @param item2 {Object} Second item.
	 *
	 * @author agorbatchev
	 * @date 2011/08/19
	 * @id ItemManager.compareItems
	 */
	p.compareItems = function(item1, item2)
	{
		return item1 == item2;
	};

	//--------------------------------------------------------------------------------
	// TextExt core component

	p = TextExt.prototype;
		
	/**
	 * Initializes current component instance with work with the supplied text input and options.
	 *
	 * @signature TextExt.init(input, opts)
	 *
	 * @param input {HTMLElement} Text input.
	 * @param opts {Object} Options.
	 *
	 * @author agorbatchev
	 * @date 2011/08/19
	 * @id TextExt.init
	 */
	p.init = function(input, opts)
	{
		var self = this,
			hiddenInput,
			itemManager,
			container
			;

		self._defaults    = $.extend({}, DEFAULT_OPTS);
		self._opts        = opts || {};
		self._plugins     = {};
		self._itemManager = itemManager = new (self.opts(OPT_ITEM_MANAGER))();
		input             = $(input);
		container         = $(self.opts(OPT_HTML_WRAP));
		hiddenInput       = $(self.opts(OPT_HTML_HIDDEN));

		input
			.wrap(container)
			.keydown(function(e) { return self.onKeyDown(e) })
			.keyup(function(e) { return self.onKeyUp(e) })
			.data('textext', self)
			;

		// keep references to html elements using jQuery.data() to avoid circular references
		$(self).data({
			'hiddenInput'   : hiddenInput,
			'wrapElement' : input.parents('.text-wrap').first(),
			'input'         : input
		});

		// set the name of the hidden input to the text input's name
		hiddenInput.attr('name', input.attr('name'));
		// remove name attribute from the text input
		input.attr('name', null);
		// add hidden input to the DOM
		hiddenInput.insertAfter(input);

		$.extend(true, itemManager, self.opts(OPT_EXT + '.item.manager'));
		$.extend(true, self, self.opts(OPT_EXT + '.*'), self.opts(OPT_EXT + '.core'));
		
		self.originalWidth = input.outerWidth();

		self.invalidateBounds();

		itemManager.init(self);

		self.initPatches();
		self.initPlugins(self.opts(OPT_PLUGINS), $.fn.textext.plugins);

		self.on({
			setFormData  : self.onSetFormData,
			getFormData  : self.onGetFormData,
			setInputData : self.onSetInputData,
			anyKeyUp     : self.onAnyKeyUp
		});

		self.trigger(EVENT_POST_INIT);
		self.trigger(EVENT_READY);

		self.getFormData(0);
	};

	/**
	 * Initialized all installed patches against current instance. The patches are initialized based on their
	 * initialization priority which is returned by each patch's `initPriority()` method. Priority
	 * is a `Number` where patches with higher value gets their `init()` method called before patches
	 * with lower priority value.
	 *
	 * This facilitates initializing of patches in certain order to insure proper dependencies
	 * regardless of which order they are loaded.
	 *
	 * By default all patches have the same priority - zero, which means they will be initialized
	 * in rorder they are loaded, that is unless `initPriority()` is overriden.
	 *
	 * @signature TextExt.initPatches()
	 *
	 * @author agorbatchev
	 * @date 2011/10/11
	 * @id TextExt.initPatches
	 */
	p.initPatches = function()
	{
		var list   = [],
			source = $.fn.textext.patches,
			name
			;

		for(name in source)
			list.push(name);

		this.initPlugins(list, source);
	};

	/**
	 * Creates and initializes all specified plugins. The plugins are initialized based on their
	 * initialization priority which is returned by each plugin's `initPriority()` method. Priority
	 * is a `Number` where plugins with higher value gets their `init()` method called before plugins
	 * with lower priority value.
	 *
	 * This facilitates initializing of plugins in certain order to insure proper dependencies
	 * regardless of which order user enters them in the `plugins` option field.
	 *
	 * By default all plugins have the same priority - zero, which means they will be initialized
	 * in the same order as entered by the user.
	 *
	 * @signature TextExt.initPlugins(plugins)
	 *
	 * @param plugins {Array} List of plugin names to initialize.
	 *
	 * @author agorbatchev
	 * @date 2011/08/19
	 * @id TextExt.initPlugins
	 */
	p.initPlugins = function(plugins, source)
	{
		var self = this,
			ext, name, plugin, initList = [], i
			;

		if(typeof(plugins) == 'string')
			plugins = plugins.split(/\s*,\s*|\s+/g);

		for(i = 0; i < plugins.length; i++)
		{
			name   = plugins[i];
			plugin = source[name];

			if(plugin)
			{
				self._plugins[name] = plugin = new plugin();
				self[name] = (function(plugin) { 
				  return function(){ return plugin; } 
				})(plugin);
				initList.push(plugin);
				$.extend(true, plugin, self.opts(OPT_EXT + '.*'), self.opts(OPT_EXT + '.' + name));
			}
		}

		// sort plugins based on their priority values
		initList.sort(function(p1, p2)
		{
			p1 = p1.initPriority();
			p2 = p2.initPriority();

			return p1 === p2
				? 0
				: p1 < p2 ? 1 : -1
				;
		});

		for(i = 0; i < initList.length; i++)
			initList[i].init(self);
	};

	/**
	 * Returns true if specified plugin is was instantiated for the current instance of core.
	 *
	 * @signature TextExt.hasPlugin(name)
	 *
	 * @param name {String} Name of the plugin to check.
	 *
	 * @author agorbatchev
	 * @date 2011/12/28
	 * @id TextExt.hasPlugin
	 * @version 1.1
	 */
	p.hasPlugin = function(name)
	{
		return !!this._plugins[name];
	};

	/**
	 * Allows to add multiple event handlers which will be execued in the scope of the current object.
	 * 
	 * @signature TextExt.on([target], handlers)
	 *
	 * @param target {Object} **Optional**. Target object which has traditional `bind(event, handler)` method.
	 *                        Handler function will still be executed in the current object's scope.
	 * @param handlers {Object} Key/value pairs of event names and handlers, eg `{ event: handler }`.
	 *
	 * @author agorbatchev
	 * @date 2011/08/19
	 * @id TextExt.on
	 */
	p.on = hookupEvents;

	/**
	 * Binds an event handler to the input box that user interacts with.
	 *
	 * @signature TextExt.bind(event, handler)
	 *
	 * @param event {String} Event name.
	 * @param handler {Function} Event handler.
	 *
	 * @author agorbatchev
	 * @date 2011/08/19
	 * @id TextExt.bind
	 */
	p.bind = function(event, handler)
	{
		this.input().bind(event, handler);
	};

	/**
	 * Triggers an event on the input box that user interacts with. All core events are originated here.
	 * 
	 * @signature TextExt.trigger(event, ...args)
	 *
	 * @param event {String} Name of the event to trigger.
	 * @param ...args All remaining arguments will be passed to the event handler.
	 *
	 * @author agorbatchev
	 * @date 2011/08/19
	 * @id TextExt.trigger
	 */
	p.trigger = function()
	{
		var args = arguments;
		this.input().trigger(args[0], slice.call(args, 1));
	};

	/**
	 * Returns instance of `itemManager` that is used by the component.
	 *
	 * @signature TextExt.itemManager()
	 *
	 * @author agorbatchev
	 * @date 2011/08/19
	 * @id TextExt.itemManager
	 */
	p.itemManager = function()
	{
		return this._itemManager;
	};

	/**
	 * Returns jQuery input element with which user is interacting with.
	 *
	 * @signature TextExt.input()
	 *
	 * @author agorbatchev
	 * @date 2011/08/10
	 * @id TextExt.input
	 */
	p.input = function()
	{
		return $(this).data('input');
	};

	/**
	 * Returns option value for the specified option by name. If the value isn't found in the user
	 * provided options, it will try looking for default value.
	 *
	 * @signature TextExt.opts(name)
	 *
	 * @param name {String} Option name as described in the options.
	 *
	 * @author agorbatchev
	 * @date 2011/08/19
	 * @id TextExt.opts
	 */
	p.opts = function(name)
	{
		var result = getProperty(this._opts, name);
		return typeof(result) == 'undefined' ? getProperty(this._defaults, name) : result;
	};

	/**
	 * Returns HTML element that was created from the `html.wrap` option. This is the top level HTML
	 * container for the text input with which user is interacting with.
	 *
	 * @signature TextExt.wrapElement()
	 *
	 * @author agorbatchev
	 * @date 2011/08/19
	 * @id TextExt.wrapElement
	 */
	p.wrapElement = function()
	{
		return $(this).data('wrapElement');
	};

	/**
	 * Updates container to match dimensions of the text input. Triggers `preInvalidate` and `postInvalidate`
	 * events.
	 *
	 * @signature TextExt.invalidateBounds()
	 *
	 * @author agorbatchev
	 * @date 2011/08/19
	 * @id TextExt.invalidateBounds
	 */
	p.invalidateBounds = function()
	{
		var self      = this,
			input     = self.input(),
			wrap      = self.wrapElement(),
			container = wrap.parent(),
			width     = self.originalWidth + 'px',
			height
			;

		self.trigger(EVENT_PRE_INVALIDATE);

		height = input.outerHeight() + 'px';

		// using css() method instead of width() and height() here because they don't seem to do the right thing in jQuery 1.8.x
		// https://github.com/alexgorbatchev/jquery-textext/issues/74
		input.css({ 'width' : width });
		wrap.css({ 'width' : width, 'height' : height });
		container.css({ 'height' : height }); 

		self.trigger(EVENT_POST_INVALIDATE);
	};

	/**
	 * Focuses user input on the text box.
	 *
	 * @signature TextExt.focusInput()
	 *
	 * @author agorbatchev
	 * @date 2011/08/19
	 * @id TextExt.focusInput
	 */
	p.focusInput = function()
	{
		this.input()[0].focus();
	};

	/**
	 * Serializes data for to be set into the hidden input field and which will be submitted 
	 * with the HTML form.
	 *
	 * By default simple JSON serialization is used. It's expected that `JSON.stringify`
	 * method would be available either through built in class in most modern browsers
	 * or through JSON2 library.
	 *
	 * @signature TextExt.serializeData(data)
	 *
	 * @param data {Object} Data to serialize.
	 *
	 * @author agorbatchev
	 * @date 2011/08/09
	 * @id TextExt.serializeData
	 */
	p.serializeData = stringify;

	/**
	 * Returns the hidden input HTML element which will be submitted with the HTML form.
	 *
	 * @signature TextExt.hiddenInput()
	 *
	 * @author agorbatchev
	 * @date 2011/08/09
	 * @id TextExt.hiddenInput
	 */
	p.hiddenInput = function(value)
	{
		return $(this).data('hiddenInput');
	};

	/**
	 * Abstracted functionality to trigger an event and get the data with maximum weight set by all
	 * the event handlers. This functionality is used for the `getFormData` event.
	 *
	 * @signature TextExt.getWeightedEventResponse(event, args)
	 *
	 * @param event {String} Event name.
	 * @param args {Object} Argument to be passed with the event.
	 *
	 * @author agorbatchev
	 * @date 2011/08/22
	 * @id TextExt.getWeightedEventResponse
	 */
	p.getWeightedEventResponse = function(event, args)
	{
		var self      = this,
			data      = {},
			maxWeight = 0
			;

		self.trigger(event, data, args);

		for(var weight in data)
			maxWeight = Math.max(maxWeight, weight);

		return data[maxWeight];
	};

	/**
	 * Triggers the `getFormData` event to get all the plugins to return their data.
	 *
	 * After the data is returned, triggers `setFormData` and `setInputData` to update appopriate values.
	 *
	 * @signature TextExt.getFormData(keyCode)
	 *
	 * @param keyCode {Number} Key code number which has triggered this update. It's impotant to pass
	 * this value to the plugins because they might return different values based on the key that was 
	 * pressed. For example, the Tags plugin returns an empty string for the `input` value if the enter
	 * key was pressed, otherwise it returns whatever is currently in the text input.
	 *
	 * @author agorbatchev
	 * @date 2011/08/22
	 * @id TextExt.getFormData
	 */
	p.getFormData = function(keyCode)
	{
		var self = this,
			data = self.getWeightedEventResponse(EVENT_GET_FORM_DATA, keyCode || 0)
			;

		self.trigger(EVENT_SET_FORM_DATA  , data['form']);
		self.trigger(EVENT_SET_INPUT_DATA , data['input']);
	};

	//--------------------------------------------------------------------------------
	// Event handlers

	/**
	 * Reacts to the `anyKeyUp` event and triggers the `getFormData` to change data that will be submitted
	 * with the form. Default behaviour is that everything that is typed in will be JSON serialized, so
	 * the end result will be a JSON string.
	 *
	 * @signature TextExt.onAnyKeyUp(e)
	 *
	 * @param e {Object} jQuery event.
	 *
	 * @author agorbatchev
	 * @date 2011/08/19
	 * @id TextExt.onAnyKeyUp
	 */
	p.onAnyKeyUp = function(e, keyCode)
	{
		this.getFormData(keyCode);
	};

	/**
	 * Reacts to the `setInputData` event and populates the input text field that user is currently
	 * interacting with.
	 *
	 * @signature TextExt.onSetInputData(e, data)
	 *
	 * @param e {Event} jQuery event.
	 * @param data {String} Value to be set.
	 *
	 * @author agorbatchev
	 * @date 2011/08/22
	 * @id TextExt.onSetInputData
	 */
	p.onSetInputData = function(e, data)
	{
		this.input().val(data);
	};

	/**
	 * Reacts to the `setFormData` event and populates the hidden input with will be submitted with
	 * the HTML form. The value will be serialized with `serializeData()` method.
	 *
	 * @signature TextExt.onSetFormData(e, data)
	 *
	 * @param e {Event} jQuery event.
	 * @param data {Object} Data that will be set.
	 * 
	 * @author agorbatchev
	 * @date 2011/08/22
	 * @id TextExt.onSetFormData
	 */
	p.onSetFormData = function(e, data)
	{
		var self = this;
		self.hiddenInput().val(self.serializeData(data));
	};

	/**
	 * Reacts to `getFormData` event triggered by the core. At the bare minimum the core will tell
	 * itself to use the current value in the text input as the data to be submitted with the HTML
	 * form.
	 *
	 * @signature TextExt.onGetFormData(e, data)
	 *
	 * @param e {Event} jQuery event.
	 *
	 * @author agorbatchev
	 * @date 2011/08/09
	 * @id TextExt.onGetFormData
	 */
	p.onGetFormData = function(e, data)
	{
		var val = this.input().val();
		data[0] = formDataObject(val, val);
	};

	//--------------------------------------------------------------------------------
	// User mouse/keyboard input

	/**
	 * Triggers `[name]KeyUp` and `[name]KeyPress` for every keystroke as described in the events.
	 *
	 * @signature TextExt.onKeyUp(e)
	 *
	 * @param e {Object} jQuery event.
	 * @author agorbatchev
	 * @date 2011/08/19
	 * @id TextExt.onKeyUp
	 */

	/**
	 * Triggers `[name]KeyDown` for every keystroke as described in the events.
	 *
	 * @signature TextExt.onKeyDown(e)
	 *
	 * @param e {Object} jQuery event.
	 * @author agorbatchev
	 * @date 2011/08/19
	 * @id TextExt.onKeyDown
	 */
	
	$(['Down', 'Up']).each(function()
	{
		var type = this.toString();

		p['onKey' + type] = function(e)
		{
			var self          = this,
				keyName       = self.opts(OPT_KEYS)[e.keyCode],
				defaultResult = true
				;

			if(keyName)
			{
				defaultResult = keyName.substr(-1) != '!';
				keyName       = keyName.replace('!', '');

				self.trigger(keyName + 'Key' + type);

				// manual *KeyPress event fimplementation for the function keys like Enter, Backspace, etc.
				if(type == 'Up' && self._lastKeyDown == e.keyCode)
				{
					self._lastKeyDown = null;
					self.trigger(keyName + 'KeyPress');
				}

				if(type == 'Down')
					self._lastKeyDown = e.keyCode;
			}

			self.trigger('anyKey' + type, e.keyCode);

			return defaultResult;
		};
	});

	//--------------------------------------------------------------------------------
	// Plugin Base
	
	p = TextExtPlugin.prototype;

	/**
	 * Allows to add multiple event handlers which will be execued in the scope of the current object.
	 * 
	 * @signature TextExt.on([target], handlers)
	 *
	 * @param target {Object} **Optional**. Target object which has traditional `bind(event, handler)` method.
	 *                        Handler function will still be executed in the current object's scope.
	 * @param handlers {Object} Key/value pairs of event names and handlers, eg `{ event: handler }`.
	 *
	 * @author agorbatchev
	 * @date 2011/08/19
	 * @id TextExtPlugin.on
	 */
	p.on = hookupEvents;

	/**
	 * Returns the hash object that `getFormData` triggered by the core expects.
	 *
	 * @signature TextExtPlugin.formDataObject(input, form)
	 *
	 * @param input {String} Value that will go into the text input that user is interacting with.
	 * @param form {Object} Value that will be serialized and put into the hidden that will be submitted
	 * with the HTML form.
	 *
	 * @author agorbatchev
	 * @date 2011/08/22
	 * @id TextExtPlugin.formDataObject
	 */
	p.formDataObject = formDataObject;

	/**
	 * Initialization method called by the core during plugin instantiation. This method must be implemented
	 * by each plugin individually.
	 *
	 * @signature TextExtPlugin.init(core)
	 *
	 * @param core {TextExt} Instance of the TextExt core class.
	 *
	 * @author agorbatchev
	 * @date 2011/08/19
	 * @id TextExtPlugin.init
	 */
	p.init = function(core) { throw new Error('Not implemented') };

	/**
	 * Initialization method wich should be called by the plugin during the `init()` call.
	 *
	 * @signature TextExtPlugin.baseInit(core, defaults)
	 *
	 * @param core {TextExt} Instance of the TextExt core class.
	 * @param defaults {Object} Default plugin options. These will be checked if desired value wasn't
	 * found in the options supplied by the user.
	 *
	 * @author agorbatchev
	 * @date 2011/08/19
	 * @id TextExtPlugin.baseInit
	 */
	p.baseInit = function(core, defaults)
	{
		var self = this;

		core._defaults = $.extend(true, core._defaults, defaults);
		self._core     = core;
		self._timers   = {};
	};

	/**
	 * Allows starting of multiple timeout calls. Each time this method is called with the same
	 * timer name, the timer is reset. This functionality is useful in cases where an action needs
	 * to occur only after a certain period of inactivity. For example, making an AJAX call after 
	 * user stoped typing for 1 second.
	 *
	 * @signature TextExtPlugin.startTimer(name, delay, callback)
	 *
	 * @param name {String} Timer name.
	 * @param delay {Number} Delay in seconds.
	 * @param callback {Function} Callback function.
	 *
	 * @author agorbatchev
	 * @date 2011/08/25
	 * @id TextExtPlugin.startTimer
	 */
	p.startTimer = function(name, delay, callback)
	{
		var self = this;

		self.stopTimer(name);

		self._timers[name] = setTimeout(
			function()
			{
				delete self._timers[name];
				callback.apply(self);
			},
			delay * 1000
		);
	};

	/**
	 * Stops the timer by name without resetting it.
	 *
	 * @signature TextExtPlugin.stopTimer(name)
	 *
	 * @param name {String} Timer name.
	 *
	 * @author agorbatchev
	 * @date 2011/08/25
	 * @id TextExtPlugin.stopTimer
	 */
	p.stopTimer = function(name)
	{
		clearTimeout(this._timers[name]);
	};

	/**
	 * Returns instance of the `TextExt` to which current instance of the plugin is attached to.
	 *
	 * @signature TextExtPlugin.core()
	 *
	 * @author agorbatchev
	 * @date 2011/08/19
	 * @id TextExtPlugin.core
	 */
	p.core = function()
	{
		return this._core;
	};

	/**
	 * Shortcut to the core's `opts()` method. Returns option value.
	 *
	 * @signature TextExtPlugin.opts(name)
	 * 
	 * @param name {String} Option name as described in the options.
	 *
	 * @author agorbatchev
	 * @date 2011/08/19
	 * @id TextExtPlugin.opts
	 */
	p.opts = function(name)
	{
		return this.core().opts(name);
	};

	/**
	 * Shortcut to the core's `itemManager()` method. Returns instance of the `ItemManger` that is
	 * currently in use.
	 *
	 * @signature TextExtPlugin.itemManager()
	 *
	 * @author agorbatchev
	 * @date 2011/08/19
	 * @id TextExtPlugin.itemManager
	 */
	p.itemManager = function()
	{
		return this.core().itemManager();
	};

	/**
	 * Shortcut to the core's `input()` method. Returns instance of the HTML element that represents
	 * current text input.
	 *
	 * @signature TextExtPlugin.input()
	 *
	 * @author agorbatchev
	 * @date 2011/08/19
	 * @id TextExtPlugin.input
	 */
	p.input = function()
	{
		return this.core().input();
	};

	/**
	 * Shortcut to the commonly used `this.input().val()` call to get or set value of the text input.
	 *
	 * @signature TextExtPlugin.val(value)
	 *
	 * @param value {String} Optional value. If specified, the value will be set, otherwise it will be
	 * returned.
	 *
	 * @author agorbatchev
	 * @date 2011/08/20
	 * @id TextExtPlugin.val
	 */
	p.val = function(value)
	{
		var input = this.input();

		if(typeof(value) === UNDEFINED)
			return input.val();
		else
			input.val(value);
	};

	/**
	 * Shortcut to the core's `trigger()` method. Triggers specified event with arguments on the
	 * component core.
	 *
	 * @signature TextExtPlugin.trigger(event, ...args)
	 *
	 * @param event {String} Name of the event to trigger.
	 * @param ...args All remaining arguments will be passed to the event handler.
	 *
	 * @author agorbatchev
	 * @date 2011/08/19
	 * @id TextExtPlugin.trigger
	 */
	p.trigger = function()
	{
		var core = this.core();
		core.trigger.apply(core, arguments);
	};

	/**
	 * Shortcut to the core's `bind()` method. Binds specified handler to the event.
	 *
	 * @signature TextExtPlugin.bind(event, handler)
	 *
	 * @param event {String} Event name.
	 * @param handler {Function} Event handler.
	 *
	 * @author agorbatchev
	 * @date 2011/08/20
	 * @id TextExtPlugin.bind
	 */
	p.bind = function(event, handler)
	{
		this.core().bind(event, handler);
	};

	/**
	 * Returns initialization priority for this plugin. If current plugin depends upon some other plugin
	 * to be initialized before or after, priority needs to be adjusted accordingly. Plugins with higher
	 * priority initialize before plugins with lower priority.
	 *
	 * Default initialization priority is `0`.
	 *
	 * @signature TextExtPlugin.initPriority()
	 *
	 * @author agorbatchev
	 * @date 2011/08/22
	 * @id TextExtPlugin.initPriority
	 */
	p.initPriority = function()
	{
		return 0;
	};

	//--------------------------------------------------------------------------------
	// jQuery Integration
	
	/**
	 * TextExt integrates as a jQuery plugin available through the `$(selector).textext(opts)` call. If
	 * `opts` argument is passed, then a new instance of `TextExt` will be created for all the inputs
	 * that match the `selector`. If `opts` wasn't passed and TextExt was already intantiated for 
	 * inputs that match the `selector`, array of `TextExt` instances will be returned instead.
	 *
	 *     // will create a new instance of `TextExt` for all elements that match `.sample`
	 *     $('.sample').textext({ ... });
	 *
	 *     // will return array of all `TextExt` instances
	 *     var list = $('.sample').textext();
	 *
	 * The following properties are also exposed through the jQuery `$.fn.textext`:
	 *
	 * * `TextExt` -- `TextExt` class.
	 * * `TextExtPlugin` -- `TextExtPlugin` class.
	 * * `ItemManager` -- `ItemManager` class.
	 * * `plugins` -- Key/value table of all registered plugins.
	 * * `addPlugin(name, constructor)` -- All plugins should register themselves using this function.
	 *
	 * @author agorbatchev
	 * @date 2011/08/19
	 * @id TextExt.jquery
	 */

	var cssInjected = false;

	var textext = $.fn.textext = function(opts)
	{
		var css;
		
		if(!cssInjected && (css = $.fn.textext.css) != null)
		{
			$('head').append('<style>' + css + '</style>');
			cssInjected = true;
		}

		return this.map(function()
		{
			var self = $(this);

			if(opts == null)
				return self.data('textext');

			var instance = new TextExt();

			instance.init(self, opts);
			self.data('textext', instance);

			return instance.input()[0];
		});
	};

	/**
	 * This static function registers a new plugin which makes it available through the `plugins` option
	 * to the end user. The name specified here is the name the end user would put in the `plugins` option
	 * to add this plugin to a new instance of TextExt.
	 * 
	 * @signature $.fn.textext.addPlugin(name, constructor)
	 *
	 * @param name {String} Name of the plugin.
	 * @param constructor {Function} Plugin constructor.
	 *
	 * @author agorbatchev
	 * @date 2011/10/11
	 * @id TextExt.addPlugin
	 */
	textext.addPlugin = function(name, constructor)
	{
		textext.plugins[name] = constructor;
		constructor.prototype = new textext.TextExtPlugin();
	};

	/**
	 * This static function registers a new patch which is added to each instance of TextExt. If you are
	 * adding a new patch, make sure to call this method.
	 * 
	 * @signature $.fn.textext.addPatch(name, constructor)
	 *
	 * @param name {String} Name of the patch.
	 * @param constructor {Function} Patch constructor.
	 *
	 * @author agorbatchev
	 * @date 2011/10/11
	 * @id TextExt.addPatch
	 */
	textext.addPatch = function(name, constructor)
	{
		textext.patches[name] = constructor;
		constructor.prototype = new textext.TextExtPlugin();
	};

	textext.TextExt       = TextExt;
	textext.TextExtPlugin = TextExtPlugin;
	textext.ItemManager   = ItemManager;
	textext.plugins       = {};
	textext.patches       = {};
})(jQuery);

(function($)
{
	function TextExtIE9Patches() {};

	$.fn.textext.TextExtIE9Patches = TextExtIE9Patches;
	$.fn.textext.addPatch('ie9',TextExtIE9Patches);

	var p = TextExtIE9Patches.prototype;

	p.init = function(core)
	{
		if(navigator.userAgent.indexOf('MSIE 9') == -1)
			return;

		var self = this;

		core.on({ postInvalidate : self.onPostInvalidate });
	};

	p.onPostInvalidate = function()
	{
		var self  = this,
			input = self.input(),
			val   = input.val()
			;

		// agorbatchev :: IE9 doesn't seem to update the padding if box-sizing is on until the
		// text box value changes, so forcing this change seems to do the trick of updating
		// IE's padding visually.
		input.val(Math.random());
		input.val(val);
	};
})(jQuery);


define("jam/jquery-textext/src/js/textext.core.js", function(){});

/**
 * jQuery TextExt Plugin
 * http://textextjs.com
 *
 * @version 1.3.1
 * @copyright Copyright (C) 2011 Alex Gorbatchev. All rights reserved.
 * @license MIT License
 */
(function($)
{
	/**
	 * AJAX plugin is very useful if you want to load list of items from a data point and pass it
	 * to the Autocomplete or Filter plugins.
	 *
	 * Because it meant to be as a helper method for either Autocomplete or Filter plugin, without
	 * either of these two present AJAX plugin won't do anything.
	 *
	 * @author agorbatchev
	 * @date 2011/08/16
	 * @id TextExtAjax
	 */
	function TextExtAjax() {};

	$.fn.textext.TextExtAjax = TextExtAjax;
	$.fn.textext.addPlugin('ajax', TextExtAjax);

	var p = TextExtAjax.prototype,

		/**
		 * AJAX plugin options are grouped under `ajax` when passed to the `$().textext()` function. Be
		 * mindful that the whole `ajax` object is also passed to jQuery `$.ajax` call which means that
		 * you can change all jQuery options as well. Please refer to the jQuery documentation on how
		 * to set url and all other parameters. For example:
		 *
		 *     $('textarea').textext({
		 *         plugins: 'ajax',
		 *         ajax: {
		 *             url: 'http://...'
		 *         }
		 *     })
		 *
		 * **Important**: Because it's necessary to pass options to `jQuery.ajax()` in a single object,
		 * all jQuery related AJAX options like `url`, `dataType`, etc **must** be within the `ajax` object.
		 * This is the exception to general rule that TextExt options can be specified in dot or camel case 
		 * notation.
		 * 
		 * @author agorbatchev
		 * @date 2011/08/16
		 * @id TextExtAjax.options
		 */

		/**
		 * By default, when user starts typing into the text input, AJAX plugin will start making requests
		 * to the `url` that you have specified and will pass whatever user has typed so far as a parameter
		 * named `q`, eg `?q=foo`.
		 *
		 * If you wish to change this behaviour, you can pass a function as a value for this option which
		 * takes one argument (the user input) and should return a key/value object that will be converted
		 * to the request parameters. For example:
		 *
		 *     'dataCallback' : function(query)
		 *     {
		 *         return { 'search' : query };
		 *     } 
		 *
		 * @name ajax.data.callback
		 * @default null
		 * @author agorbatchev
		 * @date 2011/08/16
		 * @id TextExtAjax.options.data.callback
		 */
		OPT_DATA_CALLBACK = 'ajax.data.callback',
		
		/**
		 * By default, the server end point is constantly being reloaded whenever user changes the value
		 * in the text input. If you'd rather have the client do result filtering, you can return all
		 * possible results from the server and cache them on the client by setting this option to `true`.
		 *
		 * In such a case, only one call to the server will be made and filtering will be performed on
		 * the client side using `ItemManager` attached to the core.
		 *
		 * @name ajax.data.results
		 * @default false
		 * @author agorbatchev
		 * @date 2011/08/16
		 * @id TextExtAjax.options.cache.results
		 */
		OPT_CACHE_RESULTS = 'ajax.cache.results',
		
		/**
		 * The loading message delay is set in seconds and will specify how long it would take before
		 * user sees the message. If you don't want user to ever see this message, set the option value
		 * to `Number.MAX_VALUE`.
		 *
		 * @name ajax.loading.delay
		 * @default 0.5
		 * @author agorbatchev
		 * @date 2011/08/16
		 * @id TextExtAjax.options.loading.delay
		 */
		OPT_LOADING_DELAY = 'ajax.loading.delay',

		/**
		 * Whenever an AJAX request is made and the server takes more than the number of seconds specified
		 * in `ajax.loading.delay` to respond, the message specified in this option will appear in the drop
		 * down.
		 *
		 * @name ajax.loading.message
		 * @default "Loading..."
		 * @author agorbatchev
		 * @date 2011/08/17
		 * @id TextExtAjax.options.loading.message
		 */
		OPT_LOADING_MESSAGE = 'ajax.loading.message',

		/**
		 * When user is typing in or otherwise changing the value of the text input, it's undesirable to make
		 * an AJAX request for every keystroke. Instead it's more conservative to send a request every number
		 * of seconds while user is typing the value. This number of seconds is specified by the `ajax.type.delay`
		 * option.
		 *
		 * @name ajax.type.delay
		 * @default 0.5
		 * @author agorbatchev
		 * @date 2011/08/17
		 * @id TextExtAjax.options.type.delay
		 */
		OPT_TYPE_DELAY = 'ajax.type.delay',

		/**
		 * AJAX plugin dispatches or reacts to the following events.
		 *
		 * @author agorbatchev
		 * @date 2011/08/17
		 * @id TextExtAjax.events
		 */

		/**
		 * AJAX plugin reacts to the `getSuggestions` event dispatched by the Autocomplete plugin.
		 *
		 * @name getSuggestions
		 * @author agorbatchev
		 * @date 2011/08/17
		 * @id TextExtAjax.events.getSuggestions
		 */

		/**
		 * In the event of successful AJAX request, the AJAX coponent dispatches the `setSuggestions`
		 * event meant to be recieved by the Autocomplete plugin.
		 *
		 * @name setSuggestions
		 * @author agorbatchev
		 * @date 2011/08/17
		 * @id TextExtAjax.events.setSuggestions
		 */
		EVENT_SET_SUGGESTION = 'setSuggestions',

		/**
		 * AJAX plugin dispatches the `showDropdown` event which Autocomplete plugin is expecting.
		 * This is used to temporarily show the loading message if the AJAX request is taking longer
		 * than expected.
		 *
		 * @name showDropdown
		 * @author agorbatchev
		 * @date 2011/08/17
		 * @id TextExtAjax.events.showDropdown
		 */
		EVENT_SHOW_DROPDOWN = 'showDropdown',

		TIMER_LOADING = 'loading',

		DEFAULT_OPTS = {
			ajax : {
				typeDelay      : 0.5,
				loadingMessage : 'Loading...',
				loadingDelay   : 0.5,
				cacheResults   : false,
				dataCallback   : null
			}
		}
		;

	/**
	 * Initialization method called by the core during plugin instantiation.
	 *
	 * @signature TextExtAjax.init(core)
	 *
	 * @param core {TextExt} Instance of the TextExt core class.
	 *
	 * @author agorbatchev
	 * @date 2011/08/17
	 * @id TextExtAjax.init
	 */
	p.init = function(core)
	{
		var self = this;

		self.baseInit(core, DEFAULT_OPTS);

		self.on({
			getSuggestions : self.onGetSuggestions
		});

		self._suggestions = null;
	};

	/**
	 * Performas an async AJAX with specified options.
	 *
	 * @signature TextExtAjax.load(query)
	 *
	 * @param query {String} Value that user has typed into the text area which is
	 * presumably the query.
	 *
	 * @author agorbatchev
	 * @date 2011/08/14
	 * @id TextExtAjax.load
	 */
	p.load = function(query)
	{
		var self         = this,
			dataCallback = self.opts(OPT_DATA_CALLBACK) || function(query) { return { q : query } },
			opts
			;

		opts = $.extend(true,
			{
				data    : dataCallback(query),
				success : function(data) { self.onComplete(data, query) },
				error   : function(jqXHR, message) { console.error(message, query) }
			}, 
			self.opts('ajax')
		);

		$.ajax(opts);
	};

	/**
	 * Successful call AJAX handler. Takes the data that came back from AJAX and the
	 * original query that was used to make the call.
	 *
	 * @signature TextExtAjax.onComplete(data, query)
	 *
	 * @param data {Object} Data loaded from the server, should be an Array of strings
	 * by default or whatever data structure your custom `ItemManager` implements.
	 *
	 * @param query {String} Query string, ie whatever user has typed in.
	 *
	 * @author agorbatchev
	 * @date 2011/08/14
	 * @id TextExtAjax.onComplete
	 */
	p.onComplete = function(data, query)
	{
		var self   = this,
			result = data
			;
		
		self.dontShowLoading();

		// If results are expected to be cached, then we store the original
		// data set and return the filtered one based on the original query.
		// That means we do filtering on the client side, instead of the
		// server side.
		if(self.opts(OPT_CACHE_RESULTS) == true)
		{
			self._suggestions = data;
			result = self.itemManager().filter(data, query);
		}

		self.trigger(EVENT_SET_SUGGESTION, { result : result });
	};

	/**
	 * If show loading message timer was started, calling this function disables it,
	 * otherwise nothing else happens.
	 *
	 * @signature TextExtAjax.dontShowLoading()
	 *
	 * @author agorbatchev
	 * @date 2011/08/16
	 * @id TextExtAjax.dontShowLoading
	 */
	p.dontShowLoading = function()
	{
		this.stopTimer(TIMER_LOADING);
	};

	/**
	 * Shows message specified in `ajax.loading.message` if loading data takes more than
	 * number of seconds specified in `ajax.loading.delay`.
	 *
	 * @signature TextExtAjax.showLoading()
	 *
	 * @author agorbatchev
	 * @date 2011/08/15
	 * @id TextExtAjax.showLoading
	 */
	p.showLoading = function()
	{
		var self = this;

		self.dontShowLoading();
		self.startTimer(
			TIMER_LOADING,
			self.opts(OPT_LOADING_DELAY),
			function()
			{
				self.trigger(EVENT_SHOW_DROPDOWN, function(autocomplete)
				{
					autocomplete.clearItems();
					var node = autocomplete.addDropdownItem(self.opts(OPT_LOADING_MESSAGE));
					node.addClass('text-loading');
				});
			}
		);
	};

	/**
	 * Reacts to the `getSuggestions` event and begin loading suggestions. If
	 * `ajax.cache.results` is specified, all calls after the first one will use
	 * cached data and filter it with the `core.itemManager.filter()`.
	 *
	 * @signature TextExtAjax.onGetSuggestions(e, data)
	 *
	 * @param e {Object} jQuery event.
	 * @param data {Object} Data structure passed with the `getSuggestions` event
	 * which contains the user query, eg `{ query : "..." }`.
	 *
	 * @author agorbatchev
	 * @date 2011/08/15
	 * @id TextExtAjax.onGetSuggestions
	 */
	p.onGetSuggestions = function(e, data)
	{
		var self        = this,
			suggestions = self._suggestions,
			query       = (data || {}).query || ''
			;

		if(suggestions && self.opts(OPT_CACHE_RESULTS) === true)
			return self.onComplete(suggestions, query);
		
		self.startTimer(
			'ajax',
			self.opts(OPT_TYPE_DELAY),
			function()
			{
				self.showLoading();
				self.load(query);
			}
		);
	};
})(jQuery);

define("jam/jquery-textext/src/js/textext.plugin.ajax.js", function(){});

/**
 * jQuery TextExt Plugin
 * http://textextjs.com
 *
 * @version 1.3.1
 * @copyright Copyright (C) 2011 Alex Gorbatchev. All rights reserved.
 * @license MIT License
 */
(function($)
{
	/**
	 * Displays a dropdown style arrow button. The `TextExtArrow` works together with the
	 * `TextExtAutocomplete` plugin and whenever clicked tells the autocomplete plugin to
	 * display its suggestions.
	 *
	 * @author agorbatchev
	 * @date 2011/12/27
	 * @id TextExtArrow
	 */
	function TextExtArrow() {};

	$.fn.textext.TextExtArrow = TextExtArrow;
	$.fn.textext.addPlugin('arrow', TextExtArrow);

	var p = TextExtArrow.prototype,
		/**
		 * Arrow plugin only has one option and that is its HTML template. It could be 
		 * changed when passed to the `$().textext()` function. For example:
		 *
		 *     $('textarea').textext({
		 *         plugins: 'arrow',
		 *         html: {
		 *             arrow: "<span/>"
		 *         }
		 *     })
		 *
		 * @author agorbatchev
		 * @date 2011/12/27
		 * @id TextExtArrow.options
		 */
		
		/**
		 * HTML source that is used to generate markup required for the arrow.
		 *
		 * @name html.arrow
		 * @default '<div class="text-arrow"/>'
		 * @author agorbatchev
		 * @date 2011/12/27
		 * @id TextExtArrow.options.html.arrow
		 */
		OPT_HTML_ARROW = 'html.arrow',

		DEFAULT_OPTS = {
			html : {
				arrow : '<div class="text-arrow"/>'
			}
		}
		;

	/**
	 * Initialization method called by the core during plugin instantiation.
	 *
	 * @signature TextExtArrow.init(core)
	 *
	 * @param core {TextExt} Instance of the TextExt core class.
	 *
	 * @author agorbatchev
	 * @date 2011/12/27
	 * @id TextExtArrow.init
	 */
	p.init = function(core)
	{
		var self = this,
			arrow
			;

		self.baseInit(core, DEFAULT_OPTS);

		self._arrow = arrow = $(self.opts(OPT_HTML_ARROW));
		self.core().wrapElement().append(arrow);
		arrow.bind('click', function(e) { self.onArrowClick(e); });
	};

	//--------------------------------------------------------------------------------
	// Event handlers
	
	/**
	 * Reacts to the `click` event whenever user clicks the arrow.
	 *
	 * @signature TextExtArrow.onArrowClick(e)
	 *
	 * @param e {Object} jQuery event.
	 * @author agorbatchev
	 * @date 2011/12/27
	 * @id TextExtArrow.onArrowClick
	 */
	p.onArrowClick = function(e)
	{
		this.trigger('toggleDropdown');
		this.core().focusInput();
	};
	
	//--------------------------------------------------------------------------------
	// Core functionality

})(jQuery);

define("jam/jquery-textext/src/js/textext.plugin.arrow.js", function(){});

/**
 * jQuery TextExt Plugin
 * http://textextjs.com
 *
 * @version 1.3.1
 * @copyright Copyright (C) 2011 Alex Gorbatchev. All rights reserved.
 * @license MIT License
 */
(function($)
{
	/**
	 * Autocomplete plugin brings the classic autocomplete functionality to the TextExt ecosystem.
	 * The gist of functionality is when user starts typing in, for example a term or a tag, a
	 * dropdown would be presented with possible suggestions to complete the input quicker.
	 *
	 * @author agorbatchev
	 * @date 2011/08/17
	 * @id TextExtAutocomplete
	 */
	function TextExtAutocomplete() {};

	$.fn.textext.TextExtAutocomplete = TextExtAutocomplete;
	$.fn.textext.addPlugin('autocomplete', TextExtAutocomplete);

	var p = TextExtAutocomplete.prototype,
		
		CSS_DOT            = '.',
		CSS_SELECTED       = 'text-selected',
		CSS_DOT_SELECTED   = CSS_DOT + CSS_SELECTED,
		CSS_SUGGESTION     = 'text-suggestion',
		CSS_DOT_SUGGESTION = CSS_DOT + CSS_SUGGESTION,
		CSS_LABEL          = 'text-label',
		CSS_DOT_LABEL      = CSS_DOT + CSS_LABEL,

		/**
		 * Autocomplete plugin options are grouped under `autocomplete` when passed to the 
		 * `$().textext()` function. For example:
		 *
		 *     $('textarea').textext({
		 *         plugins: 'autocomplete',
		 *         autocomplete: {
		 *             dropdownPosition: 'above'
		 *         }
		 *     })
		 *
		 * @author agorbatchev
		 * @date 2011/08/17
		 * @id TextExtAutocomplete.options
		 */

		/**
		 * This is a toggle switch to enable or disable the Autucomplete plugin. The value is checked
		 * each time at the top level which allows you to toggle this setting on the fly.
		 *
		 * @name autocomplete.enabled
		 * @default true
		 * @author agorbatchev
		 * @date 2011/08/17
		 * @id TextExtAutocomplete.options.autocomplete.enabled
		 */
		OPT_ENABLED = 'autocomplete.enabled',

		/**
		 * This option allows to specify position of the dropdown. The two possible values
		 * are `above` and `below`.
		 *
		 * @name autocomplete.dropdown.position
		 * @default "below"
		 * @author agorbatchev
		 * @date 2011/08/17
		 * @id TextExtAutocomplete.options.autocomplete.dropdown.position
		 */
		OPT_POSITION = 'autocomplete.dropdown.position',

		/**
		 * This option allows to specify maximum height of the dropdown. Value is taken directly, so
		 * if desired height is 200 pixels, value must be `200px`.
		 *
		 * @name autocomplete.dropdown.maxHeight
		 * @default "100px"
		 * @author agorbatchev
		 * @date 2011/12/29
		 * @id TextExtAutocomplete.options.autocomplete.dropdown.maxHeight
		 * @version 1.1
		 */
		OPT_MAX_HEIGHT = 'autocomplete.dropdown.maxHeight',

		/**
		 * This option allows to override how a suggestion item is rendered. The value should be
		 * a function, the first argument of which is suggestion to be rendered and `this` context
		 * is the current instance of `TextExtAutocomplete`. 
		 *
		 * [Click here](/manual/examples/autocomplete-with-custom-render.html) to see a demo.
		 *
		 * For example:
		 *
		 *     $('textarea').textext({
		 *         plugins: 'autocomplete',
		 *         autocomplete: {
		 *             render: function(suggestion)
		 *             {
		 *                 return '<b>' + suggestion + '</b>';
		 *             }
		 *         }
		 *     })
		 *
		 * @name autocomplete.render
		 * @default null
		 * @author agorbatchev
		 * @date 2011/12/23
		 * @id TextExtAutocomplete.options.autocomplete.render
		 * @version 1.1
		 */
		OPT_RENDER = 'autocomplete.render',

		/**
		 * HTML source that is used to generate the dropdown.
		 *
		 * @name html.dropdown
		 * @default '<div class="text-dropdown"><div class="text-list"/></div>'
		 * @author agorbatchev
		 * @date 2011/08/17
		 * @id TextExtAutocomplete.options.html.dropdown
		 */
		OPT_HTML_DROPDOWN = 'html.dropdown',

		/**
		 * HTML source that is used to generate each suggestion.
		 *
		 * @name html.suggestion
		 * @default '<div class="text-suggestion"><span class="text-label"/></div>'
		 * @author agorbatchev
		 * @date 2011/08/17
		 * @id TextExtAutocomplete.options.html.suggestion
		 */
		OPT_HTML_SUGGESTION = 'html.suggestion',

		/**
		 * Autocomplete plugin triggers or reacts to the following events.
		 *
		 * @author agorbatchev
		 * @date 2011/08/17
		 * @id TextExtAutocomplete.events
		 */
	
		/**
		 * Autocomplete plugin triggers and reacts to the `hideDropdown` to hide the dropdown if it's 
		 * already visible.
		 *
		 * @name hideDropdown
		 * @author agorbatchev
		 * @date 2011/08/17
		 * @id TextExtAutocomplete.events.hideDropdown
		 */
		EVENT_HIDE_DROPDOWN = 'hideDropdown',

		/**
		 * Autocomplete plugin triggers and reacts to the `showDropdown` to show the dropdown if it's 
		 * not already visible.
		 *
		 * It's possible to pass a render callback function which will be called instead of the
		 * default `TextExtAutocomplete.renderSuggestions()`. 
		 *
		 * Here's how another plugin should trigger this event with the optional render callback:
		 *
		 *     this.trigger('showDropdown', function(autocomplete)
		 *     {
		 *         autocomplete.clearItems();
		 *         var node = autocomplete.addDropdownItem('<b>Item</b>');
		 *         node.addClass('new-look');
		 *     });
		 *
		 * @name showDropdown
		 * @author agorbatchev
		 * @date 2011/08/17
		 * @id TextExtAutocomplete.events.showDropdown
		 */
		EVENT_SHOW_DROPDOWN = 'showDropdown',

		/**
		 * Autocomplete plugin reacts to the `setSuggestions` event triggered by other plugins which
		 * wish to populate the suggestion items. Suggestions should be passed as event argument in the 
		 * following format: `{ data : [ ... ] }`. 
		 *
		 * Here's how another plugin should trigger this event:
		 *
		 *     this.trigger('setSuggestions', { data : [ "item1", "item2" ] });
		 *
		 * @name setSuggestions
		 * @author agorbatchev
		 * @date 2011/08/17
		 * @id TextExtAutocomplete.events.setSuggestions
		 */

		/**
		 * Autocomplete plugin triggers the `getSuggestions` event and expects to get results by listening for
		 * the `setSuggestions` event.
		 *
		 * @name getSuggestions
		 * @author agorbatchev
		 * @date 2011/08/17
		 * @id TextExtAutocomplete.events.getSuggestions
		 */
		EVENT_GET_SUGGESTIONS = 'getSuggestions',

		/**
		 * Autocomplete plugin triggers `getFormData` event with the current suggestion so that the the core
		 * will be updated with serialized data to be submitted with the HTML form.
		 * 
		 * @name getFormData
		 * @author agorbatchev
		 * @date 2011/08/18
		 * @id TextExtAutocomplete.events.getFormData
		 */
		EVENT_GET_FORM_DATA = 'getFormData',

		/**
		 * Autocomplete plugin reacts to `toggleDropdown` event and either shows or hides the dropdown
		 * depending if it's currently hidden or visible.
		 * 
		 * @name toggleDropdown
		 * @author agorbatchev
		 * @date 2011/12/27
		 * @id TextExtAutocomplete.events.toggleDropdown
		 * @version 1.1
		 */
		EVENT_TOGGLE_DROPDOWN = 'toggleDropdown',

		POSITION_ABOVE = 'above',
		POSITION_BELOW = 'below',
		
		DATA_MOUSEDOWN_ON_AUTOCOMPLETE = 'mousedownOnAutocomplete',

		DEFAULT_OPTS = {
			autocomplete : {
				enabled : true,
				dropdown : {
					position : POSITION_BELOW,
					maxHeight : '100px'
				}
			},

			html : {
				dropdown   : '<div class="text-dropdown"><div class="text-list"/></div>',
				suggestion : '<div class="text-suggestion"><span class="text-label"/></div>'
			}
		}
		;

	/**
	 * Initialization method called by the core during plugin instantiation.
	 *
	 * @signature TextExtAutocomplete.init(core)
	 *
	 * @param core {TextExt} Instance of the TextExt core class.
	 *
	 * @author agorbatchev
	 * @date 2011/08/17
	 * @id TextExtAutocomplete.init
	 */
	p.init = function(core)
	{
		var self = this;

		self.baseInit(core, DEFAULT_OPTS);

		var input = self.input(),
			container
			;

		if(self.opts(OPT_ENABLED) === true)
		{
			self.on({
				blur              : self.onBlur,
				anyKeyUp          : self.onAnyKeyUp,
				deleteKeyUp       : self.onAnyKeyUp,
				backspaceKeyPress : self.onBackspaceKeyPress,
				enterKeyPress     : self.onEnterKeyPress,
				escapeKeyPress    : self.onEscapeKeyPress,
				setSuggestions    : self.onSetSuggestions,
				showDropdown      : self.onShowDropdown,
				hideDropdown      : self.onHideDropdown,
				toggleDropdown    : self.onToggleDropdown,
				postInvalidate    : self.positionDropdown,
				getFormData       : self.onGetFormData,

				// using keyDown for up/down keys so that repeat events are
				// captured and user can scroll up/down by holding the keys
				downKeyDown : self.onDownKeyDown,
				upKeyDown   : self.onUpKeyDown
			});

			container = $(self.opts(OPT_HTML_DROPDOWN));
			container.insertAfter(input);

			self.on(container, {
				mouseover : self.onMouseOver,
				mousedown : self.onMouseDown,
				click     : self.onClick
			});

			container
				.css('maxHeight', self.opts(OPT_MAX_HEIGHT))
				.addClass('text-position-' + self.opts(OPT_POSITION))
				;

			$(self).data('container', container);
			
			$(document.body).click(function(e) 
			{
				if (self.isDropdownVisible() && !self.withinWrapElement(e.target))
					self.trigger(EVENT_HIDE_DROPDOWN);
			});

			self.positionDropdown();
		}
	};

	/**
	 * Returns top level dropdown container HTML element.
	 * 
	 * @signature TextExtAutocomplete.containerElement()
	 * 
	 * @author agorbatchev
	 * @date 2011/08/15
	 * @id TextExtAutocomplete.containerElement
	 */
	p.containerElement = function()
	{
		return $(this).data('container');
	};

	//--------------------------------------------------------------------------------
	// User mouse/keyboard input
	
	/**
	 * Reacts to the `mouseOver` event triggered by the TextExt core.
	 *
	 * @signature TextExtAutocomplete.onMouseOver(e)
	 *
	 * @param e {Object} jQuery event.
	 *
	 * @author agorbatchev
	 * @date 2011/08/17
	 * @id TextExtAutocomplete.onMouseOver
	 */
	p.onMouseOver = function(e)
	{
		var self   = this,
			target = $(e.target)
			;

		if(target.is(CSS_DOT_SUGGESTION))
		{
			self.clearSelected();
			target.addClass(CSS_SELECTED);
		}
	};
	
	/**
	 * Reacts to the `mouseDown` event triggered by the TextExt core.
	 *
	 * @signature TextExtAutocomplete.onMouseDown(e)
	 *
	 * @param e {Object} jQuery event.
	 *
	 * @author adamayres
	 * @date 2012/01/13
	 * @id TextExtAutocomplete.onMouseDown
	 */
	p.onMouseDown = function(e)
	{
		this.containerElement().data(DATA_MOUSEDOWN_ON_AUTOCOMPLETE, true);
	};
	
	/**
	 * Reacts to the `click` event triggered by the TextExt core.
	 *
	 * @signature TextExtAutocomplete.onClick(e)
	 *
	 * @param e {Object} jQuery event.
	 *
	 * @author agorbatchev
	 * @date 2011/08/17
	 * @id TextExtAutocomplete.onClick
	 */
	p.onClick = function(e)
	{
		var self   = this,
			target = $(e.target)
			;

		if(target.is(CSS_DOT_SUGGESTION) || target.is(CSS_DOT_LABEL))
			self.trigger('enterKeyPress');
		
		if (self.core().hasPlugin('tags'))
			self.val('');
	};

	/**
	 * Reacts to the `blur` event triggered by the TextExt core.
	 *
	 * @signature TextExtAutocomplete.onBlur(e)
	 *
	 * @param e {Object} jQuery event.
	 *
	 * @author agorbatchev
	 * @date 2011/08/17
	 * @id TextExtAutocomplete.onBlur
	 */
	p.onBlur = function(e)
	{
		var self              = this,
			container         = self.containerElement(),
			isBlurByMousedown = container.data(DATA_MOUSEDOWN_ON_AUTOCOMPLETE) === true
			;

		// only trigger a close event if the blur event was 
		// not triggered by a mousedown event on the autocomplete
		// otherwise set focus back back on the input
		if(self.isDropdownVisible())
			isBlurByMousedown ? self.core().focusInput() : self.trigger(EVENT_HIDE_DROPDOWN);
				
		container.removeData(DATA_MOUSEDOWN_ON_AUTOCOMPLETE);
	};

	/**
	 * Reacts to the `backspaceKeyPress` event triggered by the TextExt core. 
	 *
	 * @signature TextExtAutocomplete.onBackspaceKeyPress(e)
	 *
	 * @param e {Object} jQuery event.
	 *
	 * @author agorbatchev
	 * @date 2011/08/17
	 * @id TextExtAutocomplete.onBackspaceKeyPress
	 */
	p.onBackspaceKeyPress = function(e)
	{
		var self    = this,
			isEmpty = self.val().length > 0
			;

		if(isEmpty || self.isDropdownVisible())
			self.getSuggestions();
	};

	/**
	 * Reacts to the `anyKeyUp` event triggered by the TextExt core.
	 *
	 * @signature TextExtAutocomplete.onAnyKeyUp(e)
	 *
	 * @param e {Object} jQuery event.
	 *
	 * @author agorbatchev
	 * @date 2011/08/17
	 * @id TextExtAutocomplete.onAnyKeyUp
	 */
	p.onAnyKeyUp = function(e, keyCode)
	{
		var self          = this,
			isFunctionKey = self.opts('keys.' + keyCode) != null
			;

		if(self.val().length > 0 && !isFunctionKey)
			self.getSuggestions();
	};

	/**
	 * Reacts to the `downKeyDown` event triggered by the TextExt core.
	 *
	 * @signature TextExtAutocomplete.onDownKeyDown(e)
	 *
	 * @param e {Object} jQuery event.
	 *
	 * @author agorbatchev
	 * @date 2011/08/17
	 * @id TextExtAutocomplete.onDownKeyDown
	 */
	p.onDownKeyDown = function(e)
	{
		var self = this;

		self.isDropdownVisible()
			? self.toggleNextSuggestion() 
			: self.getSuggestions()
			;
	};

	/**
	 * Reacts to the `upKeyDown` event triggered by the TextExt core.
	 *
	 * @signature TextExtAutocomplete.onUpKeyDown(e)
	 *
	 * @param e {Object} jQuery event.
	 *
	 * @author agorbatchev
	 * @date 2011/08/17
	 * @id TextExtAutocomplete.onUpKeyDown
	 */
	p.onUpKeyDown = function(e)
	{
		this.togglePreviousSuggestion();
	};

	/**
	 * Reacts to the `enterKeyPress` event triggered by the TextExt core.
	 *
	 * @signature TextExtAutocomplete.onEnterKeyPress(e)
	 *
	 * @param e {Object} jQuery event.
	 *
	 * @author agorbatchev
	 * @date 2011/08/17
	 * @id TextExtAutocomplete.onEnterKeyPress
	 */
	p.onEnterKeyPress = function(e)
	{
		var self = this;

		if(self.isDropdownVisible())
			self.selectFromDropdown();
	};

	/**
	 * Reacts to the `escapeKeyPress` event triggered by the TextExt core. Hides the dropdown
	 * if it's currently visible.
	 *
	 * @signature TextExtAutocomplete.onEscapeKeyPress(e)
	 *
	 * @param e {Object} jQuery event.
	 *
	 * @author agorbatchev
	 * @date 2011/08/17
	 * @id TextExtAutocomplete.onEscapeKeyPress
	 */
	p.onEscapeKeyPress = function(e)
	{
		var self = this;

		if(self.isDropdownVisible())
			self.trigger(EVENT_HIDE_DROPDOWN);
	};

	//--------------------------------------------------------------------------------
	// Core functionality

	/**
	 * Positions dropdown either below or above the input based on the `autocomplete.dropdown.position`
	 * option specified, which could be either `above` or `below`.
	 *
	 * @signature TextExtAutocomplete.positionDropdown()
	 *
	 * @author agorbatchev
	 * @date 2011/08/15
	 * @id TextExtAutocomplete.positionDropdown
	 */
	p.positionDropdown = function()
	{
		var self      = this,
			container = self.containerElement(),
			direction = self.opts(OPT_POSITION),
			height    = self.core().wrapElement().outerHeight(),
			css       = {}
			;

		css[direction === POSITION_ABOVE ? 'bottom' : 'top'] = height + 'px';
		container.css(css);
	};

	/**
	 * Returns list of all the suggestion HTML elements in the dropdown.
	 *
	 * @signature TextExtAutocomplete.suggestionElements()
	 *
	 * @author agorbatchev
	 * @date 2011/08/17
	 * @id TextExtAutocomplete.suggestionElements
	 */
	p.suggestionElements = function()
	{
		return this.containerElement().find(CSS_DOT_SUGGESTION);
	};


	/**
	 * Highlights specified suggestion as selected in the dropdown.
	 *
	 * @signature TextExtAutocomplete.setSelectedSuggestion(suggestion)
	 *
	 * @param suggestion {Object} Suggestion object. With the default `ItemManager` this
	 * is expected to be a string, anything else with custom implementations.
	 *
	 * @author agorbatchev
	 * @date 2011/08/17
	 * @id TextExtAutocomplete.setSelectedSuggestion
	 */
	p.setSelectedSuggestion = function(suggestion)
	{
		if(!suggestion)
			return;

		var self   = this,
			all    = self.suggestionElements(),
			target = all.first(),
			item, i
			;

		self.clearSelected();

		for(i = 0; i < all.length; i++)
		{
			item = $(all[i]);

			if(self.itemManager().compareItems(item.data(CSS_SUGGESTION), suggestion))
			{
				target = item.addClass(CSS_SELECTED);
				break;
			}
		}

		target.addClass(CSS_SELECTED);
		self.scrollSuggestionIntoView(target);
	};

	/**
	 * Returns the first suggestion HTML element from the dropdown that is highlighted as selected.
	 *
	 * @signature TextExtAutocomplete.selectedSuggestionElement()
	 *
	 * @author agorbatchev
	 * @date 2011/08/17
	 * @id TextExtAutocomplete.selectedSuggestionElement
	 */
	p.selectedSuggestionElement = function()
	{
		return this.suggestionElements().filter(CSS_DOT_SELECTED).first();
	};

	/**
	 * Returns `true` if dropdown is currently visible, `false` otherwise.
	 *
	 * @signature TextExtAutocomplete.isDropdownVisible()
	 *
	 * @author agorbatchev
	 * @date 2011/08/17
	 * @id TextExtAutocomplete.isDropdownVisible
	 */
	p.isDropdownVisible = function()
	{
		return this.containerElement().is(':visible') === true;
	};

	/**
	 * Reacts to the `getFormData` event triggered by the core. Returns data with the
	 * weight of 100 to be *less than the Tags plugin* data weight. The weights system is
	 * covered in greater detail in the [`getFormData`][1] event documentation.
	 *
	 * [1]: /manual/textext.html#getformdata
	 *
	 * @signature TextExtAutocomplete.onGetFormData(e, data, keyCode)
	 *
	 * @param e {Object} jQuery event.
	 * @param data {Object} Data object to be populated.
	 * @param keyCode {Number} Key code that triggered the original update request.
	 *
	 * @author agorbatchev
	 * @date 2011/08/22
	 * @id TextExtAutocomplete.onGetFormData
	 */
	p.onGetFormData = function(e, data, keyCode)
	{
		var self       = this,
			val        = self.val(),
			inputValue = val,
			formValue  = val
			;
		data[100] = self.formDataObject(inputValue, formValue);
	};

	/**
	 * Returns initialization priority of the Autocomplete plugin which is expected to be
	 * *greater than the Tags plugin* because of the dependencies. The value is 200.
	 *
	 * @signature TextExtAutocomplete.initPriority()
	 *
	 * @author agorbatchev
	 * @date 2011/08/22
	 * @id TextExtAutocomplete.initPriority
	 */
	p.initPriority = function()
	{
		return 200;
	};

	/**
	 * Reacts to the `hideDropdown` event and hides the dropdown if it's already visible.
	 *
	 * @signature TextExtAutocomplete.onHideDropdown(e)
	 *
	 * @param e {Object} jQuery event.
	 *
	 * @author agorbatchev
	 * @date 2011/08/17
	 * @id TextExtAutocomplete.onHideDropdown
	 */
	p.onHideDropdown = function(e)
	{
		this.hideDropdown();
	};

	/**
	 * Reacts to the 'toggleDropdown` event and shows or hides the dropdown depending if
	 * it's currently hidden or visible.
	 *
	 * @signature TextExtAutocomplete.onToggleDropdown(e)
	 *
	 * @param e {Object} jQuery event.
	 *
	 * @author agorbatchev
	 * @date 2011/12/27
	 * @id TextExtAutocomplete.onToggleDropdown
	 * @version 1.1.0
	 */
	p.onToggleDropdown = function(e)
	{
		var self = this;
		self.trigger(self.containerElement().is(':visible') ? EVENT_HIDE_DROPDOWN : EVENT_SHOW_DROPDOWN);
	};

	/**
	 * Reacts to the `showDropdown` event and shows the dropdown if it's not already visible.
	 * It's possible to pass a render callback function which will be called instead of the
	 * default `TextExtAutocomplete.renderSuggestions()`.
	 *
	 * If no suggestion were previously loaded, it will fire `getSuggestions` event and exit.
	 *
	 * Here's how another plugin should trigger this event with the optional render callback:
	 *
	 *     this.trigger('showDropdown', function(autocomplete)
	 *     {
	 *         autocomplete.clearItems();
	 *         var node = autocomplete.addDropdownItem('<b>Item</b>');
	 *         node.addClass('new-look');
	 *     });
	 *
	 * @signature TextExtAutocomplete.onShowDropdown(e, renderCallback)
	 *
	 * @param e {Object} jQuery event.
	 * @param renderCallback {Function} Optional callback function which would be used to 
	 * render dropdown items. As a first argument, reference to the current instance of 
	 * Autocomplete plugin will be supplied. It's assumed, that if this callback is provided
	 * rendering will be handled completely manually.
	 *
	 * @author agorbatchev
	 * @date 2011/08/17
	 * @id TextExtAutocomplete.onShowDropdown
	 */
	p.onShowDropdown = function(e, renderCallback)
	{
		var self        = this,
			current     = self.selectedSuggestionElement().data(CSS_SUGGESTION),
			suggestions = self._suggestions
			;

		if(!suggestions)
			return self.trigger(EVENT_GET_SUGGESTIONS);

		if($.isFunction(renderCallback))
		{
			renderCallback(self);
		}
		else
		{
			self.renderSuggestions(self._suggestions);
			self.toggleNextSuggestion();
		}
		
		self.showDropdown(self.containerElement());
		self.setSelectedSuggestion(current);
	};

	/**
	 * Reacts to the `setSuggestions` event. Expects to recieve the payload as the second argument
	 * in the following structure:
	 *
	 *     {
	 *         result : [ "item1", "item2" ],
	 *         showHideDropdown : false
	 *     }
	 *
	 * Notice the optional `showHideDropdown` option. By default, ie without the `showHideDropdown` 
	 * value the method will trigger either `showDropdown` or `hideDropdown` depending if there are
	 * suggestions. If set to `false`, no event is triggered.
	 *
	 * @signature TextExtAutocomplete.onSetSuggestions(e, data)
	 *
	 * @param data {Object} Data payload.
	 *
	 * @author agorbatchev
	 * @date 2011/08/17
	 * @id TextExtAutocomplete.onSetSuggestions
	 */
	p.onSetSuggestions = function(e, data)
	{
		var self        = this,
			suggestions = self._suggestions = data.result
			;

		if(data.showHideDropdown !== false)
			self.trigger(suggestions === null || suggestions.length === 0 ? EVENT_HIDE_DROPDOWN : EVENT_SHOW_DROPDOWN);
	};

	/**
	 * Prepears for and triggers the `getSuggestions` event with the `{ query : {String} }` as second
	 * argument.
	 *
	 * @signature TextExtAutocomplete.getSuggestions()
	 *
	 * @author agorbatchev
	 * @date 2011/08/17
	 * @id TextExtAutocomplete.getSuggestions
	 */
	p.getSuggestions = function()
	{
		var self = this,
			val  = self.val()
			;

		if(self._previousInputValue == val)
			return;

		// if user clears input, then we want to select first suggestion
		// instead of the last one
		if(val == '')
			current = null;

		self._previousInputValue = val;
		self.trigger(EVENT_GET_SUGGESTIONS, { query : val });
	};

	/**
	 * Removes all HTML suggestion items from the dropdown.
	 *
	 * @signature TextExtAutocomplete.clearItems()
	 *
	 * @author agorbatchev
	 * @date 2011/08/17
	 * @id TextExtAutocomplete.clearItems
	 */
	p.clearItems = function()
	{
		this.containerElement().find('.text-list').children().remove();
	};

	/**
	 * Clears all and renders passed suggestions.
	 *
	 * @signature TextExtAutocomplete.renderSuggestions(suggestions)
	 *
	 * @param suggestions {Array} List of suggestions to render.
	 *
	 * @author agorbatchev
	 * @date 2011/08/17
	 * @id TextExtAutocomplete.renderSuggestions
	 */
	p.renderSuggestions = function(suggestions)
	{
		var self = this;

		self.clearItems();

		$.each(suggestions || [], function(index, item)
		{
			self.addSuggestion(item);
		});
	};

	/**
	 * Shows the dropdown.
	 *
	 * @signature TextExtAutocomplete.showDropdown()
	 *
	 * @author agorbatchev
	 * @date 2011/08/17
	 * @id TextExtAutocomplete.showDropdown
	 */
	p.showDropdown = function()
	{
		this.containerElement().show();
	};

	/**
	 * Hides the dropdown.
	 *
	 * @signature TextExtAutocomplete.hideDropdown()
	 *
	 * @author agorbatchev
	 * @date 2011/08/17
	 * @id TextExtAutocomplete.hideDropdown
	 */
	p.hideDropdown = function()
	{
		var self     = this,
			dropdown = self.containerElement()
			;

		self._previousInputValue = null;
		dropdown.hide();
	};

	/**
	 * Adds single suggestion to the bottom of the dropdown. Uses `ItemManager.itemToString()` to
	 * serialize provided suggestion to string.
	 *
	 * @signature TextExtAutocomplete.addSuggestion(suggestion)
	 *
	 * @param suggestion {Object} Suggestion item. By default expected to be a string.
	 *
	 * @author agorbatchev
	 * @date 2011/08/17
	 * @id TextExtAutocomplete.addSuggestion
	 */
	p.addSuggestion = function(suggestion)
	{
		var self     = this,
			renderer = self.opts(OPT_RENDER),
			node     = self.addDropdownItem(renderer ? renderer.call(self, suggestion) : self.itemManager().itemToString(suggestion))
			;

		node.data(CSS_SUGGESTION, suggestion);
	};

	/**
	 * Adds and returns HTML node to the bottom of the dropdown.
	 *
	 * @signature TextExtAutocomplete.addDropdownItem(html)
	 *
	 * @param html {String} HTML to be inserted into the item.
	 *
	 * @author agorbatchev
	 * @date 2011/08/17
	 * @id TextExtAutocomplete.addDropdownItem
	 */
	p.addDropdownItem = function(html)
	{
		var self      = this,
			container = self.containerElement().find('.text-list'),
			node      = $(self.opts(OPT_HTML_SUGGESTION))
			;

		node.find('.text-label').html(html);
		container.append(node);
		return node;
	};

	/**
	 * Removes selection highlight from all suggestion elements.
	 *
	 * @signature TextExtAutocomplete.clearSelected()
	 *
	 * @author agorbatchev
	 * @date 2011/08/02
	 * @id TextExtAutocomplete.clearSelected
	 */
	p.clearSelected = function()
	{
		this.suggestionElements().removeClass(CSS_SELECTED);
	};

	/**
	 * Selects next suggestion relative to the current one. If there's no
	 * currently selected suggestion, it will select the first one. Selected
	 * suggestion will always be scrolled into view.
	 *
	 * @signature TextExtAutocomplete.toggleNextSuggestion()
	 *
	 * @author agorbatchev
	 * @date 2011/08/02
	 * @id TextExtAutocomplete.toggleNextSuggestion
	 */
	p.toggleNextSuggestion = function()
	{
		var self     = this,
			selected = self.selectedSuggestionElement(),
			next
			;

		if(selected.length > 0)
		{
			next = selected.next();

			if(next.length > 0)
				selected.removeClass(CSS_SELECTED);
		}
		else
		{
			next = self.suggestionElements().first();
		}

		next.addClass(CSS_SELECTED);
		self.scrollSuggestionIntoView(next);
	};

	/**
	 * Selects previous suggestion relative to the current one. Selected
	 * suggestion will always be scrolled into view.
	 *
	 * @signature TextExtAutocomplete.togglePreviousSuggestion()
	 *
	 * @author agorbatchev
	 * @date 2011/08/02
	 * @id TextExtAutocomplete.togglePreviousSuggestion
	 */
	p.togglePreviousSuggestion = function()
	{
		var self     = this,
			selected = self.selectedSuggestionElement(),
			prev     = selected.prev()
			;

		if(prev.length == 0)
			return;

		self.clearSelected();
		prev.addClass(CSS_SELECTED);
		self.scrollSuggestionIntoView(prev);
	};

	/**
	 * Scrolls specified HTML suggestion element into the view.
	 *
	 * @signature TextExtAutocomplete.scrollSuggestionIntoView(item)
	 *
	 * @param item {HTMLElement} jQuery HTML suggestion element which needs to
	 * scrolled into view.
	 *
	 * @author agorbatchev
	 * @date 2011/08/17
	 * @id TextExtAutocomplete.scrollSuggestionIntoView
	 */
	p.scrollSuggestionIntoView = function(item)
	{
		var itemHeight     = item.outerHeight(),
			dropdown       = this.containerElement(),
			dropdownHeight = dropdown.innerHeight(),
			scrollPos      = dropdown.scrollTop(),
			itemTop        = (item.position() || {}).top,
			scrollTo       = null,
			paddingTop     = parseInt(dropdown.css('paddingTop'))
			;

		if(itemTop == null)
			return;

		// if scrolling down and item is below the bottom fold
		if(itemTop + itemHeight > dropdownHeight)
			scrollTo = itemTop + scrollPos + itemHeight - dropdownHeight + paddingTop;

		// if scrolling up and item is above the top fold
		if(itemTop < 0)
			scrollTo = itemTop + scrollPos - paddingTop;

		if(scrollTo != null)
			dropdown.scrollTop(scrollTo);
	};

	/**
	 * Uses the value from the text input to finish autocomplete action. Currently selected
	 * suggestion from the dropdown will be used to complete the action. Triggers `hideDropdown`
	 * event.
	 *
	 * @signature TextExtAutocomplete.selectFromDropdown()
	 *
	 * @author agorbatchev
	 * @date 2011/08/17
	 * @id TextExtAutocomplete.selectFromDropdown
	 */
	p.selectFromDropdown = function()
	{
		var self       = this,
			suggestion = self.selectedSuggestionElement().data(CSS_SUGGESTION)
			;

		if(suggestion)
		{
			self.val(self.itemManager().itemToString(suggestion));
			self.core().getFormData();	
		}

		self.trigger(EVENT_HIDE_DROPDOWN);
	};
	
	/**
	 * Determines if the specified HTML element is within the TextExt core wrap HTML element.
	 *
	 * @signature TextExtAutocomplete.withinWrapElement(element)
	 *
	 * @param element {HTMLElement} element to check if contained by wrap element
	 *
	 * @author adamayres
	 * @version 1.3.0
	 * @date 2012/01/15
	 * @id TextExtAutocomplete.withinWrapElement
	 */
	p.withinWrapElement = function(element) 
	{
		return this.core().wrapElement().find(element).size() > 0;
	}
})(jQuery);

define("jam/jquery-textext/src/js/textext.plugin.autocomplete.js", function(){});

/**
 * jQuery TextExt Plugin
 * http://alexgorbatchev.com/textext
 *
 * @version 1.3.1
 * @copyright Copyright (C) 2011 Alex Gorbatchev. All rights reserved.
 * @license MIT License
 */
(function($)
{
	/**
	 * Displays a clear search button.
	 *
	 * @author mreinstein
	 * @date 2012/02/19
	 * @id TextExtClear
	 */
	function TextExtClear() {};

	$.fn.textext.TextExtClear = TextExtClear;
	$.fn.textext.addPlugin('clear', TextExtClear);

	var p = TextExtClear.prototype,
		/**
		 * Clear plugin only has one option and that is its HTML template. It could be 
		 * changed when passed to the `$().textext()` function. For example:
		 *
		 *     $('textarea').textext({
		 *         plugins: 'clear',
		 *         html: {
		 *             clear: "<span/>"
		 *         }
		 *     })
		 *
		 * @author mreinstein
		 * @date 2012/02/19
		 * @id TextExtClear.options
		 */

		/**
		 * HTML source that is used to generate markup required for the clear.
		 *
		 * @name html.clear
		 * @default '<div class="text-clear"/>'
		 * @author mreinstein
		 * @date 2012/02/19
		 * @id TextExtClear.options.html.clear
		 */
		OPT_HTML_CLEAR = 'html.clear',

		DEFAULT_OPTS = {
			html : {
				clear : '<div class="text-clear"/>'
			}
		};

	/**
	 * Initialization method called by the core during plugin instantiation.
	 *
	 * @signature TextExtClear.init(core)
	 *
	 * @param core {TextExt} Instance of the TextExt core class.
	 *
	 * @author agorbatchev
	 * @date 2011/12/27
	 * @id TextExtClear.init
	 */
	p.init = function(core)
	{
		var self = this,
			clear
			;

		self.baseInit(core, DEFAULT_OPTS);

		self._clear = clear = $(self.opts(OPT_HTML_CLEAR));
		self.core().wrapElement().append(clear);
		clear.bind('click', function(e) { self.onClearClick(e); });
	};

	//--------------------------------------------------------------------------------
	// Event handlers

	/**
	 * Reacts to the `click` event whenever user clicks the clear.
	 *
	 * @signature TextExtClear.onClearClick(e)
	 *
	 * @param e {Object} jQuery event.
	 * @author agorbatchev
	 * @date 2011/12/27
	 * @id TextExtClear.onClearClick
	 */
	p.onClearClick = function(e)
	{
		var self = this;

		// check if the tags plugin is present
		if(typeof self.core()._plugins.tags != 'undefined')
		{
			// it is! remove all tags 
			var elems = self.core()._plugins.tags.tagElements();
			for(var i =0; i < elems.length;i++)
			{
				self.core()._plugins.tags.removeTag($(elems[i]));
			}
		}
		// clear the text from the search area
		self.val('');
		self.core().getFormData();
	};

	//--------------------------------------------------------------------------------
	// Core functionality

})(jQuery);
define("jam/jquery-textext/src/js/textext.plugin.clear.js", function(){});

/**
 * jQuery TextExt Plugin
 * http://textextjs.com
 *
 * @version 1.3.1
 * @copyright Copyright (C) 2011 Alex Gorbatchev. All rights reserved.
 * @license MIT License
 */
(function($)
{
	/**
	 * The Filter plugin introduces ability to limit input that the text field
	 * will accept. If the Tags plugin is used, Filter plugin will limit which
	 * tags it's possible to add.
	 *
	 * The list of allowed items can be either specified through the
	 * options, can come from the Suggestions plugin or be loaded by the Ajax 
	 * plugin. All these plugins have one thing in common -- they 
	 * trigger `setSuggestions` event which the Filter plugin is expecting.
	 * 
	 * @author agorbatchev
	 * @date 2011/08/18
	 * @id TextExtFilter
	 */
	function TextExtFilter() {};

	$.fn.textext.TextExtFilter = TextExtFilter;
	$.fn.textext.addPlugin('filter', TextExtFilter);

	var p = TextExtFilter.prototype,

		/**
		 * Filter plugin options are grouped under `filter` when passed to the 
		 * `$().textext()` function. For example:
		 *
		 *     $('textarea').textext({
		 *         plugins: 'filter',
		 *         filter: {
		 *             items: [ "item1", "item2" ]
		 *         }
		 *     })
		 *
		 * @author agorbatchev
		 * @date 2011/08/18
		 * @id TextExtFilter.options
		 */
		
		/**
		 * This is a toggle switch to enable or disable the Filter plugin. The value is checked
		 * each time at the top level which allows you to toggle this setting on the fly.
		 *
		 * @name filter.enabled
		 * @default true
		 * @author agorbatchev
		 * @date 2011/08/18
		 * @id TextExtFilter.options.enabled
		 */
		OPT_ENABLED = 'filter.enabled',

		/**
		 * Arra of items that the Filter plugin will allow the Tag plugin to add to the list of
		 * its resut tags. Each item by default is expected to be a string which default `ItemManager`
		 * can work with. You can change the item type by supplying custom `ItemManager`.
		 *
		 * @name filter.items
		 * @default null
		 * @author agorbatchev
		 * @date 2011/08/18
		 * @id TextExtFilter.options.items
		 */
		OPT_ITEMS = 'filter.items',

		/**
		 * Filter plugin dispatches and reacts to the following events.
		 *
		 * @author agorbatchev
		 * @date 2011/08/18
		 * @id TextExtFilter.events
		 */

		/**
		 * Filter plugin reacts to the `isTagAllowed` event triggered by the Tags plugin before
		 * adding a new tag to the list. If the new tag is among the `items` specified in options,
		 * then the new tag will be allowed.
		 *
		 * @name isTagAllowed
		 * @author agorbatchev
		 * @date 2011/08/18
		 * @id TextExtFilter.events.isTagAllowed
		 */

		/**
		 * Filter plugin reacts to the `setSuggestions` event triggered by other plugins like 
		 * Suggestions and Ajax.
		 *
		 * However, event if this event is handled and items are passed with it and stored, if `items`
		 * option was supplied, it will always take precedense.
		 *
		 * @name setSuggestions
		 * @author agorbatchev
		 * @date 2011/08/18
		 * @id TextExtFilter.events.setSuggestions
		 */

		DEFAULT_OPTS = {
			filter : {
				enabled : true,
				items : null
			}
		}
		;

	/**
	 * Initialization method called by the core during plugin instantiation.
	 *
	 * @signature TextExtFilter.init(core)
	 *
	 * @param core {TextExt} Instance of the TextExt core class.
	 *
	 * @author agorbatchev
	 * @date 2011/08/18
	 * @id TextExtFilter.init
	 */
	p.init = function(core)
	{
		var self = this;
		self.baseInit(core, DEFAULT_OPTS);

		self.on({
			getFormData    : self.onGetFormData,
			isTagAllowed   : self.onIsTagAllowed,
			setSuggestions : self.onSetSuggestions
		});

		self._suggestions = null;
	};

	//--------------------------------------------------------------------------------
	// Core functionality

	/**
	 * Reacts to the [`getFormData`][1] event triggered by the core. Returns data with the
	 * weight of 200 to be *greater than the Autocomplete plugins* data weights. 
	 * The weights system is covered in greater detail in the [`getFormData`][1] event 
	 * documentation.
	 *
	 * This method does nothing if Tags tag is also present.
	 *
	 * [1]: /manual/textext.html#getformdata
	 *
	 * @signature TextExtFilter.onGetFormData(e, data, keyCode)
	 *
	 * @param e {Object} jQuery event.
	 * @param data {Object} Data object to be populated.
	 * @param keyCode {Number} Key code that triggered the original update request.
	 *
	 * @author agorbatchev
	 * @date 2011/12/28
	 * @id TextExtFilter.onGetFormData
	 * @version 1.1
	 */
	p.onGetFormData = function(e, data, keyCode)
	{
		var self       = this,
			val        = self.val(),
			inputValue = val,
			formValue  = ''
			;

		if(!self.core().hasPlugin('tags'))
		{
			if(self.isValueAllowed(inputValue))
				formValue = val;

			data[300] = self.formDataObject(inputValue, formValue);
		}
	};

	/**
	 * Checks given value if it's present in `filterItems` or was loaded for the Autocomplete
	 * or by the Suggestions plugins. `value` is compared to each item using `ItemManager.compareItems`
	 * method which is currently attached to the core. Returns `true` if value is known or
	 * Filter plugin is disabled.
	 *
	 * @signature TextExtFilter.isValueAllowed(value)
	 *
	 * @param value {Object} Value to check.
	 *
	 * @author agorbatchev
	 * @date 2011/12/28
	 * @id TextExtFilter.isValueAllowed
	 * @version 1.1
	 */
	p.isValueAllowed = function(value)
	{
		var self        = this,
			list        = self.opts('filterItems') || self._suggestions || [],
			itemManager = self.itemManager(),
			result      = !self.opts(OPT_ENABLED), // if disabled, should just return true
			i
			;

		for(i = 0; i < list.length && !result; i++)
			if(itemManager.compareItems(value, list[i]))
				result = true;

		return result;
	};

	/**
	 * Handles `isTagAllowed` event dispatched by the Tags plugin. If supplied tag is not
	 * in the `items` list, method sets `result` on the `data` argument to `false`.
	 *
	 * @signature TextExtFilter.onIsTagAllowed(e, data)
	 *
	 * @param e {Object} jQuery event.
	 * @param data {Object} Payload in the following format : `{ tag : {Object}, result : {Boolean} }`.
	 * @author agorbatchev
	 * @date 2011/08/04
	 * @id TextExtFilter.onIsTagAllowed
	 */
	p.onIsTagAllowed = function(e, data)
	{
		data.result = this.isValueAllowed(data.tag);
	};

	/**
	 * Reacts to the `setSuggestions` events and stores supplied suggestions for future use.
	 * 
	 * @signature TextExtFilter.onSetSuggestions(e, data)
	 *
	 * @param e {Object} jQuery event.
	 * @param data {Object} Payload in the following format : `{ result : {Array} } }`.
	 * @author agorbatchev
	 * @date 2011/08/18
	 * @id TextExtFilter.onSetSuggestions
	 */
	p.onSetSuggestions = function(e, data)
	{
		this._suggestions = data.result;
	};
})(jQuery);

define("jam/jquery-textext/src/js/textext.plugin.filter.js", function(){});

/**
 * jQuery TextExt Plugin
 * http://textextjs.com
 *
 * @version 1.3.1
 * @copyright Copyright (C) 2011 Alex Gorbatchev. All rights reserved.
 * @license MIT License
 */
(function($)
{
	/**
	 * Focus plugin displays a visual effect whenever user sets focus
	 * into the text area.
	 *
	 * @author agorbatchev
	 * @date 2011/08/18
	 * @id TextExtFocus
	 */
	function TextExtFocus() {};

	$.fn.textext.TextExtFocus = TextExtFocus;
	$.fn.textext.addPlugin('focus', TextExtFocus);

	var p = TextExtFocus.prototype,
		/**
		 * Focus plugin only has one option and that is its HTML template. It could be 
		 * changed when passed to the `$().textext()` function. For example:
		 *
		 *     $('textarea').textext({
		 *         plugins: 'focus',
		 *         html: {
		 *             focus: "<span/>"
		 *         }
		 *     })
		 *
		 * @author agorbatchev
		 * @date 2011/08/18
		 * @id TextExtFocus.options
		 */
		
		/**
		 * HTML source that is used to generate markup required for the focus effect.
		 *
		 * @name html.focus
		 * @default '<div class="text-focus"/>'
		 * @author agorbatchev
		 * @date 2011/08/18
		 * @id TextExtFocus.options.html.focus
		 */
		OPT_HTML_FOCUS = 'html.focus',

		/**
		 * Focus plugin dispatches or reacts to the following events.
		 *
		 * @author agorbatchev
		 * @date 2011/08/17
		 * @id TextExtFocus.events
		 */

		/**
		 * Focus plugin reacts to the `focus` event and shows the markup generated from
		 * the `html.focus` option.
		 *
		 * @name focus
		 * @author agorbatchev
		 * @date 2011/08/18
		 * @id TextExtFocus.events.focus
		 */

		/**
		 * Focus plugin reacts to the `blur` event and hides the effect.
		 *
		 * @name blur
		 * @author agorbatchev
		 * @date 2011/08/18
		 * @id TextExtFocus.events.blur
		 */

		DEFAULT_OPTS = {
			html : {
				focus : '<div class="text-focus"/>'
			}
		}
		;

	/**
	 * Initialization method called by the core during plugin instantiation.
	 *
	 * @signature TextExtFocus.init(core)
	 *
	 * @param core {TextExt} Instance of the TextExt core class.
	 *
	 * @author agorbatchev
	 * @date 2011/08/18
	 * @id TextExtFocus.init
	 */
	p.init = function(core)
	{
		var self = this;

		self.baseInit(core, DEFAULT_OPTS);
		self.core().wrapElement().append(self.opts(OPT_HTML_FOCUS));
		self.on({
			blur  : self.onBlur,
			focus : self.onFocus
		});

		self._timeoutId = 0;
	};

	//--------------------------------------------------------------------------------
	// Event handlers
	
	/**
	 * Reacts to the `blur` event and hides the focus effect with a slight delay which 
	 * allows quick refocusing without effect blinking in and out.
	 *
	 * @signature TextExtFocus.onBlur(e)
	 *
	 * @param e {Object} jQuery event.
	 *
	 * @author agorbatchev
	 * @date 2011/08/08
	 * @id TextExtFocus.onBlur
	 */
	p.onBlur = function(e)
	{
		var self = this;

		clearTimeout(self._timeoutId);

		self._timeoutId = setTimeout(function()
		{
			self.getFocus().hide();
		},
		100);
	};

	/**
	 * Reacts to the `focus` event and shows the focus effect.
	 *
	 * @signature TextExtFocus.onFocus
	 *
	 * @param e {Object} jQuery event.
	 * @author agorbatchev
	 * @date 2011/08/08
	 * @id TextExtFocus.onFocus
	 */
	p.onFocus = function(e)
	{
		var self = this;

		clearTimeout(self._timeoutId);
		
		self.getFocus().show();
	};
	
	//--------------------------------------------------------------------------------
	// Core functionality

	/**
	 * Returns focus effect HTML element.
	 *
	 * @signature TextExtFocus.getFocus()
	 *
	 * @author agorbatchev
	 * @date 2011/08/08
	 * @id TextExtFocus.getFocus
	 */
	p.getFocus = function()
	{
		return this.core().wrapElement().find('.text-focus');
	};
})(jQuery);

define("jam/jquery-textext/src/js/textext.plugin.focus.js", function(){});

/**
 * jQuery TextExt Plugin
 * http://textextjs.com
 *
 * @version 1.3.1
 * @copyright Copyright (C) 2011 Alex Gorbatchev. All rights reserved.
 * @license MIT License
 */
(function($)
{
	/**
	 * Prompt plugin displays a visual user propmpt in the text input area. If user focuses
	 * on the input, the propt is hidden and only shown again when user focuses on another
	 * element and text input doesn't have a value.
	 *
	 * @author agorbatchev
	 * @date 2011/08/18
	 * @id TextExtPrompt
	 */
	function TextExtPrompt() {};

	$.fn.textext.TextExtPrompt = TextExtPrompt;
	$.fn.textext.addPlugin('prompt', TextExtPrompt);

	var p = TextExtPrompt.prototype,

		CSS_HIDE_PROMPT = 'text-hide-prompt',

		/**
		 * Prompt plugin has options to change the prompt label and its HTML template. The options
		 * could be changed when passed to the `$().textext()` function. For example:
		 *
		 *     $('textarea').textext({
		 *         plugins: 'prompt',
		 *         prompt: 'Your email address'
		 *     })
		 *
		 * @author agorbatchev
		 * @date 2011/08/18
		 * @id TextExtPrompt.options
		 */

		/**
		 * Prompt message that is displayed to the user whenever there's no value in the input.
		 *
		 * @name prompt
		 * @default 'Awaiting input...'
		 * @author agorbatchev
		 * @date 2011/08/18
		 * @id TextExtPrompt.options.prompt
		 */
		OPT_PROMPT = 'prompt',

		/**
		 * HTML source that is used to generate markup required for the prompt effect.
		 *
		 * @name html.prompt
		 * @default '<div class="text-prompt"/>'
		 * @author agorbatchev
		 * @date 2011/08/18
		 * @id TextExtPrompt.options.html.prompt
		 */
		OPT_HTML_PROMPT = 'html.prompt',

		/**
		 * Prompt plugin dispatches or reacts to the following events.
		 * @id TextExtPrompt.events
		 */

		/**
		 * Prompt plugin reacts to the `focus` event and hides the markup generated from
		 * the `html.prompt` option.
		 *
		 * @name focus
		 * @author agorbatchev
		 * @date 2011/08/18
		 * @id TextExtPrompt.events.focus
		 */

		/**
		 * Prompt plugin reacts to the `blur` event and shows the prompt back if user
		 * hasn't entered any value.
		 *
		 * @name blur
		 * @author agorbatchev
		 * @date 2011/08/18
		 * @id TextExtPrompt.events.blur
		 */
	
		DEFAULT_OPTS = {
			prompt : 'Awaiting input...',

			html : {
				prompt : '<div class="text-prompt"/>'
			}
		}
		;

	/**
	 * Initialization method called by the core during plugin instantiation.
	 *
	 * @signature TextExtPrompt.init(core)
	 *
	 * @param core {TextExt} Instance of the TextExt core class.
	 *
	 * @author agorbatchev
	 * @date 2011/08/18
	 * @id TextExtPrompt.init
	 */
	p.init = function(core)
	{
		var self           = this,
			placeholderKey = 'placeholder',
			container,
			prompt
			;

		self.baseInit(core, DEFAULT_OPTS);
		
		container = $(self.opts(OPT_HTML_PROMPT));
		$(self).data('container', container);

		self.core().wrapElement().append(container);
		self.setPrompt(self.opts(OPT_PROMPT));
		
		prompt = core.input().attr(placeholderKey);

		if(!prompt)
			prompt = self.opts(OPT_PROMPT);

		// clear placeholder attribute if set
		core.input().attr(placeholderKey, '');

		if(prompt)
			self.setPrompt(prompt);

		if($.trim(self.val()).length > 0)
			self.hidePrompt();

		self.on({
			blur           : self.onBlur,
			focus          : self.onFocus,
			postInvalidate : self.onPostInvalidate,
			postInit       : self.onPostInit
		});
	};

	//--------------------------------------------------------------------------------
	// Event handlers
	
	/**
	 * Reacts to the `postInit` and configures the plugin for initial display.
	 *
	 * @signature TextExtPrompt.onPostInit(e)
	 *
	 * @param e {Object} jQuery event.
	 *
	 * @author agorbatchev
	 * @date 2011/08/24
	 * @id TextExtPrompt.onPostInit
	 */
	p.onPostInit = function(e)
	{
		this.invalidateBounds();
	};

	/**
	 * Reacts to the `postInvalidate` and insures that prompt display remains correct.
	 *
	 * @signature TextExtPrompt.onPostInvalidate(e)
	 *
	 * @param e {Object} jQuery event.
	 *
	 * @author agorbatchev
	 * @date 2011/08/24
	 * @id TextExtPrompt.onPostInvalidate
	 */
	p.onPostInvalidate = function(e)
	{
		this.invalidateBounds();
	};

	/**
	 * Repositions the prompt to make sure it's always at the same place as in the text input carret.
	 *
	 * @signature TextExtPrompt.invalidateBounds()
	 *
	 * @author agorbatchev
	 * @date 2011/08/24
	 * @id TextExtPrompt.invalidateBounds
	 */
	p.invalidateBounds = function()
	{
		var self  = this,
			input = self.input()
			;

		self.containerElement().css({
			paddingLeft : input.css('paddingLeft'),
			paddingTop  : input.css('paddingTop')
		});
	};

	/**
	 * Reacts to the `blur` event and shows the prompt effect with a slight delay which 
	 * allows quick refocusing without effect blinking in and out.
	 *
	 * The prompt is restored if the text box has no value.
	 *
	 * @signature TextExtPrompt.onBlur(e)
	 *
	 * @param e {Object} jQuery event.
	 *
	 * @author agorbatchev
	 * @date 2011/08/08
	 * @id TextExtPrompt.onBlur
	 */
	p.onBlur = function(e)
	{
		var self = this;

		self.startTimer('prompt', 0.1, function()
		{
			self.showPrompt();
		});
	};

	/**
	 * Shows prompt HTML element.
	 *
	 * @signature TextExtPrompt.showPrompt()
	 *
	 * @author agorbatchev
	 * @date 2011/08/22
	 * @id TextExtPrompt.showPrompt
	 */
	p.showPrompt = function()
	{
		var self     = this,
			input    = self.input()
			;
		
		if($.trim(self.val()).length === 0 && !input.is(':focus'))
			self.containerElement().removeClass(CSS_HIDE_PROMPT);
	};

	/**
	 * Hides prompt HTML element.
	 *
	 * @signature TextExtPrompt.hidePrompt()
	 *
	 * @author agorbatchev
	 * @date 2011/08/22
	 * @id TextExtPrompt.hidePrompt
	 */
	p.hidePrompt = function()
	{
		this.stopTimer('prompt');
		this.containerElement().addClass(CSS_HIDE_PROMPT);
	};

	/**
	 * Reacts to the `focus` event and hides the prompt effect.
	 *
	 * @signature TextExtPrompt.onFocus
	 *
	 * @param e {Object} jQuery event.
	 * @author agorbatchev
	 * @date 2011/08/08
	 * @id TextExtPrompt.onFocus
	 */
	p.onFocus = function(e)
	{
		this.hidePrompt();
	};
	
	//--------------------------------------------------------------------------------
	// Core functionality

	/**
	 * Sets the prompt display to the specified string.
	 *
	 * @signature TextExtPrompt.setPrompt(str)
	 *
	 * @oaram str {String} String that will be displayed in the prompt.
	 *
	 * @author agorbatchev
	 * @date 2011/08/18
	 * @id TextExtPrompt.setPrompt
	 */
	p.setPrompt = function(str)
	{
		this.containerElement().text(str);
	};

	/**
	 * Returns prompt effect HTML element.
	 *
	 * @signature TextExtPrompt.containerElement()
	 *
	 * @author agorbatchev
	 * @date 2011/08/08
	 * @id TextExtPrompt.containerElement
	 */
	p.containerElement = function()
	{
		return $(this).data('container');
	};
})(jQuery);

define("jam/jquery-textext/src/js/textext.plugin.prompt.js", function(){});

/**
 * jQuery TextExt Plugin
 * http://textextjs.com
 *
 * @version 1.3.1
 * @copyright Copyright (C) 2011 Alex Gorbatchev. All rights reserved.
 * @license MIT License
 */
(function($)
{
	/**
	 * Suggestions plugin allows to easily specify the list of suggestion items that the
	 * Autocomplete plugin would present to the user.
	 *
	 * @author agorbatchev
	 * @date 2011/08/18
	 * @id TextExtSuggestions
	 */
	function TextExtSuggestions() {};

	$.fn.textext.TextExtSuggestions = TextExtSuggestions;
	$.fn.textext.addPlugin('suggestions', TextExtSuggestions);

	var p = TextExtSuggestions.prototype,
		/**
		 * Suggestions plugin only has one option and that is to set suggestion items. It could be 
		 * changed when passed to the `$().textext()` function. For example:
		 *
		 *     $('textarea').textext({
		 *         plugins: 'suggestions',
		 *         suggestions: [ "item1", "item2" ]
		 *     })
		 *
		 * @author agorbatchev
		 * @date 2011/08/18
		 * @id TextExtSuggestions.options
		 */

		/**
		 * List of items that Autocomplete plugin would display in the dropdown.
		 *
		 * @name suggestions
		 * @default null
		 * @author agorbatchev
		 * @date 2011/08/18
		 * @id TextExtSuggestions.options.suggestions
		 */
		OPT_SUGGESTIONS = 'suggestions',

		/**
		 * Suggestions plugin dispatches or reacts to the following events.
		 *
		 * @author agorbatchev
		 * @date 2011/08/17
		 * @id TextExtSuggestions.events
		 */

		/**
		 * Suggestions plugin reacts to the `getSuggestions` event and returns `suggestions` items
		 * from the options.
		 *
		 * @name getSuggestions
		 * @author agorbatchev
		 * @date 2011/08/19
		 * @id TextExtSuggestions.events.getSuggestions
		 */

		/**
		 * Suggestions plugin triggers the `setSuggestions` event to pass its own list of `Suggestions`
		 * to the Autocomplete plugin.
		 *
		 * @name setSuggestions
		 * @author agorbatchev
		 * @date 2011/08/19
		 * @id TextExtSuggestions.events.setSuggestions
		 */

		/**
		 * Suggestions plugin reacts to the `postInit` event to pass its list of `suggestions` to the
		 * Autocomplete right away.
		 *
		 * @name postInit
		 * @author agorbatchev
		 * @date 2011/08/19
		 * @id TextExtSuggestions.events.postInit
		 */

		DEFAULT_OPTS = {
			suggestions : null
		}
		;

	/**
	 * Initialization method called by the core during plugin instantiation.
	 *
	 * @signature TextExtSuggestions.init(core)
	 *
	 * @param core {TextExt} Instance of the TextExt core class.
	 *
	 * @author agorbatchev
	 * @date 2011/08/18
	 * @id TextExtSuggestions.init
	 */
	p.init = function(core)
	{
		var self = this;

		self.baseInit(core, DEFAULT_OPTS);

		self.on({
			getSuggestions : self.onGetSuggestions,
			postInit       : self.onPostInit
		});
	};

	/**
	 * Triggers `setSuggestions` and passes supplied suggestions to the Autocomplete plugin.
	 *
	 * @signature TextExtSuggestions.setSuggestions(suggestions, showHideDropdown)
	 *
	 * @param suggestions {Array} List of suggestions. With the default `ItemManager` it should
	 * be a list of strings.
	 * @param showHideDropdown {Boolean} If it's undesirable to show the dropdown right after
	 * suggestions are set, `false` should be passed for this argument.
	 *
	 * @author agorbatchev
	 * @date 2011/08/19
	 * @id TextExtSuggestions.setSuggestions
	 */
	p.setSuggestions = function(suggestions, showHideDropdown)
	{
		this.trigger('setSuggestions', { result : suggestions, showHideDropdown : showHideDropdown != false });
	};

	/**
	 * Reacts to the `postInit` event and triggers `setSuggestions` event to set suggestions list 
	 * right after initialization.
	 *
	 * @signature TextExtSuggestions.onPostInit(e)
	 *
	 * @param e {Object} jQuery event.
	 *
	 * @author agorbatchev
	 * @date 2011/08/19
	 * @id TextExtSuggestions.onPostInit
	 */
	p.onPostInit = function(e)
	{
		var self = this;
		self.setSuggestions(self.opts(OPT_SUGGESTIONS), false);
	};

	/**
	 * Reacts to the `getSuggestions` event and triggers `setSuggestions` event with the list
	 * of `suggestions` specified in the options.
	 *
	 * @signature TextExtSuggestions.onGetSuggestions(e, data)
	 *
	 * @param e {Object} jQuery event.
	 * @param data {Object} Payload from the `getSuggestions` event with the user query, eg `{ query: {String} }`.
	 *
	 * @author agorbatchev
	 * @date 2011/08/19
	 * @id TextExtSuggestions.onGetSuggestions
	 */
	p.onGetSuggestions = function(e, data)
	{
		var self        = this,
			suggestions = self.opts(OPT_SUGGESTIONS)
			;

		suggestions.sort();
		self.setSuggestions(self.itemManager().filter(suggestions, data.query));
	};
})(jQuery);

define("jam/jquery-textext/src/js/textext.plugin.suggestions.js", function(){});

/**
 * jQuery TextExt Plugin
 * http://textextjs.com
 *
 * @version 1.3.1
 * @copyright Copyright (C) 2011 Alex Gorbatchev. All rights reserved.
 * @license MIT License
 */
(function($)
{
	/**
	 * Tags plugin brings in the traditional tag functionality where user can assemble and
	 * edit list of tags. Tags plugin works especially well together with Autocomplete, Filter,
	 * Suggestions and Ajax plugins to provide full spectrum of features. It can also work on
	 * its own and just do one thing -- tags.
	 *
	 * @author agorbatchev
	 * @date 2011/08/19
	 * @id TextExtTags
	 */
	function TextExtTags() {};

	$.fn.textext.TextExtTags = TextExtTags;
	$.fn.textext.addPlugin('tags', TextExtTags);

	var p = TextExtTags.prototype,

		CSS_DOT             = '.',
		CSS_TAGS_ON_TOP     = 'text-tags-on-top',
		CSS_DOT_TAGS_ON_TOP = CSS_DOT + CSS_TAGS_ON_TOP,
		CSS_TAG             = 'text-tag',
		CSS_DOT_TAG         = CSS_DOT + CSS_TAG,
		CSS_TAGS            = 'text-tags',
		CSS_DOT_TAGS        = CSS_DOT + CSS_TAGS,
		CSS_LABEL           = 'text-label',
		CSS_DOT_LABEL       = CSS_DOT + CSS_LABEL,
		CSS_REMOVE          = 'text-remove',
		CSS_DOT_REMOVE      = CSS_DOT + CSS_REMOVE,

		/**
		 * Tags plugin options are grouped under `tags` when passed to the
		 * `$().textext()` function. For example:
		 *
		 *     $('textarea').textext({
		 *         plugins: 'tags',
		 *         tags: {
		 *             items: [ "tag1", "tag2" ]
		 *         }
		 *     })
		 *
		 * @author agorbatchev
		 * @date 2011/08/19
		 * @id TextExtTags.options
		 */

		/**
		 * This is a toggle switch to enable or disable the Tags plugin. The value is checked
		 * each time at the top level which allows you to toggle this setting on the fly.
		 *
		 * @name tags.enabled
		 * @default true
		 * @author agorbatchev
		 * @date 2011/08/19
		 * @id TextExtTags.options.tags.enabled
		 */
		OPT_ENABLED = 'tags.enabled',

		/**
		 * Allows to specify tags which will be added to the input by default upon initialization.
		 * Each item in the array must be of the type that current `ItemManager` can understand.
		 * Default type is `String`.
		 *
		 * @name tags.items
		 * @default null
		 * @author agorbatchev
		 * @date 2011/08/19
		 * @id TextExtTags.options.tags.items
		 */
		OPT_ITEMS = 'tags.items',

		/**
		 * HTML source that is used to generate a single tag.
		 *
		 * @name html.tag
		 * @default '<div class="text-tags"/>'
		 * @author agorbatchev
		 * @date 2011/08/19
		 * @id TextExtTags.options.html.tag
		 */
		OPT_HTML_TAG  = 'html.tag',

		/**
		 * HTML source that is used to generate container for the tags.
		 *
		 * @name html.tags
		 * @default '<div class="text-tag"><div class="text-button"><span class="text-label"/><a class="text-remove"/></div></div>'
		 * @author agorbatchev
		 * @date 2011/08/19
		 * @id TextExtTags.options.html.tags
		 */
		OPT_HTML_TAGS = 'html.tags',

		/**
		 * Tags plugin dispatches or reacts to the following events.
		 *
		 * @author agorbatchev
		 * @date 2011/08/17
		 * @id TextExtTags.events
		 */

		/**
		 * Tags plugin triggers the `isTagAllowed` event before adding each tag to the tag list. Other plugins have
		 * an opportunity to interrupt this by setting `result` of the second argument to `false`. For example:
		 *
		 *     $('textarea').textext({...}).bind('isTagAllowed', function(e, data)
		 *     {
		 *         if(data.tag === 'foo')
		 *             data.result = false;
		 *     })
		 *
		 * The second argument `data` has the following format: `{ tag : {Object}, result : {Boolean} }`. `tag`
		 * property is in the format that the current `ItemManager` can understand.
		 *
		 * @name isTagAllowed
		 * @author agorbatchev
		 * @date 2011/08/19
		 * @id TextExtTags.events.isTagAllowed
		 */
		EVENT_IS_TAG_ALLOWED = 'isTagAllowed',

		/**
		 * Tags plugin triggers the `tagClick` event when user clicks on one of the tags. This allows to process
		 * the click and potentially change the value of the tag (for example in case of user feedback).
		 *
		 *     $('textarea').textext({...}).bind('tagClick', function(e, tag, value, callback)
		 *     {
		 *         var newValue = window.prompt('New value', value);

		 *         if(newValue)
		 *             callback(newValue, true);
		 *     })
		 *
		 *  Callback argument has the following signature:
		 *
		 *     function(newValue, refocus)
		 *     {
		 *         ...
		 *     }
		 *
		 * Please check out [example](/manual/examples/tags-changing.html).
		 *
		 * @name tagClick
		 * @version 1.3.0
		 * @author s.stok
		 * @date 2011/01/23
		 * @id TextExtTags.events.tagClick
		 */
		EVENT_TAG_CLICK = 'tagClick',

		DEFAULT_OPTS = {
			tags : {
				enabled : true,
				items   : null
			},

			html : {
				tags : '<div class="text-tags"/>',
				tag  : '<div class="text-tag"><div class="text-button"><span class="text-label"/><a class="text-remove"/></div></div>'
			}
		}
		;

	/**
	 * Initialization method called by the core during plugin instantiation.
	 *
	 * @signature TextExtTags.init(core)
	 *
	 * @param core {TextExt} Instance of the TextExt core class.
	 *
	 * @author agorbatchev
	 * @date 2011/08/19
	 * @id TextExtTags.init
	 */
	p.init = function(core)
	{
		this.baseInit(core, DEFAULT_OPTS);
		var self  = this,
			input = self.input(),
			container
			;

		if(self.opts(OPT_ENABLED))
		{
			container = $(self.opts(OPT_HTML_TAGS));
			input.after(container);

			$(self).data('container', container);

			self.on({
				enterKeyPress    : self.onEnterKeyPress,
				backspaceKeyDown : self.onBackspaceKeyDown,
				preInvalidate    : self.onPreInvalidate,
				postInit         : self.onPostInit,
				getFormData      : self.onGetFormData
			});

			self.on(container, {
				click     : self.onClick,
				mousemove : self.onContainerMouseMove
			});

			self.on(input, {
				mousemove : self.onInputMouseMove
			});
		}

		self._originalPadding = {
			left : parseInt(input.css('paddingLeft') || 0),
			top  : parseInt(input.css('paddingTop') || 0)
		};

		self._paddingBox = {
			left : 0,
			top  : 0
		};

		self.updateFormCache();
	};

	/**
	 * Returns HTML element in which all tag HTML elements are residing.
	 *
	 * @signature TextExtTags.containerElement()
	 *
	 * @author agorbatchev
	 * @date 2011/08/15
	 * @id TextExtTags.containerElement
	 */
	p.containerElement = function()
	{
		return $(this).data('container');
	};

	//--------------------------------------------------------------------------------
	// Event handlers

	/**
	 * Reacts to the `postInit` event triggered by the core and sets default tags
	 * if any were specified.
	 *
	 * @signature TextExtTags.onPostInit(e)
	 *
	 * @param e {Object} jQuery event.
	 *
	 * @author agorbatchev
	 * @date 2011/08/09
	 * @id TextExtTags.onPostInit
	 */
	p.onPostInit = function(e)
	{
		var self = this;
		self.addTags(self.opts(OPT_ITEMS));
	};

	/**
	 * Reacts to the [`getFormData`][1] event triggered by the core. Returns data with the
	 * weight of 200 to be *greater than the Autocomplete plugin* data weight. The weights
	 * system is covered in greater detail in the [`getFormData`][1] event documentation.
	 *
	 * [1]: /manual/textext.html#getformdata
	 *
	 * @signature TextExtTags.onGetFormData(e, data, keyCode)
	 *
	 * @param e {Object} jQuery event.
	 * @param data {Object} Data object to be populated.
	 * @param keyCode {Number} Key code that triggered the original update request.
	 *
	 * @author agorbatchev
	 * @date 2011/08/22
	 * @id TextExtTags.onGetFormData
	 */
	p.onGetFormData = function(e, data, keyCode)
	{
		var self       = this,
			inputValue = keyCode === 13 ? '' : self.val(),
			formValue  = self._formData
			;

		data[200] = self.formDataObject(inputValue, formValue);
	};

	/**
	 * Returns initialization priority of the Tags plugin which is expected to be
	 * *less than the Autocomplete plugin* because of the dependencies. The value is
	 * 100.
	 *
	 * @signature TextExtTags.initPriority()
	 *
	 * @author agorbatchev
	 * @date 2011/08/22
	 * @id TextExtTags.initPriority
	 */
	p.initPriority = function()
	{
		return 100;
	};

	/**
	 * Reacts to user moving mouse over the text area when cursor is over the text
	 * and not over the tags. Whenever mouse cursor is over the area covered by
	 * tags, the tags container is flipped to be on top of the text area which
	 * makes all tags functional with the mouse.
	 *
	 * @signature TextExtTags.onInputMouseMove(e)
	 *
	 * @param e {Object} jQuery event.
	 *
	 * @author agorbatchev
	 * @date 2011/08/08
	 * @id TextExtTags.onInputMouseMove
	 */
	p.onInputMouseMove = function(e)
	{
		this.toggleZIndex(e);
	};

	/**
	 * Reacts to user moving mouse over the tags. Whenever the cursor moves out
	 * of the tags and back into where the text input is happening visually,
	 * the tags container is sent back under the text area which allows user
	 * to interact with the text using mouse cursor as expected.
	 *
	 * @signature TextExtTags.onContainerMouseMove(e)
	 *
	 * @param e {Object} jQuery event.
	 *
	 * @author agorbatchev
	 * @date 2011/08/08
	 * @id TextExtTags.onContainerMouseMove
	 */
	p.onContainerMouseMove = function(e)
	{
		this.toggleZIndex(e);
	};

	/**
	 * Reacts to the `backspaceKeyDown` event. When backspace key is pressed in an empty text field,
	 * deletes last tag from the list.
	 *
	 * @signature TextExtTags.onBackspaceKeyDown(e)
	 *
	 * @param e {Object} jQuery event.
	 *
	 * @author agorbatchev
	 * @date 2011/08/02
	 * @id TextExtTags.onBackspaceKeyDown
	 */
	p.onBackspaceKeyDown = function(e)
	{
		var self    = this,
			lastTag = self.tagElements().last()
			;

		if(self.val().length == 0)
			self.removeTag(lastTag);
	};

	/**
	 * Reacts to the `preInvalidate` event and updates the input box to look like the tags are
	 * positioned inside it.
	 *
	 * @signature TextExtTags.onPreInvalidate(e)
	 *
	 * @param e {Object} jQuery event.
	 *
	 * @author agorbatchev
	 * @date 2011/08/19
	 * @id TextExtTags.onPreInvalidate
	 */
	p.onPreInvalidate = function(e)
	{
		var self    = this,
			lastTag = self.tagElements().last(),
			pos     = lastTag.position()
			;

		if(lastTag.length > 0)
			pos.left += lastTag.innerWidth();
		else
			pos = self._originalPadding;

		self._paddingBox = pos;

		self.input().css({
			paddingLeft : pos.left,
			paddingTop  : pos.top
		});
	};

	/**
	 * Reacts to the mouse `click` event.
	 *
	 * @signature TextExtTags.onClick(e)
	 *
	 * @param e {Object} jQuery event.
	 *
	 * @author agorbatchev
	 * @date 2011/08/19
	 * @id TextExtTags.onClick
	 */
	p.onClick = function(e)
	{
		var self   = this,
			core   = self.core(),
			source = $(e.target),
			focus  = 0,
			tag
			;

		if(source.is(CSS_DOT_TAGS))
		{
			focus = 1;
		}
		else if(source.is(CSS_DOT_REMOVE))
		{
			self.removeTag(source.parents(CSS_DOT_TAG + ':first'));
			focus = 1;
		}
		else if(source.is(CSS_DOT_LABEL))
		{
			tag = source.parents(CSS_DOT_TAG + ':first');
			self.trigger(EVENT_TAG_CLICK, tag, tag.data(CSS_TAG), tagClickCallback);
		}

		function tagClickCallback(newValue, refocus)
		{
			tag.data(CSS_TAG, newValue);
			tag.find(CSS_DOT_LABEL).text(self.itemManager().itemToString(newValue));

			self.updateFormCache();
			core.getFormData();
			core.invalidateBounds();

			if(refocus)
				core.focusInput();
		}

		if(focus)
			core.focusInput();
	};

	/**
	 * Reacts to the `enterKeyPress` event and adds whatever is currently in the text input
	 * as a new tag. Triggers `isTagAllowed` to check if the tag could be added first.
	 *
	 * @signature TextExtTags.onEnterKeyPress(e)
	 *
	 * @param e {Object} jQuery event.
	 *
	 * @author agorbatchev
	 * @date 2011/08/19
	 * @id TextExtTags.onEnterKeyPress
	 */
	p.onEnterKeyPress = function(e)
	{
		var self = this,
			val  = self.val(),
			tag  = self.itemManager().stringToItem(val)
			;

		if(self.isTagAllowed(tag))
		{
			self.addTags([ tag ]);
			// refocus the textarea just in case it lost the focus
			self.core().focusInput();
		}
	};

	//--------------------------------------------------------------------------------
	// Core functionality

	/**
	 * Creates a cache object with all the tags currently added which will be returned
	 * in the `onGetFormData` handler.
	 *
	 * @signature TextExtTags.updateFormCache()
	 *
	 * @author agorbatchev
	 * @date 2011/08/09
	 * @id TextExtTags.updateFormCache
	 */
	p.updateFormCache = function()
	{
		var self   = this,
			result = []
			;

		self.tagElements().each(function()
		{
			result.push($(this).data(CSS_TAG));
		});

		// cache the results to be used in the onGetFormData
		self._formData = result;
	};

	/**
	 * Toggles tag container to be on top of the text area or under based on where
	 * the mouse cursor is located. When cursor is above the text input and out of
	 * any of the tags, the tags container is sent under the text area. If cursor
	 * is over any of the tags, the tag container is brought to be over the text
	 * area.
	 *
	 * @signature TextExtTags.toggleZIndex(e)
	 *
	 * @param e {Object} jQuery event.
	 *
	 * @author agorbatchev
	 * @date 2011/08/08
	 * @id TextExtTags.toggleZIndex
	 */
	p.toggleZIndex = function(e)
	{
		var self            = this,
			offset          = self.input().offset(),
			mouseX          = e.clientX - offset.left,
			mouseY          = e.clientY - offset.top,
			box             = self._paddingBox,
			container       = self.containerElement(),
			isOnTop         = container.is(CSS_DOT_TAGS_ON_TOP),
			isMouseOverText = mouseX > box.left && mouseY > box.top
			;

		if(!isOnTop && !isMouseOverText || isOnTop && isMouseOverText)
			container[(!isOnTop ? 'add' : 'remove') + 'Class'](CSS_TAGS_ON_TOP);
	};

	/**
	 * Returns all tag HTML elements.
	 *
	 * @signature TextExtTags.tagElements()
	 *
	 * @author agorbatchev
	 * @date 2011/08/19
	 * @id TextExtTags.tagElements
	 */
	p.tagElements = function()
	{
		return this.containerElement().find(CSS_DOT_TAG);
	};

	/**
	 * Wrapper around the `isTagAllowed` event which triggers it and returns `true`
	 * if `result` property of the second argument remains `true`.
	 *
	 * @signature TextExtTags.isTagAllowed(tag)
	 *
	 * @param tag {Object} Tag object that the current `ItemManager` can understand.
	 * Default is `String`.
	 *
	 * @author agorbatchev
	 * @date 2011/08/19
	 * @id TextExtTags.isTagAllowed
	 */
	p.isTagAllowed = function(tag)
	{
		var opts = { tag : tag, result : true };
		this.trigger(EVENT_IS_TAG_ALLOWED, opts);
		return opts.result === true;
	};

	/**
	 * Adds specified tags to the tag list. Triggers `isTagAllowed` event for each tag
	 * to insure that it could be added. Calls `TextExt.getFormData()` to refresh the data.
	 *
	 * @signature TextExtTags.addTags(tags)
	 *
	 * @param tags {Array} List of tags that current `ItemManager` can understand. Default
	 * is `String`.
	 *
	 * @author agorbatchev
	 * @date 2011/08/19
	 * @id TextExtTags.addTags
	 */
	p.addTags = function(tags)
	{
		if(!tags || tags.length == 0)
			return;

		var self      = this,
			core      = self.core(),
			container = self.containerElement(),
			i, tag
			;

		for(i = 0; i < tags.length; i++)
		{
			tag = tags[i];

			if(tag && self.isTagAllowed(tag))
				container.append(self.renderTag(tag));
		}

		self.updateFormCache();
		core.getFormData();
		core.invalidateBounds();
	};

	/**
	 * Returns HTML element for the specified tag.
	 *
	 * @signature TextExtTags.getTagElement(tag)
	 *
	 * @param tag {Object} Tag object in the format that current `ItemManager` can understand.
	 * Default is `String`.

	 * @author agorbatchev
	 * @date 2011/08/19
	 * @id TextExtTags.getTagElement
	 */
	p.getTagElement = function(tag)
	{
		var self = this,
			list = self.tagElements(),
			i, item
			;

		for(i = 0; i < list.length, item = $(list[i]); i++)
			if(self.itemManager().compareItems(item.data(CSS_TAG), tag))
				return item;
	};

	/**
	 * Removes specified tag from the list. Calls `TextExt.getFormData()` to refresh the data.
	 *
	 * @signature TextExtTags.removeTag(tag)
	 *
	 * @param tag {Object} Tag object in the format that current `ItemManager` can understand.
	 * Default is `String`.
	 *
	 * @author agorbatchev
	 * @date 2011/08/19
	 * @id TextExtTags.removeTag
	 */
	p.removeTag = function(tag)
	{
		var self = this,
			core = self.core(),
			element
			;

		if(tag instanceof $)
		{
			element = tag;
			tag = tag.data(CSS_TAG);
		}
		else
		{
			element = self.getTagElement(tag);
		}

		element.remove();
		self.updateFormCache();
		core.getFormData();
		core.invalidateBounds();
	};

	/**
	 * Creates and returns new HTML element from the source code specified in the `html.tag` option.
	 *
	 * @signature TextExtTags.renderTag(tag)
	 *
	 * @param tag {Object} Tag object in the format that current `ItemManager` can understand.
	 * Default is `String`.
	 *
	 * @author agorbatchev
	 * @date 2011/08/19
	 * @id TextExtTags.renderTag
	 */
	p.renderTag = function(tag)
	{
		var self = this,
			node = $(self.opts(OPT_HTML_TAG))
			;

		node.find('.text-label').text(self.itemManager().itemToString(tag));
		node.data(CSS_TAG, tag);
		return node;
	};
})(jQuery);

define("jam/jquery-textext/src/js/textext.plugin.tags.js", function(){});

// plone integration for textext.
//
// Author: Rok Garbas
// Contact: rok@garbas.si
// Version: 1.0
// Depends:
//    ++resource++plone.app.jquery.js
//    ++resource++plone.app.widgets/textext.js
//
// Description:
//
// License:
//
// Copyright (C) 2010 Plone Foundation
//
// This program is free software; you can redistribute it and/or modify it
// under the terms of the GNU General Public License as published by the Free
// Software Foundation; either version 2 of the License.
//
// This program is distributed in the hope that it will be useful, but WITHOUT
// ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
// FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
// more details.
//
// You should have received a copy of the GNU General Public License along with
// this program; if not, write to the Free Software Foundation, Inc., 51
// Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
//

/*jshint bitwise:true, curly:true, eqeqeq:true, immed:true, latedef:true,
  newcap:true, noarg:true, noempty:true, nonew:true, plusplus:true,
  undef:true, strict:true, trailing:true, browser:true, evil:true */
/*global define:false */


define('js/pattern.autocomplete',[
  'jquery',
  'js/patterns',
  'jam/jquery-textext/src/js/textext.core.js',
  'jam/jquery-textext/src/js/textext.plugin.ajax.js',
  'jam/jquery-textext/src/js/textext.plugin.arrow.js',
  'jam/jquery-textext/src/js/textext.plugin.autocomplete.js',
  'jam/jquery-textext/src/js/textext.plugin.clear.js',
  'jam/jquery-textext/src/js/textext.plugin.filter.js',
  'jam/jquery-textext/src/js/textext.plugin.focus.js',
  'jam/jquery-textext/src/js/textext.plugin.prompt.js',
  'jam/jquery-textext/src/js/textext.plugin.suggestions.js',
  'jam/jquery-textext/src/js/textext.plugin.tags.js'
], function($, Patterns) {
  

  var AutocompleteItemManager = function() {};
  AutocompleteItemManager.prototype = {
    // Initialization method called by the core during instantiation.
    init: function(core) {
    },

    // Filters out items from the list that don't match the query and returns
    // remaining items. Default implementation checks if the item starts with the
    // query.
    filter: function(list, query) {
      var result = [],
          i, item;

      for (i = 0; i < list.length; i+=1) {
        item = list[i];
        if (this.itemContains(item, query)) {
          result.push(item);
        }
      }

      return result;
    },

    // Returns `true` if specified item contains another string, `false`
    // otherwise. In the default implementation `String.indexOf()` is used to
    // check if item string begins with the needle string.
    itemContains: function(item, needle) {
      return this.itemToString(item).toLowerCase()
                      .indexOf(needle.toLowerCase()) === 0;
    },

    // Converts specified string to item. Because default implemenation works
    // with string, input string is simply returned back. To use custom objects,
    // different implementation of this method could return something like `{
    // name : {String} }`.
    stringToItem: function(str) {
      return str;
    },

    // Converts specified item to string. Because default implemenation works
    // with string, input string is simply returned back. To use custom objects,
    // different implementation of this method could for example return `name`
    // field of `{ name : {String} }`.
    itemToString: function(item) {
      return item;
    },

    // Returns `true` if both items are equal, `false` otherwise. Because default
    // implemenation works with string, input items are compared as strings. To
    // use custom objects, different implementation of this method could for
    // example compare `name` fields of `{ name : {String} }` type object.
    compareItems: function(item1, item2) {
      return item1 === item2;
    }
  };

  var Autocomplete = Patterns.Base.extend({
    name: 'autocomplete',
    jqueryPlugin: 'patternAutocomplete',
    defaults: {
      createItems: true,
      plugins: 'autocomplete tags ajax prompt focus arrow',
      'prompt': 'Add...',
      ajaxDataType: 'json',
      ajaxCacheResults: true
    },
    init: function() {
      var self = this;

      self.options = $.extend({}, self.defaults, self.options);

      self.textextOptions = {
        itemManager: AutocompleteItemManager,
        tagsItems: JSON.parse(self.$el.val()),
        plugins: self.options.plugins,
        'prompt': self.options['prompt'],
        ext: {
          core: {
            onSetFormData: function(e, data) {
              $.each(data, function(i, item) {
                data[i] = item.trim();
              });
              this.hiddenInput().val(this.serializeData(data));
            }
          },
          autocomplete: {
            onSetSuggestions: function(e, data) {
              var suggestions = [],
                  old_suggestions = this._suggestions = data.result,
                  existing = JSON.parse(self.$el.textext()[0].hiddenInput().val());

              $.each(old_suggestions, function(i, item) {
                if ($.inArray(item, existing) === -1) {
                  suggestions.push(item);
                }
              });

              this._suggestions = suggestions;
              if(data.showHideDropdown !== false) {
                this.trigger(suggestions === null || suggestions.length === 0 ? 'hideDropdown': 'showDropdown');
              }
            }
          },
          tags: {
            onIsTagAllowed: function(e, data) {
              data.result = false;
              if (this.isValueAllowed(data.tag) &&
                  $.inArray(data.tag.trim(), JSON.parse(self.$el.textext()[0].hiddenInput().val())) !== -1) {
                data.result = true;
                if (!self.options.createItems && $.inArray(data.tag, this._suggestions) !== 1) {
                  data.result = false;
                }
              }
            }
          }
        }
      };
      if (self.options.ajaxUrl) {
        $.extend(self.textextOptions, {
          ajax : {
            url: self.options.ajaxUrl,
            dataType: self.options.ajaxDataType,
            cacheResults:  self.options.ajaxCacheResults,
            dataCallback: function(query) {
              return { 'query': query };
            }
          }
        });
      }
      self.$el.val('');

      if (!self.$el.is(':visible')) {
        var $fieldset = self.$el.parents(':hidden').last().show();
        self.$el.textext(self.textextOptions);
        $fieldset.hide();
      } else {
        self.$el.textext(self.textextOptions);
      }
    }
  });

  Patterns.register(Autocomplete);

  return Autocomplete;

});

/*!
 * pickadate.js v2.0.6 - 20 January, 2013
 * By Amsul (http://amsul.ca)
 * Hosted on https://github.com/amsul/pickadate.js
 * Licensed under MIT ("expat" flavour) license.
 */

/*jshint
   debug: true,
   devel: true,
   browser: true,
   asi: true,
   unused: true,
   eqnull: true
 */



;(function( $, document, undefined ) {

    



    var

        // Globals & constants
        DAYS_IN_WEEK = 7,
        WEEKS_IN_CALENDAR = 6,
        DAYS_IN_CALENDAR = WEEKS_IN_CALENDAR * DAYS_IN_WEEK,

        STRING_DIV = 'div',
        STRING_PREFIX_DATEPICKER = 'pickadate__',

        isIE = navigator.userAgent.match( /MSIE/ ),

        $document = $( document ),

        $body = $( document.body ),


        /**
         * The picker constructor that acceps the
         * jQuery element and the merged settings
         */
        Picker = function( $ELEMENT, SETTINGS ) {

            var
                // Pseudo picker constructor
                Picker = function() {},


                // The picker prototype
                P = Picker.prototype = {

                    constructor: Picker,

                    $node: $ELEMENT,

                    /**
                     * Initialize everything
                     */
                    init: function() {


                        // Bind all the events to the element,
                        // and then insert everything after it
                        $ELEMENT.on({
                            'focus click': function() {

                                // If it's not IE or it is IE and the calendar is not
                                // being force closed, then open the calendar
                                if ( !isIE || ( isIE && !CALENDAR._IE ) ) {
                                    P.open()
                                }

                                // Add the focused state to the holder
                                $HOLDER.addClass( CLASSES.focused )

                                // Then flip the IE force close to false
                                CALENDAR._IE = 0
                            },
                            blur: function() {
                                $HOLDER.removeClass( CLASSES.focused )
                            },
                            keydown: function( event ) {

                                var
                                    // Grab the keycode
                                    keycode = event.keyCode,

                                    // Check if one of the delete keys was pressed
                                    isKeycodeDelete = keycode == 8 || keycode == 46

                                // If backspace was pressed or the calendar
                                // is closed and the keycode warrants a date change,
                                // prevent it from going any further.
                                if ( isKeycodeDelete || !CALENDAR.isOpen && KEYCODE_TO_DATE[ keycode ] ) {

                                    // Prevent it from moving the page
                                    event.preventDefault()

                                    // Prevent it from propagating to document
                                    event.stopPropagation()

                                    // If backspace was pressed, clear the values
                                    // and then close the picker
                                    if ( isKeycodeDelete ) {
                                        P.clear().close()
                                    }

                                    // Otherwise open the calendar
                                    else {
                                        P.open()
                                    }
                                }
                            }
                        }).after( [ $HOLDER, ELEMENT_HIDDEN ] )


                        // If the element has autofocus, open the calendar
                        if ( ELEMENT.autofocus ) {
                            P.open()
                        }


                        // Do stuff after rendering the calendar
                        postRender()


                        // Trigger the onStart method within scope of the picker
                        triggerFunction( SETTINGS.onStart, P )


                        return P
                    }, //init


                    /**
                     * Open the calendar
                     */
                    open: function() {

                        // If it's already open, do nothing
                        if ( CALENDAR.isOpen ) return P


                        // Set calendar as open
                        CALENDAR.isOpen = true


                        // Toggle the tabindex of "focusable" calendar items
                        toggleCalendarElements( 0 )


                        // Make sure the element has focus and then
                        // add the "active" class to the element
                        $ELEMENT.focus().addClass( CLASSES.inputActive )

                        // Add the "opened" class to the calendar holder
                        $HOLDER.addClass( CLASSES.opened )

                        // Add the "active" class to the body
                        $body.addClass( CLASSES.bodyActive )


                        // Bind all the events to the document
                        // while namespacing it with the calendar ID
                        $document.on( 'focusin.P' + CALENDAR.id, function( event ) {

                            // If the target is not within the holder,
                            // and is not the element, then close the picker
                            if ( !$HOLDER.find( event.target ).length && event.target != ELEMENT ) P.close()

                        }).on( 'click.P' + CALENDAR.id, function( event ) {

                            // If the target of the click is not the element,
                            // then close the calendar picker
                            // * We don't worry about clicks on the holder
                            //   because those are stopped from bubbling to the doc
                            if ( event.target != ELEMENT ) P.close()

                        }).on( 'keydown.P' + CALENDAR.id, function( event ) {

                            var
                                // Get the keycode
                                keycode = event.keyCode,

                                // Translate that to a date change
                                keycodeToDate = KEYCODE_TO_DATE[ keycode ]


                            // On escape
                            if ( keycode == 27 ) {

                                // Focus back onto the element
                                ELEMENT.focus()

                                // Then close the picker
                                P.close()
                            }


                            // If the target is the element and there's
                            // a keycode to date translation or the
                            // enter key was pressed
                            else if ( event.target == ELEMENT && ( keycodeToDate || keycode == 13 ) ) {

                                // Prevent the default action to stop
                                // it from moving the page
                                event.preventDefault()

                                // If the keycode translates to a date change
                                if ( keycodeToDate ) {

                                    // Set the selected date by creating new validated
                                    // dates - incrementing by the date change.
                                    // And make this just a superficial selection.
                                    // * Truthy second argument makes it a superficial selection
                                    setDateSelected( createValidatedDate( [ MONTH_FOCUSED.YEAR, MONTH_FOCUSED.MONTH, DATE_HIGHLIGHTED.DATE + keycodeToDate ], keycodeToDate ), 1 )
                                }

                                // On enter
                                else {

                                    // Set the element value as the highlighted date
                                    setElementsValue( DATE_HIGHLIGHTED )

                                    // Render a new calendar
                                    calendarRender()

                                    // And then close it
                                    P.close()
                                }

                            } //if ELEMENT
                        })


                        // Trigger the onOpen method within scope of the picker
                        triggerFunction( SETTINGS.onOpen, P )

                        return P
                    }, //open


                    /**
                     * Close the calendar
                     */
                    close: function() {

                        // If it's already closed, do nothing
                        if ( !CALENDAR.isOpen ) return P


                        // Set calendar as closed
                        CALENDAR.isOpen = false


                        // Toggle the tabindex of "focusable" calendar items
                        toggleCalendarElements( -1 )


                        // Remove the "active" class from the element
                        $ELEMENT.removeClass( CLASSES.inputActive )

                        // Remove the "opened" class from the calendar holder
                        $HOLDER.removeClass( CLASSES.opened )

                        // Remove the "active" class from the body
                        $body.removeClass( CLASSES.bodyActive )


                        // Unbind the Picker events from the document
                        $document.off( '.P' + CALENDAR.id )


                        // Trigger the onClose method within scope of the picker
                        triggerFunction( SETTINGS.onClose, P )

                        return P
                    }, //close


                    /**
                     * Show a month in focus with 0index compensation
                     */
                    show: function( month, year ) {
                        showMonth( --month, year )
                        return P
                    }, //show


                    /**
                     * Clear the value of the input elements
                     */
                    clear: function() {

                        // Clear the elements value
                        setElementsValue( 0 )

                        // Render a new calendar
                        calendarRender()

                        return P
                    }, //clear


                    /**
                     * Get a date in any format.
                     * Defaults to getting the selected date
                     */
                    getDate: function( format ) {

                        // If the element has no value,
                        // just return an empty string
                        if ( !ELEMENT.value ) {
                            return ''
                        }

                        // If the format is a literal true,
                        // return the underlying JS Date object
                        if ( format === true ) {
                            return DATE_SELECTED.OBJ
                        }

                        // Otherwise return the formatted date
                        return getDateFormatted( format )
                    }, //getDate


                    /**
                     * Set the date with month 0index compensation
                     * and an option to do a superficial selection
                     */
                    setDate: function( year, month, date, isSuperficial ) {

                        // Compensate for month 0index and create a validated date.
                        // Then set it as the date selected
                        setDateSelected( createValidatedDate([ year, --month, date ]), isSuperficial )

                        return P
                    }, //setDate


                    /**
                     * Get the min or max date based on
                     * the argument being truthy or falsey
                     */
                    getDateLimit: function( upper, format ) {

                        // Get the max or min date depending on the `upper` flag
                        return getDateFormatted( format, upper ? DATE_MAX : DATE_MIN )
                    }, //getDateLimit


                    /**
                     * Set the min or max date based on second
                     * argument being truthy or falsey.
                     */
                    setDateLimit: function( limit, upper ) {

                        // If it's the upper limit
                        if ( upper ) {

                            // Set the max date
                            DATE_MAX = createBoundaryDate( limit, upper )

                            // If focused month is more than max date set it to max date
                            if ( MONTH_FOCUSED.TIME > DATE_MAX.TIME ) {
                                MONTH_FOCUSED = DATE_MAX
                            }
                        }

                        // Otherwise it's the lower limit
                        else {

                            // So set the min date
                            DATE_MIN = createBoundaryDate( limit )

                            // If focused month is less than min date set it to min date
                            if ( MONTH_FOCUSED.TIME < DATE_MIN.TIME ) {
                                MONTH_FOCUSED = DATE_MIN
                            }
                        }

                        // Render a new calendar
                        calendarRender()

                        return P
                    } //setDateLimit
                }, //Picker.prototype


                // The element node
                ELEMENT = (function( element ) {

                    // Confirm the focus state, convert the element into
                    // a regular text input to remove user-agent stylings,
                    // and then set it as readonly to prevent keyboard popup
                    element.autofocus = ( element == document.activeElement )
                    element.type = 'text'
                    element.readOnly = true
                    return element
                })( $ELEMENT[ 0 ] ), //ELEMENT


                // The calendar object
                CALENDAR = {
                    id: ~~( Math.random() * 1e9 )
                }, //CALENDAR


                // The classes
                CLASSES = SETTINGS.klass,


                // The date in various formats
                DATE_FORMATS = (function() {

                    // Get the length of the first word
                    function getFirstWordLength( string ) {
                        return string.match( /\w+/ )[ 0 ].length
                    }

                    // If the second character is a digit, length is 2 otherwise 1.
                    function getDigitsLength( string ) {
                        return ( /\d/ ).test( string[ 1 ] ) ? 2 : 1
                    }

                    // Get the length of the month from a string
                    function getMonthLength( string, dateObj, collection ) {

                        // Grab the first word
                        var word = string.match( /\w+/ )[ 0 ]

                        // If there's no index for the date object's month,
                        // find it in the relevant months collection and add 1
                        // because we subtract 1 when we create the date object
                        if ( !dateObj.mm && !dateObj.m ) {
                            dateObj.m = collection.indexOf( word ) + 1
                        }

                        // Return the length of the word
                        return word.length
                    }


                    // Return the date formats object
                    return {
                        d: function( string ) {

                            // If there's string, then get the digits length.
                            // Otherwise return the selected date.
                            return string ? getDigitsLength( string ) : this.DATE
                        },
                        dd: function( string ) {

                            // If there's a string, then the length is always 2.
                            // Otherwise return the selected date with a leading zero.
                            return string ? 2 : leadZero( this.DATE )
                        },
                        ddd: function( string ) {

                            // If there's a string, then get the length of the first word.
                            // Otherwise return the short selected weekday.
                            return string ? getFirstWordLength( string ) : SETTINGS.weekdaysShort[ this.DAY ]
                        },
                        dddd: function( string ) {

                            // If there's a string, then get the length of the first word.
                            // Otherwise return the full selected weekday.
                            return string ? getFirstWordLength( string ) : SETTINGS.weekdaysFull[ this.DAY ]
                        },
                        m: function( string ) {

                            // If there's a string, then get the length of the digits
                            // Otherwise return the selected month with 0index compensation.
                            return string ? getDigitsLength( string ) : this.MONTH + 1
                        },
                        mm: function( string ) {

                            // If there's a string, then the length is always 2.
                            // Otherwise return the selected month with 0index and leading zero.
                            return string ? 2 : leadZero( this.MONTH + 1 )
                        },
                        mmm: function( string, dateObject ) {

                            var collection = SETTINGS.monthsShort

                            // If there's a string, get length of the relevant month string
                            // from the short months collection. Otherwise return the
                            // selected month from that collection.
                            return string ? getMonthLength( string, dateObject, collection ) : collection[ this.MONTH ]
                        },
                        mmmm: function( string, dateObject ) {

                            var collection = SETTINGS.monthsFull

                            // If there's a string, get length of the relevant month string
                            // from the full months collection. Otherwise return the
                            // selected month from that collection.
                            return string ? getMonthLength( string, dateObject, collection ) : collection[ this.MONTH ]
                        },
                        yy: function( string ) {

                            // If there's a string, then the length is always 2.
                            // Otherwise return the selected year by slicing out the first 2 digits.
                            return string ? 2 : ( '' + this.YEAR ).slice( 2 )
                        },
                        yyyy: function( string ) {

                            // If there's a string, then the length is always 4.
                            // Otherwise return the selected year.
                            return string ? 4 : this.YEAR
                        },

                        // Create an array by splitting the format passed
                        toArray: function( format ) { return format.split( /(?=\b)(d{1,4}|m{1,4}|y{4}|yy)+(\b)/g ) }

                    } //endreturn
                })(), //DATE_FORMATS


                // Create calendar object for today
                DATE_TODAY = createDate(),


                // Create the min date
                DATE_MIN = createBoundaryDate( SETTINGS.dateMin ),


                // Create the max date
                // * A truthy second argument creates max date
                DATE_MAX = createBoundaryDate( SETTINGS.dateMax, 1 ),


                // Create a collection of dates to disable
                DATES_TO_DISABLE = (function( datesCollection ) {

                    // If a collection was passed
                    // we need to create a calendar date object
                    if ( Array.isArray( datesCollection ) ) {

                        // If the "all" flag is true,
                        // remove the flag from the collection and
                        // flip the condition of which dates to disable
                        if ( datesCollection[ 0 ] === true ) {
                            CALENDAR.disabled = datesCollection.shift()
                        }

                        // Map through the dates passed
                        // and return the collection
                        return datesCollection.map( function( date ) {

                            // If the date is a number, return the date minus 1
                            // for weekday 0index plus the first day of the week
                            if ( !isNaN( date ) ) {
                                return --date + SETTINGS.firstDay
                            }

                            // Otherwise assume it's an array and fix the month 0index
                            --date[ 1 ]

                            // Then create and return the date,
                            // replacing it in the collection
                            return createDate( date )
                        })
                    }
                })( SETTINGS.datesDisabled ), //DATES_TO_DISABLE


                // Create a function that will filter through the dates
                // and return true if looped date is to be disabled
                DISABLED_DATES = (function() {

                    // Check if the looped date should be disabled
                    // based on the time being the same as a disabled date
                    // or the day index being within the collection
                    var isDisabledDate = function( date ) {
                        return this.TIME == date.TIME || DATES_TO_DISABLE.indexOf( this.DAY ) > -1
                    }


                    // If all calendar dates should be disabled,
                    // return a function that maps each date
                    // in the collection of dates to not disable.
                    // Otherwise check if this date should be disabled
                    return CALENDAR.disabled ? function( date, i, collection ) {

                            // Map the array of disabled dates
                            // and check if this is not one
                            return ( collection.map( isDisabledDate, this ).indexOf( true ) < 0 )
                        } : isDisabledDate
                })(), //DISABLED_DATES


                // Create calendar object for the highlighted day
                DATE_HIGHLIGHTED = (function( dateDataValue, dateEntered ) {

                    // If there a date `data-value`
                    if ( dateDataValue ) {

                        // Set the date entered to an empty object
                        dateEntered = {}

                        // Map through the submit format array
                        DATE_FORMATS.toArray( SETTINGS.formatSubmit ).map( function( formatItem ) {

                            // If the formatting length function exists, invoke it
                            // with the `data-value` and the date we are creating.
                            // Otherwise it's the length of the formatting item being mapped
                            var formattingLength = DATE_FORMATS[ formatItem ] ? DATE_FORMATS[ formatItem ]( dateDataValue, dateEntered ) : formatItem.length

                            // If the formatting length function exists, slice up
                            // the value and pass it into the date we're creating.
                            if ( DATE_FORMATS[ formatItem ] ) {
                                dateEntered[ formatItem ] = dateDataValue.slice( 0, formattingLength )
                            }

                            // Update the remainder of the string by slicing away the format length
                            dateDataValue = dateDataValue.slice( formattingLength )
                        })

                        // Finally, create an array with the date entered while
                        // parsing each item as an integer and compensating for 0index
                        dateEntered = [ +(dateEntered.yyyy || dateEntered.yy), +(dateEntered.mm || dateEntered.m) - 1, +(dateEntered.dd || dateEntered.d) ]
                    }


                    // Otherwise, try to natively parse the date in the input
                    else {
                        dateEntered = Date.parse( dateEntered )
                    }


                    // If there's a valid date in the input or the dateEntered
                    // is now an array, create a validated date with it.
                    // Otherwise set the highlighted date to today after validating.
                    return createValidatedDate( dateEntered && ( !isNaN( dateEntered ) || Array.isArray( dateEntered ) ) ? dateEntered : DATE_TODAY )
                })( ELEMENT.getAttribute( 'data-value' ), ELEMENT.value ),


                // The date selected is initially the date highlighted
                DATE_SELECTED = DATE_HIGHLIGHTED,


                // Month focused is based on highlighted date
                MONTH_FOCUSED = DATE_HIGHLIGHTED,


                // If there's a format for the hidden input element, create the element
                // using the name of the original input plus suffix and update the value
                // with whatever is entered in the input on load. Otherwise set it to null.
                ELEMENT_HIDDEN = SETTINGS.formatSubmit ? $( '<input type=hidden name=' + ELEMENT.name + SETTINGS.hiddenSuffix + '>' ).val( ELEMENT.value ? getDateFormatted( SETTINGS.formatSubmit ) : '' )[ 0 ] : null,


                // Create the calendar table head with weekday labels
                // by "copying" the weekdays collection based on the settings.
                // * We do a copy so we don't mutate the original array.
                TABLE_HEAD = (function( weekdaysCollection ) {

                    // If the first day should be Monday
                    if ( SETTINGS.firstDay ) {

                        // Grab Sunday and push it to the end of the collection
                        weekdaysCollection.push( weekdaysCollection.splice( 0, 1 )[ 0 ] )
                    }

                    // Go through each day of the week
                    // and return a wrapped header row.
                    // Take the result and apply another
                    // table head wrapper to group it all.
                    return createNode( 'thead',
                        createNode( 'tr',
                            weekdaysCollection.map( function( weekday ) {
                                return createNode( 'th', weekday, CLASSES.weekdays )
                            })
                        )
                    )
                })( ( SETTINGS.showWeekdaysShort ? SETTINGS.weekdaysShort : SETTINGS.weekdaysFull ).slice( 0 ) ), //TABLE_HEAD


                // Create the calendar holder with a new wrapped calendar and bind the events
                $HOLDER = $( createNode( STRING_DIV, createCalendarWrapped(), CLASSES.holder ) ).on( 'mousedown', function( event ) {

                    // If the target of the event is not one of the calendar items,
                    // prevent default action to keep focus on the input element
                    if ( getCalendarItems().indexOf( event.target ) < 0 ) {
                        event.preventDefault()
                    }

                }).on( 'click', function( event ) {

                    var
                        dateToSelect,

                        // Get the jQuery target
                        $target = $( event.target ),

                        // Get the target data
                        targetData = $target.data()


                    // Stop the event from bubbling to the document
                    event.stopPropagation()


                    // Put focus back onto the element
                    ELEMENT.focus()

                    // For IE, set the calendar to force close
                    // * This needs to be after `ELEMENT.focus()`
                    CALENDAR._IE = 1


                    // If a navigator button was clicked,
                    // show the month in the relative direction
                    if ( targetData.nav ) {
                        showMonth( MONTH_FOCUSED.MONTH + targetData.nav )
                    }

                    // If a clear button was clicked,
                    // clear the elements value and then close it
                    else if ( targetData.clear ) {
                        P.clear().close()
                    }

                    // If a date was clicked
                    else if ( targetData.date ) {

                        // Split the target data into an array
                        dateToSelect = targetData.date.split( '/' )

                        // Set the date and then close the calendar
                        P.setDate( +dateToSelect[ 0 ], +dateToSelect[ 1 ], +dateToSelect[ 2 ] ).close()
                    }

                    // If the target is the holder, close the picker
                    else if ( $target[ 0 ] == $HOLDER[ 0 ] ) {
                        P.close()
                    }
                }), // $HOLDER


                // Translate a keycode to a relative change in date
                KEYCODE_TO_DATE = {

                    // Down
                    40: 7,

                    // Up
                    38: -7,

                    // Right
                    39: 1,

                    // Left
                    37: -1
                } //KEYCODE_TO_DATE



            /**
             * Create a bounding date allowed on the calendar
             * * A truthy second argument creates the upper boundary
             */
            function createBoundaryDate( limit, upper ) {

                // If the limit is set to true, just return today
                if ( limit === true ) {
                    return DATE_TODAY
                }

                // If the limit is an array, construct the date
                // while fixing month 0index
                if ( Array.isArray( limit ) ) {
                    --limit[ 1 ]
                    return createDate( limit )
                }

                // If there is a limit and its a number, create a
                // calendar date relative to today by adding the limit
                if ( limit && !isNaN( limit ) ) {
                    return createDate([ DATE_TODAY.YEAR, DATE_TODAY.MONTH, DATE_TODAY.DATE + limit ])
                }

                // Otherwise create an infinite date
                return createDate( 0, upper ? Infinity : -Infinity )
            } //createBoundaryDate


            /**
             * Create a validated date
             */
            function createValidatedDate( datePassed, direction ) {


                // If the date passed isn't a date, create one
                datePassed = !datePassed.TIME ? createDate( datePassed ) : datePassed


                // If there are disabled dates
                if ( DATES_TO_DISABLE ) {

                    // Create a reference to the original date passed
                    var originalDate = datePassed

                    // Check if this date is disabled. If it is,
                    // then keep adding the direction (or 1) to the date
                    // until we get to a date that's enabled.
                    while ( DATES_TO_DISABLE.filter( DISABLED_DATES, datePassed ).length ) {

                        // Create the next date based on the direction
                        datePassed = createDate([ datePassed.YEAR, datePassed.MONTH, datePassed.DATE + ( direction || 1 ) ])

                        // If we've looped through to another month,
                        // then increase/decrease the date by one and
                        // continue looping with the new original date
                        if ( datePassed.MONTH != originalDate.MONTH ) {
                            datePassed = createDate([ originalDate.YEAR, originalDate.MONTH, direction > 0 ? ++originalDate.DATE : --originalDate.DATE ])
                            originalDate = datePassed
                        }
                    }
                }


                // If it's less that min date, set it to min date
                // by creating a validated date by adding one
                // until we find an enabled date
                if ( datePassed.TIME < DATE_MIN.TIME ) {
                    datePassed = createValidatedDate( DATE_MIN )
                }


                // If it's more than max date, set it to max date
                // by creating a validated date by subtracting one
                // until we find an enabled date
                else if ( datePassed.TIME > DATE_MAX.TIME ) {
                    datePassed = createValidatedDate( DATE_MAX, -1 )
                }


                // Finally, return the date
                return datePassed
            } //createValidatedDate


            /**
             * Create the nav for next/prev month
             */
            function createMonthNav( next ) {

                // If the focused month is outside the range
                // return an empty string
                if ( ( next && MONTH_FOCUSED.YEAR >= DATE_MAX.YEAR && MONTH_FOCUSED.MONTH >= DATE_MAX.MONTH ) || ( !next && MONTH_FOCUSED.YEAR <= DATE_MIN.YEAR && MONTH_FOCUSED.MONTH <= DATE_MIN.MONTH ) ) {
                    return ''
                }

                var monthTag = 'month' + ( next ? 'Next' : 'Prev' )

                // Otherwise, return the created tag
                return createNode( STRING_DIV,
                    SETTINGS[ monthTag ],
                    CLASSES[ monthTag ],
                    'data-nav=' + ( next || -1 )
                ) //endreturn
            } //createMonthNav


            /**
             * Create the month label
             */
            function createMonthLabel( monthsCollection ) {


                // If there's a need for a month selector
                return SETTINGS.monthSelector ?

                    // Create the dom string node for a select element
                    createNode( 'select',

                        // Map through the months collection
                        monthsCollection.map( function( month, monthIndex ) {

                            // Create a dom string node for each option
                            return createNode( 'option',

                                // With the month and no classes
                                month, 0,

                                // Set the value and selected index
                                'value=' + monthIndex + ( MONTH_FOCUSED.MONTH == monthIndex ? ' selected' : '' ) +

                                // Plus the disabled attribute if it's outside the range
                                getMonthInRange( monthIndex, MONTH_FOCUSED.YEAR, ' disabled', '' )
                            )
                        }),

                        // The month selector class
                        CLASSES.selectMonth,

                        // And some tabindex
                        getTabindexState()

                    // Otherwise just return the month focused
                    ) : createNode( STRING_DIV, monthsCollection[ MONTH_FOCUSED.MONTH ], CLASSES.month )
            } //createMonthLabel


            /**
             * Create the year label
             */
            function createYearLabel() {

                var
                    yearFocused = MONTH_FOCUSED.YEAR,
                    yearsInSelector = SETTINGS.yearSelector


                // If there is a need for a years selector
                // then create a dropdown within the valid range
                if ( yearsInSelector ) {

                    // If year selector setting is true, default to 5.
                    // Otherwise divide the years in selector in half
                    // to get half before and half after
                    yearsInSelector = yearsInSelector === true ? 5 : ~~( yearsInSelector / 2 )

                    var
                        // Create a collection to hold the years
                        yearsCollection = [],

                        // The lowest year possible is the difference between
                        // the focused year and the number of years in the selector
                        lowestYear = yearFocused - yearsInSelector,

                        // The first year is the lower of the two numbers:
                        // the lowest year or the minimum year.
                        firstYear = getNumberInRange( lowestYear, DATE_MIN.YEAR ),

                        // The highest year is the sum of the focused year
                        // and the years in selector plus the left over years.
                        highestYear = yearFocused + yearsInSelector + ( firstYear - lowestYear ),

                        // The last year is the higher of the two numbers:
                        // the highest year or the maximum year.
                        lastYear = getNumberInRange( highestYear, DATE_MAX.YEAR, 1 )


                    // In case there are leftover years to put in the selector,
                    // we need to get the lower of the two numbers:
                    // the lowest year minus leftovers, or the minimum year
                    firstYear = getNumberInRange( lowestYear - ( highestYear - lastYear ), DATE_MIN.YEAR )


                    // Add the years to the collection by looping through the range
                    for ( var index = 0; index <= lastYear - firstYear; index += 1 ) {
                        yearsCollection.push( firstYear + index )
                    }


                    // Create the dom string node for a select element
                    return createNode( 'select',

                        // Map through the years collection
                        yearsCollection.map( function( year ) {

                            // Create a dom string node for each option
                            return createNode( 'option',

                                // With the year and no classes
                                year, 0,

                                // Set the value and selected index
                                'value=' + year + ( yearFocused == year ? ' selected' : '' )
                            )
                        }),

                        // The year selector class
                        CLASSES.selectYear,

                        // And some tabindex
                        getTabindexState()
                    )
                }


                // Otherwise just return the year focused
                return createNode( STRING_DIV, yearFocused, CLASSES.year )
            } //createYearLabel


            /**
             * Create the calendar table body
             */
            function createTableBody() {

                var
                    // The loop date object
                    loopDate,

                    // A pseudo index will be the divider between
                    // the previous month and the focused month
                    pseudoIndex,

                    // An array that will hold the classes
                    // and binding for each looped date
                    classAndBinding,

                    // Collection of the dates visible on the calendar
                    // * This gets discarded at the end
                    calendarDates = [],

                    // Weeks visible on the calendar
                    calendarWeeks = '',

                    // Count the number of days in the focused month
                    // by getting the 0-th date of the next month
                    countMonthDays = createDate([ MONTH_FOCUSED.YEAR, MONTH_FOCUSED.MONTH + 1, 0 ]).DATE,

                    // Count the days to shift the start of the month
                    // by getting the day the first of the month falls on
                    // and subtracting 1 to compensate for day 1index
                    // or 2 if "Monday" should be the first day.
                    countShiftby = createDate([ MONTH_FOCUSED.YEAR, MONTH_FOCUSED.MONTH, 1 ]).DAY + ( SETTINGS.firstDay ? -2 : -1 ),


                    // Set the class and binding for each looped date.
                    // Returns an array with 2 items:
                    // 1) The classes string
                    // 2) The data binding string
                    createDateClassAndBinding = function( loopDate, isMonthFocused ) {

                        var
                            // State check for date
                            isDateDisabled,

                            // Create a collection for the classes
                            // with the default classes already included
                            klassCollection = [

                                // The generic day class
                                CLASSES.day,

                                // The class for in or out of focus
                                ( isMonthFocused ? CLASSES.dayInfocus : CLASSES.dayOutfocus )
                            ]


                        // If it's less than the minimum date
                        // or greater than the maximum date
                        // or if there are dates to disable
                        // and this looped date is one of them
                        if ( loopDate.TIME < DATE_MIN.TIME || loopDate.TIME > DATE_MAX.TIME || ( DATES_TO_DISABLE && DATES_TO_DISABLE.filter( DISABLED_DATES, loopDate ).length ) ) {

                            // Make the state truthy
                            isDateDisabled = 1

                            // Add the disabled class
                            klassCollection.push( CLASSES.dayDisabled )
                        }


                        // If it's today, add the class
                        if ( loopDate.TIME == DATE_TODAY.TIME ) {
                            klassCollection.push( CLASSES.dayToday )
                        }


                        // If it's the highlighted date, add the class
                        if ( loopDate.TIME == DATE_HIGHLIGHTED.TIME ) {
                            klassCollection.push( CLASSES.dayHighlighted )
                        }


                        // If it's the selected date, add the class
                        if ( loopDate.TIME == DATE_SELECTED.TIME ) {
                            klassCollection.push( CLASSES.daySelected )
                        }


                        // Return an array with the classes and data binding
                        return [

                            // Return the classes joined
                            // by a single whitespace
                            klassCollection.join( ' ' ),

                            // Create the data binding object
                            // with the value as a string
                            'data-' + ( isDateDisabled ? 'disabled' : 'date' ) + '=' + [
                                loopDate.YEAR,
                                loopDate.MONTH + 1, // add 1 to display an accurate date
                                loopDate.DATE
                            ].join( '/' )
                        ]
                    } //createDateClassAndBinding


                // If the count to shift by is less than the first day
                // of the month, then add a week.
                countShiftby += countShiftby < -1 ? 7 : 0


                // Go through all the days in the calendar
                // and map a calendar date
                for ( var index = 0; index < DAYS_IN_CALENDAR; index += 1 ) {

                    // Get the distance between the index and the count
                    // to shift by. This will serve as the separator
                    // between the previous, current, and next months.
                    pseudoIndex = index - countShiftby


                    // Create a calendar date with a negative or positive pseudoIndex
                    loopDate = createDate([ MONTH_FOCUSED.YEAR, MONTH_FOCUSED.MONTH, pseudoIndex ])


                    // Set the date class and bindings on the looped date.
                    // If the pseudoIndex is greater than zero,
                    // and less or equal to the days in the month,
                    // we need dates from the focused month.
                    classAndBinding = createDateClassAndBinding( loopDate, ( pseudoIndex > 0 && pseudoIndex <= countMonthDays ) )


                    // Create the looped date wrapper,
                    // and then create the table cell wrapper
                    // and finally pass it to the calendar array
                    calendarDates.push( createNode( 'td', createNode( STRING_DIV, loopDate.DATE, classAndBinding[ 0 ], classAndBinding[ 1 ] ) ) )


                    // Check if it's the end of a week.
                    // * We add 1 for 0index compensation
                    if ( ( index % DAYS_IN_WEEK ) + 1 == DAYS_IN_WEEK ) {

                        // Wrap the week and append it into the calendar weeks
                        calendarWeeks += createNode( 'tr', calendarDates.splice( 0, DAYS_IN_WEEK ) )
                    }

                } //endfor



                // Join the dates and wrap the calendar body
                return createNode( 'tbody', calendarWeeks, CLASSES.body )
            } //createTableBody


            /**
             * Create the "today" and "clear" buttons
             */
            function createTodayAndClear() {

                // Create and return the button nodes
                return createNode( 'button', SETTINGS.today, CLASSES.buttonToday, 'data-date=' + getDateFormatted( 'yyyy/mm/dd', DATE_TODAY ) + ' ' + getTabindexState() ) + createNode( 'button', SETTINGS.clear, CLASSES.buttonClear, 'data-clear=1 ' + getTabindexState() )
            } //createTodayAndClear


            /**
             * Create the wrapped calendar
             * using the collection of calendar items
             * and creating a new table body
             */
            function createCalendarWrapped() {

                // Create a calendar wrapper node
                return createNode( STRING_DIV,

                    // Create a calendar frame
                    createNode( STRING_DIV,

                        // Create a calendar box node
                        createNode( STRING_DIV,

                            // The calendar header
                            createNode( STRING_DIV,

                                // The prev/next month tags
                                // * Truthy argument creates "next" tag
                                createMonthNav() + createMonthNav( 1 ) +

                                // Create the month label
                                createMonthLabel( SETTINGS.showMonthsFull ? SETTINGS.monthsFull : SETTINGS.monthsShort ) +

                                // Create the year label
                                createYearLabel(),

                                // The header class
                                CLASSES.header
                             ) +

                            // The calendar table with table head
                            // and a new calendar table body
                            createNode( 'table', [ TABLE_HEAD, createTableBody() ], CLASSES.table ) +

                            // Create the "today" and "clear" buttons
                            createNode( STRING_DIV, createTodayAndClear(), CLASSES.footer ),

                            // Calendar class
                            CLASSES.calendar
                        ),

                        // Calendar wrap class
                        CLASSES.wrap
                    ),

                    // Calendar frame class
                    CLASSES.frame
                ) //endreturn
            } //calendarWrapped


            /**
             * Get the number that's allowed within an
             * upper or lower limit. A truthy third argument
             * tests against the upper limit.
             */
            function getNumberInRange( number, limit, upper ) {

                // If we need to test against the upper limit
                // and number is less than the limit,
                // or we need to test against the lower limit
                // and number is more than the limit,
                // return the number. Otherwise return the limit.
                return ( upper && number < limit ) || ( !upper && number > limit ) ? number : limit
            } //getNumberInRange


            /**
             * Return a month by comparing with the date range.
             * If outside the range, returns the value passed.
             * Otherwise returns the "in range" value or the month itself.
             */
            function getMonthInRange( month, year, alternateValue, inRangeValue ) {

                // If the month is less than the min month,
                // then return the alternate value or min month.
                if ( year <= DATE_MIN.YEAR && month < DATE_MIN.MONTH ) {
                    return alternateValue || DATE_MIN.MONTH
                }

                // If the month is more than the max month,
                // then return the alternate value or max month.
                if ( year >= DATE_MAX.YEAR && month > DATE_MAX.MONTH ) {
                    return alternateValue || DATE_MAX.MONTH
                }

                // Otherwise return the "in range" value
                // or the month itself.
                // * We test `inRangeValue` against null
                //   because we need to test against null
                //   and undefined. 0 should be allowed.
                return inRangeValue != null ? inRangeValue : month
            } //getMonthInRange


            /**
             * Get the tabindex based on the calendar open/closed state
             */
            function getTabindexState() {
                return 'tabindex=' + ( CALENDAR.isOpen ? 0 : -1 )
            }


            /**
             * Get any date in any format. Defaults to getting
             * the superficially selected date.
             */
            function getDateFormatted( format, date ) {

                // Otherwise go through the date formats array and
                // convert the format passed into an array to map
                // which we join into a string at the end.
                return DATE_FORMATS.toArray( format || SETTINGS.format ).map( function( value ) {

                    // Trigger the date formats function
                    // or just return value itself.
                    return triggerFunction( DATE_FORMATS[ value ], date || DATE_SELECTED ) || value
                }).join( '' )
            } //getDateFormatted


            /**
             * Set a date as selected or superficially selected
             */
            function setDateSelected( dateTargeted, isSuperficial ) {

                // Set the target as the highlight
                DATE_HIGHLIGHTED = dateTargeted

                // Set the target as the focus
                MONTH_FOCUSED = dateTargeted

                // If it's not just a superficial selection,
                // update the input elements values
                if ( !isSuperficial ) {
                    setElementsValue( dateTargeted )
                }

                // Then render a new calendar
                calendarRender()
            } //setDateSelected


            /**
             * Set the date in the input element and hidden input
             */
            function setElementsValue( dateTargeted ) {

                // If there's a date targeted, update the selected date
                DATE_SELECTED = dateTargeted || DATE_SELECTED

                // Set the element value as the formatted date
                // if there was a date targeted. Otherwise clear it.
                // And then broadcast a change event.
                $ELEMENT.val( dateTargeted ? getDateFormatted() : '' ).trigger( 'change' )

                // If there's a hidden input, set the value with the submit format
                // if there's a date targeted. Otherwise clear it.
                if ( ELEMENT_HIDDEN ) {
                    ELEMENT_HIDDEN.value = dateTargeted ? getDateFormatted( SETTINGS.formatSubmit ) : ''
                }

                // Trigger the onSelect method within scope of the picker
                triggerFunction( SETTINGS.onSelect, P )
            } //setElementsValue


            /**
             * Find something within the calendar holder
             */
            function $findInHolder( klass ) {
                return $HOLDER.find( '.' + klass )
            } //$findInHolder


            /**
             * Show the month visible on the calendar
             */
            function showMonth( month, year ) {

                // Ensure we have a year to work with
                year = year || MONTH_FOCUSED.YEAR

                // Get the month to be within
                // the minimum and maximum date limits
                month = getMonthInRange( month, year )

                // Set the month to show in focus
                // * We set the date to 1st of the month
                //   because date doesn't matter here
                MONTH_FOCUSED = createDate([ year, month, 1 ])

                // Then render a new calendar
                calendarRender()
            } //showMonth


            /**
             * Toggle the calendar elements as "tab-able"
             */
            function toggleCalendarElements( tabindex ) {

                // Create a collection of calendar items and
                // set each items tabindex
                getCalendarItems().map( function( item ) {
                    if ( item ) item.tabIndex = tabindex
                })
            } //toggleCalendarElements


            /**
             * Return a collection of all the calendar items
             */
            function getCalendarItems() {
                return [
                    CALENDAR.selectMonth,
                    CALENDAR.selectYear,
                    $findInHolder( CLASSES.buttonToday )[ 0 ],
                    $findInHolder( CLASSES.buttonClear )[ 0 ]
                ]
            } //getCalendarItems


            /**
             * Render a new calendar
             */
            function calendarRender() {

                // Create a new wrapped calendar
                // and place it within the holder
                $HOLDER.html( createCalendarWrapped() )

                // Do stuff after rendering the calendar
                postRender()
            } //calendarRender


            /**
             * Stuff to do after a calendar has been rendered
             */
            function postRender() {

                // Find and store the month selector
                CALENDAR.selectMonth = $findInHolder( CLASSES.selectMonth ).on({

                    // *** For iOS ***
                    click: function( event ) { event.stopPropagation() },

                    // Bind the change event
                    change: function() {

                        // Show the month based on the option selected
                        // while parsing as a float
                        showMonth( +this.value )

                        // Find the new month selector and focus back on it
                        $findInHolder( CLASSES.selectMonth ).focus()
                    }
                })[ 0 ]

                // Find and store the year selector
                CALENDAR.selectYear = $findInHolder( CLASSES.selectYear ).on({

                    // *** For iOS ***
                    click: function( event ) { event.stopPropagation() },

                    // Bind the change event
                    change: function() {

                        // Show the year based on the option selected
                        // and month currently in focus while parsing as a float
                        showMonth( MONTH_FOCUSED.MONTH, +this.value )

                        // Find the new year selector and focus back on it
                        $findInHolder( CLASSES.selectYear ).focus()
                    }
                })[ 0 ]
            } //postRender


            // Return a new initialized picker
            return new P.init()
        } //Picker





    /**
     * Helper functions
     */

    // Check if a value is a function and trigger it, if that
    function triggerFunction( callback, scope ) {
        if ( typeof callback == 'function' ) {
            return callback.call( scope )
        }
    }

    // Return numbers below 10 with a leading zero
    function leadZero( number ) {
        return ( number < 10 ? '0': '' ) + number
    }

    // Create a dom node string
    function createNode( wrapper, item, klass, attribute ) {

        // If the item is false-y, just return an empty string
        if ( !item ) return ''

        // If the item is an array, do a join
        item = Array.isArray( item ) ? item.join( '' ) : item

        // Check for the class
        klass = klass ? ' class="' + klass + '"' : ''

        // Check for any attributes
        attribute = attribute ? ' ' + attribute : ''

        // Return the wrapped item
        return '<' + wrapper + klass + attribute + '>' + item + '</' + wrapper + '>'
    } //createNode

    // Create a calendar date
    function createDate( datePassed, unlimited ) {

        // If the date passed is an array
        if ( Array.isArray( datePassed ) ) {

            // Create the date
            datePassed = new Date( datePassed[ 0 ], datePassed[ 1 ], datePassed[ 2 ] )
        }

        // If the date passed is a number
        else if ( !isNaN( datePassed ) ) {

            // Create the date
            datePassed = new Date( datePassed )
        }


        // Otherwise if it's not unlimited
        else if ( !unlimited ) {

            // Set the date to today
            datePassed = new Date()

            // Set the time to midnight (for comparison purposes)
            datePassed.setHours( 0, 0, 0, 0 )
        }


        // Return the calendar date object
        return {
            YEAR: unlimited || datePassed.getFullYear(),
            MONTH: unlimited || datePassed.getMonth(),
            DATE: unlimited || datePassed.getDate(),
            DAY: unlimited || datePassed.getDay(),
            TIME: unlimited || datePassed.getTime(),
            OBJ: unlimited || datePassed
        }
    } //createDate




    /**
     * Extend jQuery
     */
    $.fn.pickadate = function( options ) {

        var pickadate = 'pickadate'

        // Merge the options with a deep copy
        options = $.extend( true, {}, $.fn.pickadate.defaults, options )

        // Check if it should be disabled
        // for browsers that natively support `type=date`
        if ( options.disablePicker ) { return this }

        return this.each( function() {
            var $this = $( this )
            if ( this.nodeName == 'INPUT' && !$this.data( pickadate ) ) {
                $this.data( pickadate, new Picker( $this, options ) )
            }
        })
    } //$.fn.pickadate



    /**
     * Default options for the picker
     */
    $.fn.pickadate.defaults = {

        monthsFull: [ 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December' ],
        monthsShort: [ 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec' ],

        weekdaysFull: [ 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday' ],
        weekdaysShort: [ 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat' ],

        // Display strings
        monthPrev: '&#9664;',
        monthNext: '&#9654;',
        showMonthsFull: 1,
        showWeekdaysShort: 1,

        // Today and clear
        today: 'Today',
        clear: 'Clear',

        // Date format to show on the input element
        format: 'd mmmm, yyyy',

        // Date format to send to the server
        formatSubmit: 0,

        // Hidden element name suffix
        hiddenSuffix: '_submit',

        // First day of the week: 0 = Sunday, 1 = Monday
        firstDay: 0,

        // Month & year dropdown selectors
        monthSelector: 0,
        yearSelector: 0,

        // Date ranges
        dateMin: 0,
        dateMax: 0,

        // Dates to disable
        datesDisabled: 0,

        // Disable for browsers with native date support
        disablePicker: 0,

        // Events
        onOpen: 0,
        onClose: 0,
        onSelect: 0,
        onStart: 0,


        // Classes
        klass: {

            bodyActive: STRING_PREFIX_DATEPICKER + 'active',

            inputActive: STRING_PREFIX_DATEPICKER + 'input--active',

            holder: STRING_PREFIX_DATEPICKER + 'holder',
            opened: STRING_PREFIX_DATEPICKER + 'holder--opened',
            focused: STRING_PREFIX_DATEPICKER + 'holder--focused',

            frame: STRING_PREFIX_DATEPICKER + 'frame',
            wrap: STRING_PREFIX_DATEPICKER + 'wrap',

            calendar: STRING_PREFIX_DATEPICKER + 'calendar',

            table: STRING_PREFIX_DATEPICKER + 'table',

            header: STRING_PREFIX_DATEPICKER + 'header',

            monthPrev: STRING_PREFIX_DATEPICKER + 'nav--prev',
            monthNext: STRING_PREFIX_DATEPICKER + 'nav--next',

            month: STRING_PREFIX_DATEPICKER + 'month',
            year: STRING_PREFIX_DATEPICKER + 'year',

            selectMonth: STRING_PREFIX_DATEPICKER + 'select--month',
            selectYear: STRING_PREFIX_DATEPICKER + 'select--year',

            weekdays: STRING_PREFIX_DATEPICKER + 'weekday',

            body: STRING_PREFIX_DATEPICKER + 'body',

            day: STRING_PREFIX_DATEPICKER + 'day',
            dayDisabled: STRING_PREFIX_DATEPICKER + 'day--disabled',
            daySelected: STRING_PREFIX_DATEPICKER + 'day--selected',
            dayHighlighted: STRING_PREFIX_DATEPICKER + 'day--highlighted',
            dayToday: STRING_PREFIX_DATEPICKER + 'day--today',
            dayInfocus: STRING_PREFIX_DATEPICKER + 'day--infocus',
            dayOutfocus: STRING_PREFIX_DATEPICKER + 'day--outfocus',

            footer: STRING_PREFIX_DATEPICKER + 'footer',

            buttonClear: STRING_PREFIX_DATEPICKER + 'button--clear',
            buttonToday: STRING_PREFIX_DATEPICKER + 'button--today'
        }
    } //$.fn.pickadate.defaults



})( jQuery, document );







define("jam/pickadate/source/pickadate", function(){});

// plone integration for pickadate.
//
// Author: Rok Garbas
// Contact: rok@garbas.si
// Version: 1.0
// Depends: jquery.js patterns.js pickadate.js
//
// Description:
//
// License:
//
// Copyright (C) 2010 Plone Foundation
//
// This program is free software; you can redistribute it and/or modify it
// under the terms of the GNU General Public License as published by the Free
// Software Foundation; either version 2 of the License.
//
// This program is distributed in the hope that it will be useful, but WITHOUT
// ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
// FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
// more details.
//
// You should have received a copy of the GNU General Public License along with
// this program; if not, write to the Free Software Foundation, Inc., 51
// Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
//

/*jshint bitwise:true, curly:true, eqeqeq:true, immed:true, latedef:true,
  newcap:true, noarg:true, noempty:true, nonew:true, plusplus:true,
  undef:true, strict:true, trailing:true, browser:true, evil:true */
/*global define:false */


define('js/pattern.calendar',[
  'jquery',
  'js/patterns',
  'jam/pickadate/source/pickadate'
], function($, Patterns, Pickadate, undefined) {
  

  var Calendar = Patterns.Base.extend({
    name: 'calendar',
    jqueryPlugin: 'patternCalendar',
    defaults: {
      klassWrapper: 'pattern-calendar',
      klassIcon: 'pattern-calendar-icon',
      klassYearInput: 'pattern-calendar-year',
      klassMonthInput: 'pattern-calendar-month',
      klassDayInput: 'pattern-calendar-day',
      klassHourInput: 'pattern-calendar-hour',
      klassMinuteInput: 'pattern-calendar-minute',
      klassAMPMInput: 'pattern-calendar-ampm',
      klassDelimiter: 'pattern-calendar-delimiter',
      format: 'd-mmmm-yyyy@HH:MM',
      formatSubmit: 'yyyy-m-d H:M',
      showAMPM: true,
      AMPM: ['AM', 'PM'],
      minuteStep: '5'
    },
    init: function() {
      var self = this;

      self.options = $.extend({}, self.defaults, self.options);

      self.pickadateOptions = $.extend({}, $.fn.pickadate.defaults, {
        monthSelector: true,
        yearSelector: true
      }, Patterns.getOptions(self.$el, 'pickadate'), {
        formatSubmit: 'yyyy-mm-dd',
        onOpen: function() {},
        onClose: function() {},
        onSelect: function(e) {
          var date = this.getDate('yyyy-mm-dd').split('-');
          self.$years.val(parseInt(date[0], 10));
          self.$months.val(parseInt(date[1], 10));
          self.$days.val(parseInt(date[2], 10));
          self.setDate(
            self.$years.val(),
            self.$months.val(),
            self.$days.val(),
            self.$hours.val(),
            self.$minutes.val(),
            self.$ampm.val()
          );
        }
      });

      self.$el.hide();

      self.$wrapper = $('<div/>')
        .addClass(self.options.klassWrapper)
        .appendTo(self.$el.parent());

      self.pickadate = $('<input/>')
        .hide().appendTo(self.$wrapper)
        .pickadate(self.pickadateOptions).data('pickadate');

      function changePickadateDate() {
        if (self.$years.val() !== '' &&
            self.$months.val() !== '' &&
            self.$days.val() !== '') {
          self.pickadate.setDate(
              parseInt(self.$years.val(), 10),
              parseInt(self.$months.val(), 10),
              parseInt(self.$days.val(), 10),
              true);
        }
        self.setDate(
          self.$years.val(),
          self.$months.val(),
          self.$days.val(),
          self.$hours.val(),
          self.$minutes.val(),
          self.$ampm.val()
        );
      }

      self.$years = $('<select/>')
        .addClass(self.options.klassYearInput)
        .on('change', changePickadateDate);
      self.$months = $('<select/>')
        .addClass(self.options.klassMonthInput)
        .on('change', changePickadateDate);
      self.$days = $('<select/>')
        .addClass(self.options.klassDayInput)
        .on('change', changePickadateDate);
      self.$hours = $('<select/>')
        .addClass(self.options.klassHourInput)
        .on('change', changePickadateDate);
      self.$minutes = $('<select/>')
        .addClass(self.options.klassMinuteInput)
        .on('change', changePickadateDate);
      self.$icon = $('<span class="' + self.options.klassIcon + '"/>')
        .on('click', function(e) {
          e.stopPropagation();
          e.preventDefault();
          self.toggle();
        });

      // append elements in correct order according to self.options.format
      $.each(self._strftime(self.options.format,
        function(format) {
          switch (format) {
            case 'yy':
            case 'yyyy':
              return self.$years.append(self._getYears(format));
            case 'm':
            case 'mm':
            case 'mmm':
            case 'mmmm':
              return self.$months.append(self._getMonths(format));
            case 'd':
            case 'dd':
            case 'ddd':
            case 'dddd':
              return self.$days.append(self._getDays(format));
            case 'H':
            case 'HH':
              return self.$hours.append(self._getHours(format));
            case 'M':
            case 'MM':
              return self.$minutes.append(self._getMinutes(format));
            case '@':
              return self.$icon;
            default:
              return $('<span> ' + format + ' </span>')
                .addClass(self.options.klassDelimiter);
          }
        }
      ), function(i, $item) {
        self.$wrapper.append($item);
      });

      self.$ampm = $('<select/>')
        .addClass(self.options.klassAMPMInput)
        .append(self._getAMPM())
        .on('change', changePickadateDate);
      if (self.options.showAMPM) {
        self.$wrapper.append($('<span> </span>'));
        self.$wrapper.append(self.$ampm);
      }

      // populate dropdowns and calendar
      // TODO: should be done with self._strtime
      if (self.$el.val() !== '') {
        var tmp = self.$el.val().split(' '),
            date = tmp[0].split('-'),
            time = tmp[1].split(':'),
            ampm = (parseInt(time[0], 10) >= 12) && 'PM' || 'AM';
        time[0] -= (parseInt(time[0], 10) >= 12) && 12 || 0;
        self.setDate(
            date[0], date[1], date[2],
            time[0], time[1], ampm
            );
        self.$years.val('' + parseInt(date[0], 10));
        self.$months.val('' + parseInt(date[1], 10));
        self.$days.val('' + parseInt(date[2], 10));
        self.$hours.val('' + parseInt(time[0], 10));
        self.$minutes.val('' + parseInt(time[1], 10));
        self.$ampm.val(ampm);
      }
    },
    _strftime: function(format, action, options) {
      var self = this, result = [];
      // Rule   | Result                    | Example
      // -------+---------------------------+--------------
      // yy     | Year - short              | 00-99
      // yyyy   | Year - full               | 2000-2999
      // m      | Month                     | 1-12
      // mm     | Month with leading zero   | 01-12
      // mmm    | Month name - short        | Jan-Dec
      // mmmm   | Month name - full         | January-December
      // d      | Day                       | 1-31
      // dd     | Date with leading zero    | 01-31
      // ddd    | Weekday - short           | Sun-Sat
      // dddd   | Weekday - full            | Sunday-Saturday
      // H      | Hour                      | 0-23
      // HH     | Hour with leading zero    | 00-23
      // M      | Minute                    | 0-59
      // MM     | Minute with leading zero  | 00-59
      // @      | Calendar icon
      options = options || [
        'dddd', 'ddd', 'dd', 'd',
        'mmmm', 'mmm', 'mm', 'm',
        'yyyy', 'yy',
        'HH', 'H',
        'MM', 'M',
        '@'];
      $.each(options, function(i, itemFormat) {
        if (format.indexOf(itemFormat) !== -1) {
          var temp = format.split(itemFormat), new_result;
          if (options.length > 0 && temp[0] !== '') {
            new_result = result.concat(self._strftime(temp[0], action, options.slice(i)));
            if (new_result.length === result.length) {
              result.push(action(temp[0]));
            } else {
              result = new_result;
            }
          }
          result.push(action(itemFormat));
          if (options.length > 0 && temp[1] !== '') {
            new_result = result.concat(self._strftime(temp[1], action, options.slice(i)));
            if (new_result.length === result.length) {
              result.push(action(temp[1]));
            } else {
              result = new_result;
            }
          }
          return false;
        }
        if (options.length === 0) {
          return false;
        }
      });
      return result;
    },
    _getYears: function(format) {
      var years = [],
          current = this.getDate('yyyy'),
          _current = current,
          min,
          max;
      if (!current) {
        current = (new Date()).getFullYear();
        min = current - 10;
        max = current + 10;
      } else {
        min = this.pickadate.getdatelimit('yyyy'),
        max = this.pickadate.getDateLimit(true, 'yyyy');
      }
      years.push(this._createOption('', '--', _current === undefined));
      while (min <= max) {
        if (format === 'yy') {
          years.push(this._createOption(min, ('' + min).slice(-2), min === _current));
        } else {
          years.push(this._createOption(min, min, min === _current));
        }
        min += 1;
      }
      return years;
    },
    _getMonths: function(format) {
      var months = [],
          current = this.getDate('m'),
          month = 1;
      months.push(this._createOption('', '--', current === undefined));
      while (month <= 12) {
        if (format === 'm') {
          months.push(this._createOption(month, month, current === month));
        } else if (format === 'mm') {
          months.push(this._createOption(month,
              ('0' + month).slice(-2), current === month));
        } else if (format === 'mmm') {
          months.push(this._createOption(month,
              this.pickadateOptions.monthsShort[month - 1], current === month));
        } else {
          months.push(this._createOption(month,
              this.pickadateOptions.monthsFull[month - 1], current === month));
        }
        month += 1;
      }
      return months;
    },
    _getDays: function(format) {
      var days = [],
          current = this.getDate('d'),
          currentMonth = this.getDate('m'),
          maxDays = 31,
          day = 1;
      days.push(this._createOption('', '--', current === undefined));
      if (currentMonth) {
        if ($.inArray(currentMonth, [4, 6, 9, 11])) {
          maxDays = 30;
        } else if ($.inArray(currentMonth, [2])) {
          maxDays = 29;
        }
      }
      while (day <= maxDays) {
        if (format === 'd') {
          days.push(this._createOption(day, day, current === day));
        // formating of weekdays doesn't make sense in this case
        } else {
          days.push(this._createOption(day, ('0' + day).slice(-2), current === day));
        }
        day += 1;
      }
      return days;
    },
    _getAMPM: function() {
      return [
        this._createOption(this.options.AMPM[0], this.options.AMPM[0]),
        this._createOption(this.options.AMPM[1], this.options.AMPM[1])
        ];
    },
    _getHours: function(format) {
      var hours = [],
          current = this.getDate('h'),
          hour = 0;
      hours.push(this._createOption('', '--', current === undefined));
      while (hour < (this.options.showAMPM && 12 || 24)) {
        if (format === 'H') {
          hours.push(this._createOption(hour, hour, current === hour));
        } else {
          hours.push(this._createOption(hour, ('0' + hour).slice(-2), current === hour));
        }
        hour += 1;
      }
      return hours;
    },
    _getMinutes: function(format) {
      var minutes = [],
          current = this.getDate('m'),
          minute = 0;
      minutes.push(this._createOption('', '--', current === undefined));
      while (minute < 60) {
        if (format === 'M') {
          minutes.push(this._createOption(minute, minute, current === minute));
        } else {
          minutes.push(this._createOption(minute, ('0' + minute).slice(-2),
                current === minute));
        }
        minute += parseInt(this.options.minuteStep, 10);
      }
      return minutes;
    },
    _createOption: function(token, title, selected) {
      var $el = $('<option/>').attr('value', token).html(title);
      if (selected) {
        $el.attr('selected', 'selected');
      }
      return $el;
    },
    setDate: function(year, month, day, hour, minutes, ampm) {
      var self = this;
      self._rawDate = undefined;
      self.$el.attr('value', '');
      if (year !== '' &&
          month !== '' &&
          day !== '' &&
          hour !== '' &&
          minutes !== '') {
        self._rawDate = new Date(
          parseInt(year, 10),
          parseInt(month, 10),
          parseInt(day, 10),
          parseInt(hour, 10) + (ampm === 'PM' && 12 || 0),
          parseInt(minutes, 10)
          );
        self.$el.attr('value', self.getDate(self.options.formatSubmit));
      }
    },
    getDate: function(format) {
      var self = this;
      if (!self._rawDate) { return; }
      if (format) {
        return self._strftime(format, function(format) {
          switch (format) {
            case 'yy':
              return ('' + self._rawDate.getFullYear()).slice(-2);
            case 'yyyy':
              return '' + self._rawDate.getFullYear();
            case 'm':
              return '' + self._rawDate.getMonth();
            case 'mm':
              return ('0' + self._rawDate.getMonth()).slice(-2);
            case 'mmm':
              return self.pickadateOptions.monthsShort[self._rawDate.getMonth()];
            case 'mmmm':
              return self.pickadateOptions.monthsFull[self._rawDate.getMonth()];
            case 'd':
              return '' + self._rawDate.getDate();
            case 'dd':
              return ('0' + self._rawDate.getDate()).slice(-2);
            case 'ddd':
              return self.pickadateOptions.weekdaysShort[self._rawDate.getDay()];
            case 'dddd':
              return self.pickadateOptions.weekdaysFull[self._rawDate.getDay()];
            case 'H':
              return '' + self._rawDate.getHours();
            case 'HH':
              return ('0' + self._rawDate.getHours()).slice(-2);
            case 'M':
              return '' + self._rawDate.getMinutes();
            case 'MM':
              return ('0' + self._rawDate.getMinutes()).slice(-2);
            default:
              return format;
          }
        }).join('');
      }
      return self._rawDate;
    },
    toggle: function() {
      if (this._opened) {
        this.close();
      } else {
        this.open();
      }
    },
    open: function() {
      if (!this._opened) {
        this.pickadate.open();
        this._opened = true;
      }
    },
    close: function() {
      if (this._opened) {
        this.pickadate.close();
        this._opened = false;
      }
    }
  });


  Patterns.register(Calendar);

  return Calendar;

});

/* ===================================================
 * bootstrap-transition.js v2.2.2
 * http://twitter.github.com/bootstrap/javascript.html#transitions
 * ===================================================
 * Copyright 2012 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ========================================================== */


!function ($) {

   // jshint ;_;


  /* CSS TRANSITION SUPPORT (http://www.modernizr.com/)
   * ======================================================= */

  $(function () {

    $.support.transition = (function () {

      var transitionEnd = (function () {

        var el = document.createElement('bootstrap')
          , transEndEventNames = {
               'WebkitTransition' : 'webkitTransitionEnd'
            ,  'MozTransition'    : 'transitionend'
            ,  'OTransition'      : 'oTransitionEnd otransitionend'
            ,  'transition'       : 'transitionend'
            }
          , name

        for (name in transEndEventNames){
          if (el.style[name] !== undefined) {
            return transEndEventNames[name]
          }
        }

      }())

      return transitionEnd && {
        end: transitionEnd
      }

    })()

  })

}(window.jQuery);
define("jam/bootstrap/js/bootstrap-transition", function(){});

/* ========================================================
 * bootstrap-tab.js v2.2.2
 * http://twitter.github.com/bootstrap/javascript.html#tabs
 * ========================================================
 * Copyright 2012 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ======================================================== */


!function ($) {

   // jshint ;_;


 /* TAB CLASS DEFINITION
  * ==================== */

  var Tab = function (element) {
    this.element = $(element)
  }

  Tab.prototype = {

    constructor: Tab

  , show: function () {
      var $this = this.element
        , $ul = $this.closest('ul:not(.dropdown-menu)')
        , selector = $this.attr('data-target')
        , previous
        , $target
        , e

      if (!selector) {
        selector = $this.attr('href')
        selector = selector && selector.replace(/.*(?=#[^\s]*$)/, '') //strip for ie7
      }

      if ( $this.parent('li').hasClass('active') ) return

      previous = $ul.find('.active:last a')[0]

      e = $.Event('show', {
        relatedTarget: previous
      })

      $this.trigger(e)

      if (e.isDefaultPrevented()) return

      $target = $(selector)

      this.activate($this.parent('li'), $ul)
      this.activate($target, $target.parent(), function () {
        $this.trigger({
          type: 'shown'
        , relatedTarget: previous
        })
      })
    }

  , activate: function ( element, container, callback) {
      var $active = container.find('> .active')
        , transition = callback
            && $.support.transition
            && $active.hasClass('fade')

      function next() {
        $active
          .removeClass('active')
          .find('> .dropdown-menu > .active')
          .removeClass('active')

        element.addClass('active')

        if (transition) {
          element[0].offsetWidth // reflow for transition
          element.addClass('in')
        } else {
          element.removeClass('fade')
        }

        if ( element.parent('.dropdown-menu') ) {
          element.closest('li.dropdown').addClass('active')
        }

        callback && callback()
      }

      transition ?
        $active.one($.support.transition.end, next) :
        next()

      $active.removeClass('in')
    }
  }


 /* TAB PLUGIN DEFINITION
  * ===================== */

  var old = $.fn.tab

  $.fn.tab = function ( option ) {
    return this.each(function () {
      var $this = $(this)
        , data = $this.data('tab')
      if (!data) $this.data('tab', (data = new Tab(this)))
      if (typeof option == 'string') data[option]()
    })
  }

  $.fn.tab.Constructor = Tab


 /* TAB NO CONFLICT
  * =============== */

  $.fn.tab.noConflict = function () {
    $.fn.tab = old
    return this
  }


 /* TAB DATA-API
  * ============ */

  $(document).on('click.tab.data-api', '[data-toggle="tab"], [data-toggle="pill"]', function (e) {
    e.preventDefault()
    $(this).tab('show')
  })

}(window.jQuery);
define("jam/bootstrap/js/bootstrap-tab", function(){});

// tabs pattern.
//
// Author: Rok Garbas
// Contact: rok@garbas.si
// Version: 1.0
// Depends: jquery.js patterns.js bootstrap-transition.js bootstrap-tab.js
//
// Description:
//
// License:
//
// Copyright (C) 2010 Plone Foundation
//
// This program is free software; you can redistribute it and/or modify it
// under the terms of the GNU General Public License as published by the Free
// Software Foundation; either version 2 of the License.
//
// This program is distributed in the hope that it will be useful, but WITHOUT
// ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
// FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
// more details.
//
// You should have received a copy of the GNU General Public License along with
// this program; if not, write to the Free Software Foundation, Inc., 51
// Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
//

/*jshint bitwise:true, curly:true, eqeqeq:true, immed:true, latedef:true,
  newcap:true, noarg:true, noempty:true, nonew:true, plusplus:true,
  undef:true, strict:true, trailing:true, browser:true, evil:true */
/*global define:false */


define('js/pattern.tabs',[
  'jquery',
  'js/patterns',
  'jam/bootstrap/js/bootstrap-transition',
  'jam/bootstrap/js/bootstrap-tab'
], function($, Patterns, Tab, undefined) {
  

  var Tabs = Patterns.Base.extend({
    name: 'tabs',
    jqueryPlugin: 'patternTabs',
    defaults: {
    },
    init: function() {
      var self = this;

      self.options = $.extend({}, self.defaults, self.options);

      self.getTabs()
        .on('click', function(e) {
          e.preventDefault();
          $(this).tab('show');
        })
        .on('show', function(e) { self.show($(this)); })
        .on('hide', function(e) { self.hide($(this)); })
        .first().tab('show');
    },
    show: function($el) {
      this.getPanels().hide();
      this.getPanel($el).show();
    },
    hide: function($el) {
      this.getPanel($el).hide();
    },
    getTabs: function() {
      return this.$el.find('li > a');
    },
    getPanels: function() {
      var self = this, panels = [];
      $.each(self.getTabs(), function(i, el) {
        panels.push(self.getPanel($(el))[0]);
      });
      return $(panels);
    },
    getPanel: function($el) {
      var target = $el.attr('href');
      target = target && target.replace(/.*(?=#[^\s]*$)/, '');  //strip for ie7
      return $(target);
    }
  });

  Patterns.register(Tabs);

  return Tabs;

});

// tabs pattern.
//
// Author: Rok Garbas
// Contact: rok@garbas.si
// Version: 1.0
// Depends: jquery.js patterns.js bootstrap-transition.js bootstrap-tab.js
//
// Description:
//
// License:
//
// Copyright (C) 2010 Plone Foundation
//
// This program is free software; you can redistribute it and/or modify it
// under the terms of the GNU General Public License as published by the Free
// Software Foundation; either version 2 of the License.
//
// This program is distributed in the hope that it will be useful, but WITHOUT
// ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
// FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
// more details.
//
// You should have received a copy of the GNU General Public License along with
// this program; if not, write to the Free Software Foundation, Inc., 51
// Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
//

/*jshint bitwise:true, curly:true, eqeqeq:true, immed:true, latedef:true,
  newcap:true, noarg:true, noempty:true, nonew:true, plusplus:true,
  undef:true, strict:true, trailing:true, browser:true, evil:true */
/*global define:false */


define('js/pattern.toggle',[
  'jquery',
  'js/patterns'
], function($, Patterns, undefined) {


var Toggle = Patterns.Base.extend({
  name: 'toggle',
  jqueryPlugin: 'patternToggle',
  defaults: {
    attribute: 'class',
    event: 'click'
  },
  init: function() {
    var self = this;

    self.options = $.extend({}, self.defaults, self.options);

    if (!self.options.target) {
      self.$target = self.$el;
    } else {
      self.$target = self.$el.closest(self.options.target);
      if (self.$target.size() === 0) {
        self.$target = self.closest(self.$el, self.options.target);
      }
    }

    if (!self.$target) {
      $.error('No target found for "' + self.options.target + '".');
    }

    self.$el.on(self.options.event, function(e) {
      e.stopPropagation();
      if ($.nodeName(e.target, 'a') || $(e.target).parents('a').size() !== 0) {
        e.preventDefault();
      }
      self.toggle();
    });
  },
  closest: function($el, selector) {
    var self = this,
        $target = $(selector, $el);
    if ($target.size() === 0) {
      if ($el.size() === 0 || $.nodeName($el[0], 'body')) {
        return;
      }
      $target = self.closest($el.parent(), selector);
    }
    return $target;
  },
  isMarked: function() {
    var self = this;
    if (self.options.attribute === 'class') {
      return this.$target.hasClass(this.options.value);
    } else {
      return this.$target.attr(this.options.attribute) === this.options.value;
    }
  },
  toggle: function() {
    var self = this;
    if (self.isMarked()) {
      self.remove();
    } else {
      self.add();
    }
  },
  remove: function() {
    var self = this;
    self.$el.trigger('patterns.toggle.remove');
    if (self.options.attribute === 'class') {
      self.$target.removeClass(self.options.value);
    } else {
      self.$target.removeAttr(self.options.attribute);
    }
    self.$el.trigger('patterns.toggle.removed');
  },
  add: function() {
    var self = this;
    self.$el.trigger('patterns.toggle.add');
    if (self.options.attribute === 'class') {
      self.$target.addClass(self.options.value);
    } else {
      self.$target.attr(self.options.attribute, self.options.value);
    }
    self.$el.trigger('patterns.toggle.added');
  }
});

Patterns.register(Toggle);

return Toggle;

});

// tabs pattern.
//
// Author: Rok Garbas
// Contact: rok@garbas.si
// Version: 1.0
// Depends: jquery.js patterns.js pattern.tabs.js
//
// Description:
//
// License:
//
// Copyright (C) 2010 Plone Foundation
//
// This program is free software; you can redistribute it and/or modify it
// under the terms of the GNU General Public License as published by the Free
// Software Foundation; either version 2 of the License.
//
// This program is distributed in the hope that it will be useful, but WITHOUT
// ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
// FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
// more details.
//
// You should have received a copy of the GNU General Public License along with
// this program; if not, write to the Free Software Foundation, Inc., 51
// Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
//

/*jshint bitwise:true, curly:true, eqeqeq:true, immed:true, latedef:true,
  newcap:true, noarg:true, noempty:true, nonew:true, plusplus:true,
  undef:true, strict:true, trailing:true, browser:true, evil:true */
/*global define:false */


define('js/plone.tabs',[
  'jquery',
  'js/patterns',
  'js/pattern.tabs'
], function($, Patterns, Tabs, undefined) {
  

  var PloneTabs = Patterns.Base.extend({
    name: 'plone-tabs',
    jqueryPlugin: 'ploneTabs',
    defaults: {
      panels: '.enableFormTabbing fieldset',
      panelKlass: 'formPanel',
      tabKlass: 'formTab',
      tabsKlass: 'formTabs'
    },
    init: function() {
      var self = this;

      self.options = $.extend({}, self.defaults, self.options);

      self.$panels = $(self.options.panels, self.$el);
      if (!self.$panels.size()) { return; }

      self.$tabs = $('<ul/>')
        .addClass(self.options.tabsKlass)
        .insertBefore(self.$panels.parent());

      self.$panels.each(function() {
        var $panel = $(this).addClass(self.options.panelKlass),
            $legend = $('> legend', $panel).hide();
        self.$tabs.append(
          $('<li/>')
            .addClass(self.options.tabKlass)
            .append($('<a/>').attr({
              'id': $legend.attr('id'),
              'href': '#' + $panel.attr('id')
              }).append($('<span/>').html($legend.text()))
          ));
      });

      self.$tabs.patternTabs();
    }
  });

  Patterns.register(PloneTabs);

  return PloneTabs;

});

if (jQuery) {
  define( "jquery", [], function () { return jQuery; } );
}
define('js/widgets',[
  'jquery',
  'js/patterns',
  'js/pattern.autocomplete',
  'js/pattern.calendar',
  'js/pattern.tabs',
  'js/pattern.toggle',
  'js/plone.tabs'
], function($, Patterns) {

  // Initial initialization of patterns
  $(document).ready(function() {
    Patterns.initialize($(document));
  });

});

// This plugin is used to handle all clicks inside iframe.
//
// @author Rok Garbas
// @version 1.0
// @licstart  The following is the entire license notice for the JavaScript
//            code in this page.
//
// Copyright (C) 2010 Plone Foundation
//
// This program is free software; you can redistribute it and/or modify it
// under the terms of the GNU General Public License as published by the Free
// Software Foundation; either version 2 of the License.
//
// This program is distributed in the hope that it will be useful, but WITHOUT
// ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
// FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
// more details.
//
// You should have received a copy of the GNU General Public License along with
// this program; if not, write to the Free Software Foundation, Inc., 51
// Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
//
// @licend  The above is the entire license notice for the JavaScript code in
//          this page.
//

/*jshint bitwise:true, curly:true, eqeqeq:true, immed:true, latedef:true,
  newcap:true, noarg:true, noempty:true, nonew:true, plusplus:true,
  regexp:true, undef:true, strict:true, trailing:true, browser:true */
/*global define:false */


define('js/jquery.iframe',[
  'jquery',
  'js/patterns'
], function($, undefined) {
  

  $.IFrame = function(iframe) { this._init(iframe); };
  $.IFrame.prototype = {

    // # Initialization
    _init: function(iframe) {
      var self = this;

      self._iframe = iframe;
      self.$el = $(iframe.el);
      self.window = window.parent;
      self.document = window.parent.document;
      self.is_stretched = false;

      // # Handle clicks inside iframe
      $(document).on('click', function(e) {

        // opens link in top frame if clicked on it
        // TODO: only if on same base url
        if ($.nodeName(e.target, 'a') ||
            $(e.target).parents('a').size() === 1) {

          e.stopPropagation();
          e.preventDefault();

          var url = $(e.target).attr('href');
          if (!$.nodeName(e.target, 'a')) {
            url = $(e.target).parents('a').attr('href');
          }

          if (e.which === 1) {
            self._same_window(url);
          } else if (e.which === 2) {
            self._new_window(url);
          }

        // if we click on empty part of iframe then shrink it
        } else if ($.nodeName(e.target, 'html')) {
          self.shrink();

        // if click on any other element then 'a' of iframe trigger iframe.click
        // event
        } else {
          self.$el.trigger('iframe.click', e);
        }

      });

      // make sure all content of iframe is visible
      self.fit();
      $(window).on('resize', function(e) { self.fit(); });
    },

    // Abstract calls to window.parent so its easier to stub/mock in tests
    _same_window: function(url) {
      this.window.location.href = url;
    },
    _new_window: function(url) {
      this.window.open(url);
    },

    // # Shrink IFrame Object
    //
    // Shrink current frame to the size that was before stretching it.
    shrink: function() {
      var self = this;
      if (self.is_stretched) {
        self.$el.trigger('iframe.shrink');
        self.is_stretched = false;
        self.fit();
        self.$el.trigger('iframe.shrinked');
      }
    },

    // # Stretch IFrame Object
    //
    // This function stretches current frame over whole top frame while keeping
    // iframe object trasparent
    stretch: function() {
      var self = this;
      if (!self.is_stretched) {
        self.$el.trigger('iframe.stretch');
        self.is_stretched = true;
        self.$el.css({ height: $(self.document).height() });
        self.$el.trigger('iframe.stretched');
      }
    },

    // # Toggle IFrame Object
    //
    // This function check in which state current object is and calls appropriate
    // action (stretch or shrink)
    toggle: function() {
      var self = this;
      if (!self.is_stretched) { self.stretch(); }
      else { self.shrink(); }
    },

    fit: function() {
      var self = this;
      if (!self.is_stretched) {
        self.$el.css({ height: $('body', document).height() });
        $('body', self.document).css('margin-top', $('body', document).height());
      } else {
        self.$el.css({ height: $(self.document).height() });
      }
    }
  };

  if (window.parent.iframe !== undefined && window.name &&
      window.parent.iframe[window.name] !== undefined) {
    $.iframe = new $.IFrame(window.parent.iframe[window.name]);
  }

  return $.iframe;

});

// Author: Rok Garbas
// Contact: rok@garbas.si
// Version: 1.0
//
// Description:
//    plone.toolbar.js script makes sure that all dropdowns in Plone's toolbar
//    are in sync with iframe's stretching/schrinking.
// 
// License:
//
// Copyright (C) 2010 Plone Foundation
//
// This program is free software; you can redistribute it and/or modify it
// under the terms of the GNU General Public License as published by the Free
// Software Foundation; either version 2 of the License.
//
// This program is distributed in the hope that it will be useful, but WITHOUT
// ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
// FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
// more details.
//
// You should have received a copy of the GNU General Public License along with
// this program; if not, write to the Free Software Foundation, Inc., 51
// Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
//

/*jshint bitwise:true, curly:true, eqeqeq:true, immed:true, latedef:true,
  newcap:true, noarg:true, noempty:true, nonew:true, plusplus:true,
  undef:true, strict:true, trailing:true, browser:true, evil:true */
/*global define:false */

define('js/plone.toolbar',[
  'jquery',
  'js/patterns',
  'js/pattern.toggle',
  'js/jquery.iframe'
], function($, Patterns, Toggle, IFrame, undefined) {
  

  var PloneToolbar = Patterns.Base.extend({
    name: 'plone-toolbar',
    jqueryPlugin: 'ploneToolbar',
    init: function() {
      var self = this;

      // for each dropdown toolbar button
      self.$el
        // at opening dropdown:
        // - close all other opened dropdown buttons
        // - stretch iframe
        .on('patterns.toggle.add', 'a[data-pattern~="toggle"]', function(e) {
          var $el = $(this);
          $('.toolbar-dropdown-open > a').each(function() {
            if ($el[0] !== $(this)[0]) {
              $(this).patternToggle('remove');
            }
          });
          IFrame.stretch();
        })
        // at closing dropdown shrink iframe
        .on('patterns.toggle.removed', 'a[data-pattern~="toggle"]', function(e) {
          IFrame.shrink();
        });

      // make sure we close all dropdowns when iframe is shrinking
      IFrame.$el.on('iframe.shrink', function(e) {
        $('.toolbar-dropdown-open > a', self.$el).each(function() {
          $(this).patternToggle('remove');
        });
      });
    }
  });

  Patterns.register(PloneToolbar);

  return PloneToolbar;

});

/*!
 * jQuery Form Plugin
 * version: 3.25.0-2013.01.18
 * @requires jQuery v1.5 or later
 *
 * Examples and documentation at: http://malsup.com/jquery/form/
 * Project repository: https://github.com/malsup/form
 * Dual licensed under the MIT and GPL licenses:
 *    http://malsup.github.com/mit-license.txt
 *    http://malsup.github.com/gpl-license-v2.txt
 */
/*global ActiveXObject alert */
;(function($) {


/*
    Usage Note:
    -----------
    Do not use both ajaxSubmit and ajaxForm on the same form.  These
    functions are mutually exclusive.  Use ajaxSubmit if you want
    to bind your own submit handler to the form.  For example,

    $(document).ready(function() {
        $('#myForm').on('submit', function(e) {
            e.preventDefault(); // <-- important
            $(this).ajaxSubmit({
                target: '#output'
            });
        });
    });

    Use ajaxForm when you want the plugin to manage all the event binding
    for you.  For example,

    $(document).ready(function() {
        $('#myForm').ajaxForm({
            target: '#output'
        });
    });
    
    You can also use ajaxForm with delegation (requires jQuery v1.7+), so the
    form does not have to exist when you invoke ajaxForm:

    $('#myForm').ajaxForm({
        delegation: true,
        target: '#output'
    });
    
    When using ajaxForm, the ajaxSubmit function will be invoked for you
    at the appropriate time.
*/

/**
 * Feature detection
 */
var feature = {};
feature.fileapi = $("<input type='file'/>").get(0).files !== undefined;
feature.formdata = window.FormData !== undefined;

/**
 * ajaxSubmit() provides a mechanism for immediately submitting
 * an HTML form using AJAX.
 */
$.fn.ajaxSubmit = function(options) {
    /*jshint scripturl:true */

    // fast fail if nothing selected (http://dev.jquery.com/ticket/2752)
    if (!this.length) {
        log('ajaxSubmit: skipping submit process - no element selected');
        return this;
    }
    
    var method, action, url, $form = this;

    if (typeof options == 'function') {
        options = { success: options };
    }

    method = this.attr('method');
    action = this.attr('action');
    url = (typeof action === 'string') ? $.trim(action) : '';
    url = url || window.location.href || '';
    if (url) {
        // clean url (don't include hash vaue)
        url = (url.match(/^([^#]+)/)||[])[1];
    }

    options = $.extend(true, {
        url:  url,
        success: $.ajaxSettings.success,
        type: method || 'GET',
        iframeSrc: /^https/i.test(window.location.href || '') ? 'javascript:false' : 'about:blank'
    }, options);

    // hook for manipulating the form data before it is extracted;
    // convenient for use with rich editors like tinyMCE or FCKEditor
    var veto = {};
    this.trigger('form-pre-serialize', [this, options, veto]);
    if (veto.veto) {
        log('ajaxSubmit: submit vetoed via form-pre-serialize trigger');
        return this;
    }

    // provide opportunity to alter form data before it is serialized
    if (options.beforeSerialize && options.beforeSerialize(this, options) === false) {
        log('ajaxSubmit: submit aborted via beforeSerialize callback');
        return this;
    }

    var traditional = options.traditional;
    if ( traditional === undefined ) {
        traditional = $.ajaxSettings.traditional;
    }
    
    var elements = [];
    var qx, a = this.formToArray(options.semantic, elements);
    if (options.data) {
        options.extraData = options.data;
        qx = $.param(options.data, traditional);
    }

    // give pre-submit callback an opportunity to abort the submit
    if (options.beforeSubmit && options.beforeSubmit(a, this, options) === false) {
        log('ajaxSubmit: submit aborted via beforeSubmit callback');
        return this;
    }

    // fire vetoable 'validate' event
    this.trigger('form-submit-validate', [a, this, options, veto]);
    if (veto.veto) {
        log('ajaxSubmit: submit vetoed via form-submit-validate trigger');
        return this;
    }

    var q = $.param(a, traditional);
    if (qx) {
        q = ( q ? (q + '&' + qx) : qx );
    }    
    if (options.type.toUpperCase() == 'GET') {
        options.url += (options.url.indexOf('?') >= 0 ? '&' : '?') + q;
        options.data = null;  // data is null for 'get'
    }
    else {
        options.data = q; // data is the query string for 'post'
    }

    var callbacks = [];
    if (options.resetForm) {
        callbacks.push(function() { $form.resetForm(); });
    }
    if (options.clearForm) {
        callbacks.push(function() { $form.clearForm(options.includeHidden); });
    }

    // perform a load on the target only if dataType is not provided
    if (!options.dataType && options.target) {
        var oldSuccess = options.success || function(){};
        callbacks.push(function(data) {
            var fn = options.replaceTarget ? 'replaceWith' : 'html';
            $(options.target)[fn](data).each(oldSuccess, arguments);
        });
    }
    else if (options.success) {
        callbacks.push(options.success);
    }

    options.success = function(data, status, xhr) { // jQuery 1.4+ passes xhr as 3rd arg
        var context = options.context || this ;    // jQuery 1.4+ supports scope context 
        for (var i=0, max=callbacks.length; i < max; i++) {
            callbacks[i].apply(context, [data, status, xhr || $form, $form]);
        }
    };

    // are there files to upload?

    // [value] (issue #113), also see comment:
    // https://github.com/malsup/form/commit/588306aedba1de01388032d5f42a60159eea9228#commitcomment-2180219
    var fileInputs = $('input[type=file]:enabled[value!=""]', this); 

    var hasFileInputs = fileInputs.length > 0;
    var mp = 'multipart/form-data';
    var multipart = ($form.attr('enctype') == mp || $form.attr('encoding') == mp);

    var fileAPI = feature.fileapi && feature.formdata;
    log("fileAPI :" + fileAPI);
    var shouldUseFrame = (hasFileInputs || multipart) && !fileAPI;

    var jqxhr;

    // options.iframe allows user to force iframe mode
    // 06-NOV-09: now defaulting to iframe mode if file input is detected
    if (options.iframe !== false && (options.iframe || shouldUseFrame)) {
        // hack to fix Safari hang (thanks to Tim Molendijk for this)
        // see:  http://groups.google.com/group/jquery-dev/browse_thread/thread/36395b7ab510dd5d
        if (options.closeKeepAlive) {
            $.get(options.closeKeepAlive, function() {
                jqxhr = fileUploadIframe(a);
            });
        }
        else {
            jqxhr = fileUploadIframe(a);
        }
    }
    else if ((hasFileInputs || multipart) && fileAPI) {
        jqxhr = fileUploadXhr(a);
    }
    else {
        jqxhr = $.ajax(options);
    }

    $form.removeData('jqxhr').data('jqxhr', jqxhr);

    // clear element array
    for (var k=0; k < elements.length; k++)
        elements[k] = null;

    // fire 'notify' event
    this.trigger('form-submit-notify', [this, options]);
    return this;

    // utility fn for deep serialization
    function deepSerialize(extraData){
        var serialized = $.param(extraData).split('&');
        var len = serialized.length;
        var result = {};
        var i, part;
        for (i=0; i < len; i++) {
            // #252; undo param space replacement
            serialized[i] = serialized[i].replace(/\+/g,' ');
            part = serialized[i].split('=');
            result[decodeURIComponent(part[0])] = decodeURIComponent(part[1]);
        }
        return result;
    }

     // XMLHttpRequest Level 2 file uploads (big hat tip to francois2metz)
    function fileUploadXhr(a) {
        var formdata = new FormData();

        for (var i=0; i < a.length; i++) {
            formdata.append(a[i].name, a[i].value);
        }

        if (options.extraData) {
            var serializedData = deepSerialize(options.extraData);
            for (var p in serializedData)
                if (serializedData.hasOwnProperty(p))
                    formdata.append(p, serializedData[p]);
        }

        options.data = null;

        var s = $.extend(true, {}, $.ajaxSettings, options, {
            contentType: false,
            processData: false,
            cache: false,
            type: method || 'POST'
        });
        
        if (options.uploadProgress) {
            // workaround because jqXHR does not expose upload property
            s.xhr = function() {
                var xhr = jQuery.ajaxSettings.xhr();
                if (xhr.upload) {
                    xhr.upload.onprogress = function(event) {
                        var percent = 0;
                        var position = event.loaded || event.position; /*event.position is deprecated*/
                        var total = event.total;
                        if (event.lengthComputable) {
                            percent = Math.ceil(position / total * 100);
                        }
                        options.uploadProgress(event, position, total, percent);
                    };
                }
                return xhr;
            };
        }

        s.data = null;
            var beforeSend = s.beforeSend;
            s.beforeSend = function(xhr, o) {
                o.data = formdata;
                if(beforeSend)
                    beforeSend.call(this, xhr, o);
        };
        return $.ajax(s);
    }

    // private function for handling file uploads (hat tip to YAHOO!)
    function fileUploadIframe(a) {
        var form = $form[0], el, i, s, g, id, $io, io, xhr, sub, n, timedOut, timeoutHandle;
        var useProp = !!$.fn.prop;
        var deferred = $.Deferred();

        if ($('[name=submit],[id=submit]', form).length) {
            // if there is an input with a name or id of 'submit' then we won't be
            // able to invoke the submit fn on the form (at least not x-browser)
            alert('Error: Form elements must not have name or id of "submit".');
            deferred.reject();
            return deferred;
        }
        
        if (a) {
            // ensure that every serialized input is still enabled
            for (i=0; i < elements.length; i++) {
                el = $(elements[i]);
                if ( useProp )
                    el.prop('disabled', false);
                else
                    el.removeAttr('disabled');
            }
        }

        s = $.extend(true, {}, $.ajaxSettings, options);
        s.context = s.context || s;
        id = 'jqFormIO' + (new Date().getTime());
        if (s.iframeTarget) {
            $io = $(s.iframeTarget);
            n = $io.attr('name');
            if (!n)
                 $io.attr('name', id);
            else
                id = n;
        }
        else {
            $io = $('<iframe name="' + id + '" src="'+ s.iframeSrc +'" />');
            $io.css({ position: 'absolute', top: '-1000px', left: '-1000px' });
        }
        io = $io[0];


        xhr = { // mock object
            aborted: 0,
            responseText: null,
            responseXML: null,
            status: 0,
            statusText: 'n/a',
            getAllResponseHeaders: function() {},
            getResponseHeader: function() {},
            setRequestHeader: function() {},
            abort: function(status) {
                var e = (status === 'timeout' ? 'timeout' : 'aborted');
                log('aborting upload... ' + e);
                this.aborted = 1;

                try { // #214, #257
                    if (io.contentWindow.document.execCommand) {
                        io.contentWindow.document.execCommand('Stop');
                    }
                } 
                catch(ignore) {}

                $io.attr('src', s.iframeSrc); // abort op in progress
                xhr.error = e;
                if (s.error)
                    s.error.call(s.context, xhr, e, status);
                if (g)
                    $.event.trigger("ajaxError", [xhr, s, e]);
                if (s.complete)
                    s.complete.call(s.context, xhr, e);
            }
        };

        g = s.global;
        // trigger ajax global events so that activity/block indicators work like normal
        if (g && 0 === $.active++) {
            $.event.trigger("ajaxStart");
        }
        if (g) {
            $.event.trigger("ajaxSend", [xhr, s]);
        }

        if (s.beforeSend && s.beforeSend.call(s.context, xhr, s) === false) {
            if (s.global) {
                $.active--;
            }
            deferred.reject();
            return deferred;
        }
        if (xhr.aborted) {
            deferred.reject();
            return deferred;
        }

        // add submitting element to data if we know it
        sub = form.clk;
        if (sub) {
            n = sub.name;
            if (n && !sub.disabled) {
                s.extraData = s.extraData || {};
                s.extraData[n] = sub.value;
                if (sub.type == "image") {
                    s.extraData[n+'.x'] = form.clk_x;
                    s.extraData[n+'.y'] = form.clk_y;
                }
            }
        }
        
        var CLIENT_TIMEOUT_ABORT = 1;
        var SERVER_ABORT = 2;

        function getDoc(frame) {
            var doc = frame.contentWindow ? frame.contentWindow.document : frame.contentDocument ? frame.contentDocument : frame.document;
            return doc;
        }
        
        // Rails CSRF hack (thanks to Yvan Barthelemy)
        var csrf_token = $('meta[name=csrf-token]').attr('content');
        var csrf_param = $('meta[name=csrf-param]').attr('content');
        if (csrf_param && csrf_token) {
            s.extraData = s.extraData || {};
            s.extraData[csrf_param] = csrf_token;
        }

        // take a breath so that pending repaints get some cpu time before the upload starts
        function doSubmit() {
            // make sure form attrs are set
            var t = $form.attr('target'), a = $form.attr('action');

            // update form attrs in IE friendly way
            form.setAttribute('target',id);
            if (!method) {
                form.setAttribute('method', 'POST');
            }
            if (a != s.url) {
                form.setAttribute('action', s.url);
            }

            // ie borks in some cases when setting encoding
            if (! s.skipEncodingOverride && (!method || /post/i.test(method))) {
                $form.attr({
                    encoding: 'multipart/form-data',
                    enctype:  'multipart/form-data'
                });
            }

            // support timout
            if (s.timeout) {
                timeoutHandle = setTimeout(function() { timedOut = true; cb(CLIENT_TIMEOUT_ABORT); }, s.timeout);
            }
            
            // look for server aborts
            function checkState() {
                try {
                    var state = getDoc(io).readyState;
                    log('state = ' + state);
                    if (state && state.toLowerCase() == 'uninitialized')
                        setTimeout(checkState,50);
                }
                catch(e) {
                    log('Server abort: ' , e, ' (', e.name, ')');
                    cb(SERVER_ABORT);
                    if (timeoutHandle)
                        clearTimeout(timeoutHandle);
                    timeoutHandle = undefined;
                }
            }

            // add "extra" data to form if provided in options
            var extraInputs = [];
            try {
                if (s.extraData) {
                    for (var n in s.extraData) {
                        if (s.extraData.hasOwnProperty(n)) {
                           // if using the $.param format that allows for multiple values with the same name
                           if($.isPlainObject(s.extraData[n]) && s.extraData[n].hasOwnProperty('name') && s.extraData[n].hasOwnProperty('value')) {
                               extraInputs.push(
                               $('<input type="hidden" name="'+s.extraData[n].name+'">').val(s.extraData[n].value)
                                   .appendTo(form)[0]);
                           } else {
                               extraInputs.push(
                               $('<input type="hidden" name="'+n+'">').val(s.extraData[n])
                                   .appendTo(form)[0]);
                           }
                        }
                    }
                }

                if (!s.iframeTarget) {
                    // add iframe to doc and submit the form
                    $io.appendTo('body');
                    if (io.attachEvent)
                        io.attachEvent('onload', cb);
                    else
                        io.addEventListener('load', cb, false);
                }
                setTimeout(checkState,15);
                form.submit();
            }
            finally {
                // reset attrs and remove "extra" input elements
                form.setAttribute('action',a);
                if(t) {
                    form.setAttribute('target', t);
                } else {
                    $form.removeAttr('target');
                }
                $(extraInputs).remove();
            }
        }

        if (s.forceSync) {
            doSubmit();
        }
        else {
            setTimeout(doSubmit, 10); // this lets dom updates render
        }

        var data, doc, domCheckCount = 50, callbackProcessed;

        function cb(e) {
            if (xhr.aborted || callbackProcessed) {
                return;
            }
            try {
                doc = getDoc(io);
            }
            catch(ex) {
                log('cannot access response document: ', ex);
                e = SERVER_ABORT;
            }
            if (e === CLIENT_TIMEOUT_ABORT && xhr) {
                xhr.abort('timeout');
                deferred.reject(xhr, 'timeout');
                return;
            }
            else if (e == SERVER_ABORT && xhr) {
                xhr.abort('server abort');
                deferred.reject(xhr, 'error', 'server abort');
                return;
            }

            if (!doc || doc.location.href == s.iframeSrc) {
                // response not received yet
                if (!timedOut)
                    return;
            }
            if (io.detachEvent)
                io.detachEvent('onload', cb);
            else    
                io.removeEventListener('load', cb, false);

            var status = 'success', errMsg;
            try {
                if (timedOut) {
                    throw 'timeout';
                }

                var isXml = s.dataType == 'xml' || doc.XMLDocument || $.isXMLDoc(doc);
                log('isXml='+isXml);
                if (!isXml && window.opera && (doc.body === null || !doc.body.innerHTML)) {
                    if (--domCheckCount) {
                        // in some browsers (Opera) the iframe DOM is not always traversable when
                        // the onload callback fires, so we loop a bit to accommodate
                        log('requeing onLoad callback, DOM not available');
                        setTimeout(cb, 250);
                        return;
                    }
                    // let this fall through because server response could be an empty document
                    //log('Could not access iframe DOM after mutiple tries.');
                    //throw 'DOMException: not available';
                }

                //log('response detected');
                var docRoot = doc.body ? doc.body : doc.documentElement;
                xhr.responseText = docRoot ? docRoot.innerHTML : null;
                xhr.responseXML = doc.XMLDocument ? doc.XMLDocument : doc;
                if (isXml)
                    s.dataType = 'xml';
                xhr.getResponseHeader = function(header){
                    var headers = {'content-type': s.dataType};
                    return headers[header];
                };
                // support for XHR 'status' & 'statusText' emulation :
                if (docRoot) {
                    xhr.status = Number( docRoot.getAttribute('status') ) || xhr.status;
                    xhr.statusText = docRoot.getAttribute('statusText') || xhr.statusText;
                }

                var dt = (s.dataType || '').toLowerCase();
                var scr = /(json|script|text)/.test(dt);
                if (scr || s.textarea) {
                    // see if user embedded response in textarea
                    var ta = doc.getElementsByTagName('textarea')[0];
                    if (ta) {
                        xhr.responseText = ta.value;
                        // support for XHR 'status' & 'statusText' emulation :
                        xhr.status = Number( ta.getAttribute('status') ) || xhr.status;
                        xhr.statusText = ta.getAttribute('statusText') || xhr.statusText;
                    }
                    else if (scr) {
                        // account for browsers injecting pre around json response
                        var pre = doc.getElementsByTagName('pre')[0];
                        var b = doc.getElementsByTagName('body')[0];
                        if (pre) {
                            xhr.responseText = pre.textContent ? pre.textContent : pre.innerText;
                        }
                        else if (b) {
                            xhr.responseText = b.textContent ? b.textContent : b.innerText;
                        }
                    }
                }
                else if (dt == 'xml' && !xhr.responseXML && xhr.responseText) {
                    xhr.responseXML = toXml(xhr.responseText);
                }

                try {
                    data = httpData(xhr, dt, s);
                }
                catch (e) {
                    status = 'parsererror';
                    xhr.error = errMsg = (e || status);
                }
            }
            catch (e) {
                log('error caught: ',e);
                status = 'error';
                xhr.error = errMsg = (e || status);
            }

            if (xhr.aborted) {
                log('upload aborted');
                status = null;
            }

            if (xhr.status) { // we've set xhr.status
                status = (xhr.status >= 200 && xhr.status < 300 || xhr.status === 304) ? 'success' : 'error';
            }

            // ordering of these callbacks/triggers is odd, but that's how $.ajax does it
            if (status === 'success') {
                if (s.success)
                    s.success.call(s.context, data, 'success', xhr);
                deferred.resolve(xhr.responseText, 'success', xhr);
                if (g)
                    $.event.trigger("ajaxSuccess", [xhr, s]);
            }
            else if (status) {
                if (errMsg === undefined)
                    errMsg = xhr.statusText;
                if (s.error)
                    s.error.call(s.context, xhr, status, errMsg);
                deferred.reject(xhr, 'error', errMsg);
                if (g)
                    $.event.trigger("ajaxError", [xhr, s, errMsg]);
            }

            if (g)
                $.event.trigger("ajaxComplete", [xhr, s]);

            if (g && ! --$.active) {
                $.event.trigger("ajaxStop");
            }

            if (s.complete)
                s.complete.call(s.context, xhr, status);

            callbackProcessed = true;
            if (s.timeout)
                clearTimeout(timeoutHandle);

            // clean up
            setTimeout(function() {
                if (!s.iframeTarget)
                    $io.remove();
                xhr.responseXML = null;
            }, 100);
        }

        var toXml = $.parseXML || function(s, doc) { // use parseXML if available (jQuery 1.5+)
            if (window.ActiveXObject) {
                doc = new ActiveXObject('Microsoft.XMLDOM');
                doc.async = 'false';
                doc.loadXML(s);
            }
            else {
                doc = (new DOMParser()).parseFromString(s, 'text/xml');
            }
            return (doc && doc.documentElement && doc.documentElement.nodeName != 'parsererror') ? doc : null;
        };
        var parseJSON = $.parseJSON || function(s) {
            /*jslint evil:true */
            return window['eval']('(' + s + ')');
        };

        var httpData = function( xhr, type, s ) { // mostly lifted from jq1.4.4

            var ct = xhr.getResponseHeader('content-type') || '',
                xml = type === 'xml' || !type && ct.indexOf('xml') >= 0,
                data = xml ? xhr.responseXML : xhr.responseText;

            if (xml && data.documentElement.nodeName === 'parsererror') {
                if ($.error)
                    $.error('parsererror');
            }
            if (s && s.dataFilter) {
                data = s.dataFilter(data, type);
            }
            if (typeof data === 'string') {
                if (type === 'json' || !type && ct.indexOf('json') >= 0) {
                    data = parseJSON(data);
                } else if (type === "script" || !type && ct.indexOf("javascript") >= 0) {
                    $.globalEval(data);
                }
            }
            return data;
        };

        return deferred;
    }
};

/**
 * ajaxForm() provides a mechanism for fully automating form submission.
 *
 * The advantages of using this method instead of ajaxSubmit() are:
 *
 * 1: This method will include coordinates for <input type="image" /> elements (if the element
 *    is used to submit the form).
 * 2. This method will include the submit element's name/value data (for the element that was
 *    used to submit the form).
 * 3. This method binds the submit() method to the form for you.
 *
 * The options argument for ajaxForm works exactly as it does for ajaxSubmit.  ajaxForm merely
 * passes the options argument along after properly binding events for submit elements and
 * the form itself.
 */
$.fn.ajaxForm = function(options) {
    options = options || {};
    options.delegation = options.delegation && $.isFunction($.fn.on);
    
    // in jQuery 1.3+ we can fix mistakes with the ready state
    if (!options.delegation && this.length === 0) {
        var o = { s: this.selector, c: this.context };
        if (!$.isReady && o.s) {
            log('DOM not ready, queuing ajaxForm');
            $(function() {
                $(o.s,o.c).ajaxForm(options);
            });
            return this;
        }
        // is your DOM ready?  http://docs.jquery.com/Tutorials:Introducing_$(document).ready()
        log('terminating; zero elements found by selector' + ($.isReady ? '' : ' (DOM not ready)'));
        return this;
    }

    if ( options.delegation ) {
        $(document)
            .off('submit.form-plugin', this.selector, doAjaxSubmit)
            .off('click.form-plugin', this.selector, captureSubmittingElement)
            .on('submit.form-plugin', this.selector, options, doAjaxSubmit)
            .on('click.form-plugin', this.selector, options, captureSubmittingElement);
        return this;
    }

    return this.ajaxFormUnbind()
        .bind('submit.form-plugin', options, doAjaxSubmit)
        .bind('click.form-plugin', options, captureSubmittingElement);
};

// private event handlers    
function doAjaxSubmit(e) {
    /*jshint validthis:true */
    var options = e.data;
    if (!e.isDefaultPrevented()) { // if event has been canceled, don't proceed
        e.preventDefault();
        $(this).ajaxSubmit(options);
    }
}
    
function captureSubmittingElement(e) {
    /*jshint validthis:true */
    var target = e.target;
    var $el = $(target);
    if (!($el.is("[type=submit],[type=image]"))) {
        // is this a child element of the submit el?  (ex: a span within a button)
        var t = $el.closest('[type=submit]');
        if (t.length === 0) {
            return;
        }
        target = t[0];
    }
    var form = this;
    form.clk = target;
    if (target.type == 'image') {
        if (e.offsetX !== undefined) {
            form.clk_x = e.offsetX;
            form.clk_y = e.offsetY;
        } else if (typeof $.fn.offset == 'function') {
            var offset = $el.offset();
            form.clk_x = e.pageX - offset.left;
            form.clk_y = e.pageY - offset.top;
        } else {
            form.clk_x = e.pageX - target.offsetLeft;
            form.clk_y = e.pageY - target.offsetTop;
        }
    }
    // clear form vars
    setTimeout(function() { form.clk = form.clk_x = form.clk_y = null; }, 100);
}


// ajaxFormUnbind unbinds the event handlers that were bound by ajaxForm
$.fn.ajaxFormUnbind = function() {
    return this.unbind('submit.form-plugin click.form-plugin');
};

/**
 * formToArray() gathers form element data into an array of objects that can
 * be passed to any of the following ajax functions: $.get, $.post, or load.
 * Each object in the array has both a 'name' and 'value' property.  An example of
 * an array for a simple login form might be:
 *
 * [ { name: 'username', value: 'jresig' }, { name: 'password', value: 'secret' } ]
 *
 * It is this array that is passed to pre-submit callback functions provided to the
 * ajaxSubmit() and ajaxForm() methods.
 */
$.fn.formToArray = function(semantic, elements) {
    var a = [];
    if (this.length === 0) {
        return a;
    }

    var form = this[0];
    var els = semantic ? form.getElementsByTagName('*') : form.elements;
    if (!els) {
        return a;
    }

    var i,j,n,v,el,max,jmax;
    for(i=0, max=els.length; i < max; i++) {
        el = els[i];
        n = el.name;
        if (!n) {
            continue;
        }

        if (semantic && form.clk && el.type == "image") {
            // handle image inputs on the fly when semantic == true
            if(!el.disabled && form.clk == el) {
                a.push({name: n, value: $(el).val(), type: el.type });
                a.push({name: n+'.x', value: form.clk_x}, {name: n+'.y', value: form.clk_y});
            }
            continue;
        }

        v = $.fieldValue(el, true);
        if (v && v.constructor == Array) {
            if (elements) 
                elements.push(el);
            for(j=0, jmax=v.length; j < jmax; j++) {
                a.push({name: n, value: v[j]});
            }
        }
        else if (feature.fileapi && el.type == 'file' && !el.disabled) {
            if (elements) 
                elements.push(el);
            var files = el.files;
            if (files.length) {
                for (j=0; j < files.length; j++) {
                    a.push({name: n, value: files[j], type: el.type});
                }
            }
            else {
                // #180
                a.push({ name: n, value: '', type: el.type });
            }
        }
        else if (v !== null && typeof v != 'undefined') {
            if (elements) 
                elements.push(el);
            a.push({name: n, value: v, type: el.type, required: el.required});
        }
    }

    if (!semantic && form.clk) {
        // input type=='image' are not found in elements array! handle it here
        var $input = $(form.clk), input = $input[0];
        n = input.name;
        if (n && !input.disabled && input.type == 'image') {
            a.push({name: n, value: $input.val()});
            a.push({name: n+'.x', value: form.clk_x}, {name: n+'.y', value: form.clk_y});
        }
    }
    return a;
};

/**
 * Serializes form data into a 'submittable' string. This method will return a string
 * in the format: name1=value1&amp;name2=value2
 */
$.fn.formSerialize = function(semantic) {
    //hand off to jQuery.param for proper encoding
    return $.param(this.formToArray(semantic));
};

/**
 * Serializes all field elements in the jQuery object into a query string.
 * This method will return a string in the format: name1=value1&amp;name2=value2
 */
$.fn.fieldSerialize = function(successful) {
    var a = [];
    this.each(function() {
        var n = this.name;
        if (!n) {
            return;
        }
        var v = $.fieldValue(this, successful);
        if (v && v.constructor == Array) {
            for (var i=0,max=v.length; i < max; i++) {
                a.push({name: n, value: v[i]});
            }
        }
        else if (v !== null && typeof v != 'undefined') {
            a.push({name: this.name, value: v});
        }
    });
    //hand off to jQuery.param for proper encoding
    return $.param(a);
};

/**
 * Returns the value(s) of the element in the matched set.  For example, consider the following form:
 *
 *  <form><fieldset>
 *      <input name="A" type="text" />
 *      <input name="A" type="text" />
 *      <input name="B" type="checkbox" value="B1" />
 *      <input name="B" type="checkbox" value="B2"/>
 *      <input name="C" type="radio" value="C1" />
 *      <input name="C" type="radio" value="C2" />
 *  </fieldset></form>
 *
 *  var v = $('input[type=text]').fieldValue();
 *  // if no values are entered into the text inputs
 *  v == ['','']
 *  // if values entered into the text inputs are 'foo' and 'bar'
 *  v == ['foo','bar']
 *
 *  var v = $('input[type=checkbox]').fieldValue();
 *  // if neither checkbox is checked
 *  v === undefined
 *  // if both checkboxes are checked
 *  v == ['B1', 'B2']
 *
 *  var v = $('input[type=radio]').fieldValue();
 *  // if neither radio is checked
 *  v === undefined
 *  // if first radio is checked
 *  v == ['C1']
 *
 * The successful argument controls whether or not the field element must be 'successful'
 * (per http://www.w3.org/TR/html4/interact/forms.html#successful-controls).
 * The default value of the successful argument is true.  If this value is false the value(s)
 * for each element is returned.
 *
 * Note: This method *always* returns an array.  If no valid value can be determined the
 *    array will be empty, otherwise it will contain one or more values.
 */
$.fn.fieldValue = function(successful) {
    for (var val=[], i=0, max=this.length; i < max; i++) {
        var el = this[i];
        var v = $.fieldValue(el, successful);
        if (v === null || typeof v == 'undefined' || (v.constructor == Array && !v.length)) {
            continue;
        }
        if (v.constructor == Array)
            $.merge(val, v);
        else
            val.push(v);
    }
    return val;
};

/**
 * Returns the value of the field element.
 */
$.fieldValue = function(el, successful) {
    var n = el.name, t = el.type, tag = el.tagName.toLowerCase();
    if (successful === undefined) {
        successful = true;
    }

    if (successful && (!n || el.disabled || t == 'reset' || t == 'button' ||
        (t == 'checkbox' || t == 'radio') && !el.checked ||
        (t == 'submit' || t == 'image') && el.form && el.form.clk != el ||
        tag == 'select' && el.selectedIndex == -1)) {
            return null;
    }

    if (tag == 'select') {
        var index = el.selectedIndex;
        if (index < 0) {
            return null;
        }
        var a = [], ops = el.options;
        var one = (t == 'select-one');
        var max = (one ? index+1 : ops.length);
        for(var i=(one ? index : 0); i < max; i++) {
            var op = ops[i];
            if (op.selected) {
                var v = op.value;
                if (!v) { // extra pain for IE...
                    v = (op.attributes && op.attributes['value'] && !(op.attributes['value'].specified)) ? op.text : op.value;
                }
                if (one) {
                    return v;
                }
                a.push(v);
            }
        }
        return a;
    }
    return $(el).val();
};

/**
 * Clears the form data.  Takes the following actions on the form's input fields:
 *  - input text fields will have their 'value' property set to the empty string
 *  - select elements will have their 'selectedIndex' property set to -1
 *  - checkbox and radio inputs will have their 'checked' property set to false
 *  - inputs of type submit, button, reset, and hidden will *not* be effected
 *  - button elements will *not* be effected
 */
$.fn.clearForm = function(includeHidden) {
    return this.each(function() {
        $('input,select,textarea', this).clearFields(includeHidden);
    });
};

/**
 * Clears the selected form elements.
 */
$.fn.clearFields = $.fn.clearInputs = function(includeHidden) {
    var re = /^(?:color|date|datetime|email|month|number|password|range|search|tel|text|time|url|week)$/i; // 'hidden' is not in this list
    return this.each(function() {
        var t = this.type, tag = this.tagName.toLowerCase();
        if (re.test(t) || tag == 'textarea') {
            this.value = '';
        }
        else if (t == 'checkbox' || t == 'radio') {
            this.checked = false;
        }
        else if (tag == 'select') {
            this.selectedIndex = -1;
        }
		else if (t == "file") {
			if (/MSIE/.test(navigator.userAgent)) {
				$(this).replaceWith($(this).clone());
			} else {
				$(this).val('');
			}
		}
        else if (includeHidden) {
            // includeHidden can be the value true, or it can be a selector string
            // indicating a special test; for example:
            //  $('#myForm').clearForm('.special:hidden')
            // the above would clean hidden inputs that have the class of 'special'
            if ( (includeHidden === true && /hidden/.test(t)) ||
                 (typeof includeHidden == 'string' && $(this).is(includeHidden)) )
                this.value = '';
        }
    });
};

/**
 * Resets the form data.  Causes all form elements to be reset to their original value.
 */
$.fn.resetForm = function() {
    return this.each(function() {
        // guard against an input with the name of 'reset'
        // note that IE reports the reset function as an 'object'
        if (typeof this.reset == 'function' || (typeof this.reset == 'object' && !this.reset.nodeType)) {
            this.reset();
        }
    });
};

/**
 * Enables or disables any matching elements.
 */
$.fn.enable = function(b) {
    if (b === undefined) {
        b = true;
    }
    return this.each(function() {
        this.disabled = !b;
    });
};

/**
 * Checks/unchecks any matching checkboxes or radio buttons and
 * selects/deselects and matching option elements.
 */
$.fn.selected = function(select) {
    if (select === undefined) {
        select = true;
    }
    return this.each(function() {
        var t = this.type;
        if (t == 'checkbox' || t == 'radio') {
            this.checked = select;
        }
        else if (this.tagName.toLowerCase() == 'option') {
            var $sel = $(this).parent('select');
            if (select && $sel[0] && $sel[0].type == 'select-one') {
                // deselect all other options
                $sel.find('option').selected(false);
            }
            this.selected = select;
        }
    });
};

// expose debug var
$.fn.ajaxSubmit.debug = false;

// helper fn for console logging
function log() {
    if (!$.fn.ajaxSubmit.debug) 
        return;
    var msg = '[jquery.form] ' + Array.prototype.join.call(arguments,'');
    if (window.console && window.console.log) {
        window.console.log(msg);
    }
    else if (window.opera && window.opera.postError) {
        window.opera.postError(msg);
    }
}

})(jQuery);

define('jquery-form', ['jquery-form/jquery.form'], function (main) { return main; });

define("jquery-form/jquery.form", function(){});

/* =========================================================
 * bootstrap-modal.js v2.2.2
 * http://twitter.github.com/bootstrap/javascript.html#modals
 * =========================================================
 * Copyright 2012 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ========================================================= */


!function ($) {

   // jshint ;_;


 /* MODAL CLASS DEFINITION
  * ====================== */

  var Modal = function (element, options) {
    this.options = options
    this.$element = $(element)
      .delegate('[data-dismiss="modal"]', 'click.dismiss.modal', $.proxy(this.hide, this))
    this.options.remote && this.$element.find('.modal-body').load(this.options.remote)
  }

  Modal.prototype = {

      constructor: Modal

    , toggle: function () {
        return this[!this.isShown ? 'show' : 'hide']()
      }

    , show: function () {
        var that = this
          , e = $.Event('show')

        this.$element.trigger(e)

        if (this.isShown || e.isDefaultPrevented()) return

        this.isShown = true

        this.escape()

        this.backdrop(function () {
          var transition = $.support.transition && that.$element.hasClass('fade')

          if (!that.$element.parent().length) {
            that.$element.appendTo(document.body) //don't move modals dom position
          }

          that.$element
            .show()

          if (transition) {
            that.$element[0].offsetWidth // force reflow
          }

          that.$element
            .addClass('in')
            .attr('aria-hidden', false)

          that.enforceFocus()

          transition ?
            that.$element.one($.support.transition.end, function () { that.$element.focus().trigger('shown') }) :
            that.$element.focus().trigger('shown')

        })
      }

    , hide: function (e) {
        e && e.preventDefault()

        var that = this

        e = $.Event('hide')

        this.$element.trigger(e)

        if (!this.isShown || e.isDefaultPrevented()) return

        this.isShown = false

        this.escape()

        $(document).off('focusin.modal')

        this.$element
          .removeClass('in')
          .attr('aria-hidden', true)

        $.support.transition && this.$element.hasClass('fade') ?
          this.hideWithTransition() :
          this.hideModal()
      }

    , enforceFocus: function () {
        var that = this
        $(document).on('focusin.modal', function (e) {
          if (that.$element[0] !== e.target && !that.$element.has(e.target).length) {
            that.$element.focus()
          }
        })
      }

    , escape: function () {
        var that = this
        if (this.isShown && this.options.keyboard) {
          this.$element.on('keyup.dismiss.modal', function ( e ) {
            e.which == 27 && that.hide()
          })
        } else if (!this.isShown) {
          this.$element.off('keyup.dismiss.modal')
        }
      }

    , hideWithTransition: function () {
        var that = this
          , timeout = setTimeout(function () {
              that.$element.off($.support.transition.end)
              that.hideModal()
            }, 500)

        this.$element.one($.support.transition.end, function () {
          clearTimeout(timeout)
          that.hideModal()
        })
      }

    , hideModal: function (that) {
        this.$element
          .hide()
          .trigger('hidden')

        this.backdrop()
      }

    , removeBackdrop: function () {
        this.$backdrop.remove()
        this.$backdrop = null
      }

    , backdrop: function (callback) {
        var that = this
          , animate = this.$element.hasClass('fade') ? 'fade' : ''

        if (this.isShown && this.options.backdrop) {
          var doAnimate = $.support.transition && animate

          this.$backdrop = $('<div class="modal-backdrop ' + animate + '" />')
            .appendTo(document.body)

          this.$backdrop.click(
            this.options.backdrop == 'static' ?
              $.proxy(this.$element[0].focus, this.$element[0])
            : $.proxy(this.hide, this)
          )

          if (doAnimate) this.$backdrop[0].offsetWidth // force reflow

          this.$backdrop.addClass('in')

          doAnimate ?
            this.$backdrop.one($.support.transition.end, callback) :
            callback()

        } else if (!this.isShown && this.$backdrop) {
          this.$backdrop.removeClass('in')

          $.support.transition && this.$element.hasClass('fade')?
            this.$backdrop.one($.support.transition.end, $.proxy(this.removeBackdrop, this)) :
            this.removeBackdrop()

        } else if (callback) {
          callback()
        }
      }
  }


 /* MODAL PLUGIN DEFINITION
  * ======================= */

  var old = $.fn.modal

  $.fn.modal = function (option) {
    return this.each(function () {
      var $this = $(this)
        , data = $this.data('modal')
        , options = $.extend({}, $.fn.modal.defaults, $this.data(), typeof option == 'object' && option)
      if (!data) $this.data('modal', (data = new Modal(this, options)))
      if (typeof option == 'string') data[option]()
      else if (options.show) data.show()
    })
  }

  $.fn.modal.defaults = {
      backdrop: true
    , keyboard: true
    , show: true
  }

  $.fn.modal.Constructor = Modal


 /* MODAL NO CONFLICT
  * ================= */

  $.fn.modal.noConflict = function () {
    $.fn.modal = old
    return this
  }


 /* MODAL DATA-API
  * ============== */

  $(document).on('click.modal.data-api', '[data-toggle="modal"]', function (e) {
    var $this = $(this)
      , href = $this.attr('href')
      , $target = $($this.attr('data-target') || (href && href.replace(/.*(?=#[^\s]+$)/, ''))) //strip for ie7
      , option = $target.data('modal') ? 'toggle' : $.extend({ remote:!/#/.test(href) && href }, $target.data(), $this.data())

    e.preventDefault()

    $target
      .modal(option)
      .one('hide', function () {
        $this.focus()
      })
  })

}(window.jQuery);

define("jam/bootstrap/js/bootstrap-modal", function(){});

// Author: Rok Garbas
// Contact: rok@garbas.si
// Version: 1.0
//
// Description:
//    This script is used to provide glue code between iframe and twitter
//    bootstrap modal. And also providing some convinience method for usage in
//    Plone.
//
// License:
//
// Copyright (C) 2010 Plone Foundation
//
// This program is free software; you can redistribute it and/or modify it
// under the terms of the GNU General Public License as published by the Free
// Software Foundation; either version 2 of the License.
//
// This program is distributed in the hope that it will be useful, but WITHOUT
// ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
// FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
// more details.
//
// You should have received a copy of the GNU General Public License along with
// this program; if not, write to the Free Software Foundation, Inc., 51
// Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
//

/*jshint bitwise:true, curly:true, eqeqeq:true, immed:true, latedef:true,
  newcap:true, noarg:true, noempty:true, nonew:true, plusplus:true,
  undef:true, strict:true, trailing:true, browser:true */
/*global define:false */

define('js/plone.overlay',[
  'jquery',
  'js/patterns',
  'js/jquery.iframe',
  'jquery-form',
  'jam/bootstrap/js/bootstrap-transition',
  'jam/bootstrap/js/bootstrap-modal'
], function($, Patterns, IFrame, Form, Transition, Modal, undefined) {
  

  var PloneOverlay = Patterns.Base.extend({
    name: 'plone-overlay',
    jqueryPlugin: 'ploneOverlay',
    defaults: {
      loadingText: 'Loading ...',
      events: {},
      ajaxSubmitOptions: {
        timeout: 5000,
        timeoutText: 'Requests timeouted! You wish to ' +
          '<a href="#" class="retry">retry</a>' +
          ' or ' +
          '<a href="#" class="close">close</a>',
        successError: '.portalMessage.error',
        modalButtons: '.modal-footer',
        contentButtons: '.formControls > input[type="submit"]'
      },
      modalOptions: {
        contentTitle: 'h1.documentFirstHeading',
        contentBody: '#content',
        template: '' +
            '<div class="modal fade"' +
            '     data-pattern="plone-tabs"' +
            '     data-plone-tabs-tabs-klass="nav nav-tabs"' +
            '     data-plone-tabs-tab-klass=""' +
            '     data-plone-tabs-panel-klass="">' +
            '  <div class="modal-header">' +
            '    <h3></h3>' +
            '  </div>' +
            '  <div class="modal-body"></div>' +
            '  <div class="modal-footer"></div>' +
            '</div>',
        templateClose: '<a class="close" data-dismiss="modal">&times;</a>',
        templateTitle: '.modal-header > h3',
        templateBody: '.modal-body',
        templateFooter: '.modal-footer'
      }
    },
    init: function() {
      var self = this;

      // no jquery element passed as first argument this means first argument
      // is options. also this means that showing/hidding of overlay will be
      // handled manually
      if (!self.$el.jquery) {
        self.options = self.$el;
        self.$el = undefined;
      }

      // merge options with defaults
      self.options = $.extend(true, {}, self.defaults, self.options);

      // if our element we passed is link then we setup click event which shows
      // overlay
      if (self.$el && $.nodeName(self.$el[0], 'a')) {
        // element "a" can also give us info where to load modal content from
        if (!self.options.ajaxUrl) {
          self.options.ajaxUrl = self.$el.attr('href');
        }
        // element "a" will also trigger showing of modal when clicked
        self.$el.on('click', function(e) {
          e.stopPropagation();
          e.preventDefault();
          self.show();
        });
      }

      // if modal already passed via options
      if (self.options.modal) {
        self.$modal = $(self.options.modal).hide();
        self.initModal(self.$modal);

      // else options.ajaxUrl is used to load modal
      } else if (self.options.ajaxUrl) {
        self.$modal = self.prepareAjaxLoad(self.options.ajaxUrl);

      // report error since we cant detect what to use for modal
      } else {
        $.error('ploneOverlay can not recognize any content to use as $modal');
      }

      // close overlay if we click on backdrop
      IFrame.$el.on('iframe.click', function(e, original) {
        if (original.which === 1 && $(original.target).hasClass('modal-backdrop')) {
          self.hide();
        }
      });
      // sync scrolling of top frame and current frame
      $(IFrame.document).scroll(function () {
        if (self.$modal && self.$modal.jquery) {
          var backdrop = self.$modal.parents('.modal-backdrop');
          if (backdrop.size() !== 0) {
            backdrop.css({
              'top': -1 * $(IFrame.document).scrollTop(),
              'height': $(IFrame.document).scrollTop() + backdrop.height()
            });
          }
        }
      });
      self.initialTopFrameHeight = $(IFrame.document).height() +
          $('body', IFrame.document).offset().top;

    },
    initOverlay: function($modal) {
      var self = this;

      // handle custom events of overlay
      if (self.options.events) {
        $.each(self.options.events, function(item) {
          var handleEvent,
              tmp = item.split(' '),
              eventName = tmp[0],
              $el = $(tmp.splice(1).join(' '), $modal);
          // custom defined function
          if (typeof self.options.events[item] === 'function') {
            handleEvent = self.options.events[item];

          } else if ($el.size() !== 0) {
            // if inside form we expect this to be handled via ajaxSubmit
            if ($el.parents('form').size() !== 0) {
              handleEvent = self.prepareAjaxSubmit($el, $modal, self.options.events[item]);
            // if link points to url starting with self.options.overlayUrl
            } else if (self.startsWithOverlayUrl($el)) {
              // TODO:
              handleEvent = self.prepareNewModal($el, $modal, self.options.events[item]);
            }
          }
          $el.on(eventName, function(e) {
            if (handleEvent) {
              e.stopPropagation();
              e.preventDefault();
              handleEvent(self, $el, $modal);
            }
          });
        });
      }

      // patterns integration
      Patterns.initialize(self.$modal);
      $('[data-pattern~="tabs"] > li > a', self.$modal).on('shown', function() {
        self.resizeModal(self.$modal);
      });
    },
    initModal: function($modal) {
      var self = this;

      // append element to body
      if ($modal.parents('body').size() === 0) {
        $modal.appendTo('body');
      }

      // initialize modal
      $modal.modal({
          backdrop: 'static',
          dynamic: true,
          keyboard: false,
          show: false
        });

      // stop propagating clicks on modal so that iframe doesn't shrinks
      $modal.on('click', function(e) {
        e.stopPropagation();
      });

      self.initOverlay($modal);

      // initialize hook
      if (self.options.onInitModal) {
        self.options.onModalIniu.call(self);
      }
    },
    resizeModal: function($modal) {
      var self = this,
          modalHeight = self.$modal.height() + self.$modal.offset().top;
      if (IFrame && modalHeight > self.initialTopFrameHeight) {
        $('body', IFrame.document).height(modalHeight);
        self.$modal.parents('.modal-backdrop').height($(IFrame.window).height());
      }
    },
    prepareAjaxLoad: function(ajaxUrl) {
      var self = this;
      return function(callback) {

        // show that overlay is loading content
        self.$modal = self.modalTemplate(self.options.loadingTemplate || $('' +
          '<div>' +
          '  <div id="content">' +
          '    <h1 class="documentFirstHeading">' + self.options.loadingText + '</h1>' +
          '    <div class="progress progress-striped active">' +
          '      <div class="bar" style="width: 100%;"></div>' +
          '    </div>' +
          '  </div>' +
          '</div>'));
        self.initModal(self.$modal.hide());
        self.show();
        self.resizeModal(self.$modal);

        // before ajax request hook
        if (self.options.onBeforeLoad) {
          self.options.onBeforeLoad.call(self);
        }
        if (self.$el) {
          self.$el.trigger('plone.overlay.beforeLoad', [ self ]);
        }

        // remove hash part of url and append prefix to url, eg.
        //   convert -> http://example.com/test/something
        //   into    -> http://example.com/test/++toolbar++/something
        //   if options.baseUrl === 'http://example.com/test
        var ajaxUrl = self.changeAjaxURL(ajaxUrl || self.options.ajaxUrl);

        // do ajax request with prefixed url
        $.get(ajaxUrl, {}, function(response) {

          var responseBody = $((/<body[^>]*>((.|[\n\r])*)<\/body>/im).exec(response)[0]
              .replace('<body', '<div').replace('</body>', '</div>'));

          // from response get content of body
          self.$modal.html('');
          self.$modal.append($('> *', self.modalTemplate(responseBody)));
          self.initOverlay(self.$modal);

          self.resizeModal(self.$modal);

          // after ajax request hook
          if (self.options.onLoaded) {
            self.options.onLoaded.call(self);
          }
          if (self.$el) {
            self.$el.trigger('plone.overlay.loaded', [ self ]);
          }

          // after content is loaded call callback
          if (callback) {
            callback.call(self);
          }
        }, 'html');
      };
    },
    modalTemplate: function($content, options) {
      var self = this;

      options = $.extend(self.options.modalOptions, options || {});

      var $modal = $(options.template),
          $title = $(options.templateTitle, $modal),
          $body = $(options.templateBody, $modal),
          $footer = $(options.templateFooter, $modal);

      // Body
      if (options.contentBody) {
        $body.html($(options.contentBody, $content).html());
      }

      // Title
      if (options.contentTitle) {
        $title.html($(options.contentTitle, $content).html());
        $(options.contentTitle, $body).remove();
      }

      // Footer
      if (options.contentFooter) {
        $body.html($(options.contentFooter, $content).html());
        $(options.contentFooter, $body).remove();
      }

      // Close
      if (options.templateClose && options.templateClose.length !== 0) {
        $(options.templateClose)
          .off('click')
          .on('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            self.hide();
          })
          .insertBefore($title);
      }

      // custom
      if (self.options.modalTemplate) {
        $modal = self.options.modalTemplate($modal);
      }

      return $modal;
    },
    prepareNewModal: function($el, $modal, defaults) {
      console.log('TODO: prepareNewModal');
    },
    prepareAjaxSubmit: function($el, $modal, defaults) {
      var self = this;
      defaults = $.extend({}, self.options.ajaxSubmitOptions, defaults);

      // hide and copy same button to .modal-footer, clicking on button in
      // footer should actually click on button inside form
      $(defaults.contentButtons, $modal).each(function() {
        var $button = $(this);
        $button.clone()
          .appendTo($(defaults.modalButtons, $modal))
          .off('click').on('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            $button.trigger('click');
          });
        $button.hide();
      });

      return function(self, $button, $modal) {

        var options = $.extend({}, defaults, options);

        if (typeof options.contentFilters === 'string') {
          options.contentFilters = [ options.contentFilters ];
        }

        // pass button that was clicked when submiting form
        var extraData = {};
        extraData[$button.attr('name')] = $button.attr('value');

        // loading "spinner"
        $modal
          .append($('<div/>')
            .css({
              position: 'absolute',
              top: $($('> *', $modal)[0]).outerHeight(),
              left: 0,
              width: $modal.width(),
              height: $($('> *', $modal)[1]).outerHeight() +
                      $($('> *', $modal)[2]).outerHeight(),
              background: 'white',
              opacity: '0.6'
            }))
          .append($('' +
              '<div class="progress progress-striped active">' +
              '  <div class="bar" style="width: 100%;"></div>' +
              '</div>')
            .css({
              position: 'absolute',
              left: $modal.width() * 0.1,
              top: ($($('> *', $modal)[1]).outerHeight() +
                    $($('> *', $modal)[2]).outerHeight()) * 0.45,
              width: $modal.width() * 0.8
            }));

        // we return array of options which will be passed to ajaxSubmit
        $el.parents('form').ajaxSubmit($.extend(true, {
          timeout: options.timeout,
          dataType: 'html',
          url: self.changeAjaxURL($el.parents('form').attr('action')),
          error: function(xhr, textStatus, errorStatus) {
            if (textStatus === 'timeout') {
              if (options.onTimeout) {
                options.onTimeout.apply(self, [ xhr, errorStatus ]);
              } else {
                // TODO: show that request timeouted
                var $timeout = $('<p/>').html(options.timeoutText);

                $('a.retry', $timeout).on('click', function(e) {
                  e.stopPropagation();
                  e.preventDefault();
                  self.show();
                });
                $('a.close', $timeout).on('click', function(e) {
                  e.stopPropagation();
                  e.preventDefault();
                  self.hide();
                });

                $('.progress', $modal)
                  .removeClass('progress-striped')
                  .addClass('progress-danger')
                  .after($timeout);

              }

            // on "error", "abort", and "parsererror"
            } else {
              if (options.onError) {
                options.onError.apply(self, [ xhr, textStatus, errorStatus ]);
              } else {
                // TODO: notify about error (when notification center is done)
                self.hide();
              }
            }
          },
          success: function(response, state, xhr, form) {
            var _document = IFrame ? IFrame.document : document,
                responseBody = $((/<body[^>]*>((.|[\n\r])*)<\/body>/im).exec(response)[0]
                    .replace('<body', '<div').replace('</body>', '</div>'));

            // if error is found
            if ($(options.successError, responseBody).size() !== 0) {
              self.$modal.html('');
              self.$modal.append($('> *', self.modalTemplate(responseBody)));
              self.initModalEvents(self.$modal);

              // patterns integration
              if (Patterns) {
                Patterns.initialize(self.$modal);
                $('[data-pattern~="tabs"] > li > a', self.$modal).on('shown', function() {
                  self.resizeModal(self.$modal);
                });
              }

              if (options.onSuccessError) {
                options.onSuccessError.apply(self, [ responseBody, state, xhr, form ]);
              }

            // custom success function
            } else if (options.onSuccess) {
              options.onSuccess.apply(self, [ responseBody, state, xhr, form ]);

            // common save function, we replace what we filtered from response
            } else if (options.contentFilters) {
              $.each(options.contentFilters, function(i, selector) {
                $(selector, _document).html($(selector, responseBody).html());
              });
              self.hide();
            }
          }
        }, { data: extraData }));
      };
    },
    changeAjaxURL: function(ajaxUrl) {

      // strip everything after ? or #
      //ajaxUrl = ajaxUrl.match(/^([^#?]+)/)[1];

      var self = this,
          ajaxUrlPrefix = self.options.ajaxUrlPrefix === undefined ?
              '/++toolbar++' : self.options.ajaxUrlPrefix,
          portalUrl = self.options.portalUrl ||
            $('body', IFrame.document).data('portal-navigation-url') || '';

      if (ajaxUrl.indexOf('http') === 0) {
        return portalUrl + ajaxUrlPrefix + ajaxUrl.substr(portalUrl.length);
      } else {
        if (ajaxUrl.substr(0, 1) === '/') {
          return portalUrl + ajaxUrlPrefix + ajaxUrl;
        } else {
          return portalUrl + ajaxUrlPrefix +
              (window.location.href + '/' + ajaxUrl).substr(portalUrl.length);
        }
      }
    },
    show: function() {
      var self = this;

      // dont show overlay if already shown
      if (self.is_shown === true) {
        return;
      }

      self.is_shown = true;

      // close any opened toolbar dropdown
      $('.toolbar-dropdown-open > a').patternToggle('remove');

      // if self.$modal is function then call it and pass this function as parameter
      // which needs to be called once loading of modal's html has been done
      if (typeof(self.$modal) === 'function') {
        self.$modal(self._show);
      } else {
        self._show();
      }
    },
    _show: function() {
      var self = this;

      IFrame.stretch();

      // show hook
      if (self.options.onShow) {
        self.options.onShow.call(self);
      }
      if (self.$el) {
        self.$el.trigger('plone.overlay.show', [ self ]);
      }

      // showing bootstrap's modal
      self.$modal.modal('show');

      // show hook
      if (self.options.onShown) {
        self.options.onShown.call(self);
      }
      if (self.$el) {
        self.$el.trigger('plone.overlay.shown', [ self ]);
      }

    },
    hide: function() {
      var self = this;

      // dont hide overlay if already shown
      if (self.is_shown !== true) {
        return;
      }

      // hiding of modal is not possible if its not even loaded
      if (typeof(self.$modal) === 'function') {
        return;
      }

      self.is_shown = false;

      // hide hook
      if (self.options.onHide) {
        self.options.onHide.call(self);
      }
      if (self.$el) {
        self.$el.trigger('plone.overlay.hide', [ self ]);
      }

      // calling hide on bootstrap's modal
      self.$modal.modal('hide');

      // remove modal's DOM element
      self.$modal.remove();

      // shrink iframe when hidding overlay
      IFrame.shrink();

      // set content frame to initial height
      $('body', IFrame.document).height(self.initialTopFrameHeight);

      // reinitialize overlay
      if (self.$el) {
        self.$el.off().data('plone-overlay', new PloneOverlay(self.$el, self.options));
      }

      // hidden hook
      if (self.options.onHidden) {
        self.options.onHidden.call(self);
      }
      if (self.$el) {
        self.$el.trigger('plone.overlay.hidden');
      }
    },
    getBaseURL: function(text){
      return $((/<base[^>]*>((.|[\n\r])*)<\/base>/im).exec(text)[0]).attr('href');
    }
  });

  Patterns.register(PloneOverlay);

  return PloneOverlay;
});

// This script will register Plone's overlays for toolbar actions.
//
// @licstart  The following is the entire license notice for the JavaScript
//            code in this page.
//
// Copyright (C) 2010 Plone Foundation
//
// This program is free software; you can redistribute it and/or modify it
// under the terms of the GNU General Public License as published by the Free
// Software Foundation; either version 2 of the License.
//
// This program is distributed in the hope that it will be useful, but WITHOUT
// ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
// FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
// more details.
//
// You should have received a copy of the GNU General Public License along with
// this program; if not, write to the Free Software Foundation, Inc., 51
// Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
//
// @licend  The above is the entire license notice for the JavaScript code in
//          this page.
//

/*jshint bitwise:true, curly:true, eqeqeq:true, immed:true, latedef:true,
  newcap:true, noarg:true, noempty:true, nonew:true, plusplus:true,
  regexp:false, undef:true, strict:true, trailing:true, browser:true */
/*global define:false */

define('js/plone.cmsui',[
  'jquery',
  'js/patterns',
  'js/plone.overlay'
], function($, Patterns, Overlay, undefined) {
  

  var options = $.ploneCMSUIOptions || {};

  $(document).ready(function() {

    // Edit form
    $('#plone-toolbar #plone-action-edit > a').ploneOverlay($.extend(options, {
      events: {
        'click .modal-body input[name="form.button.cancel"]': {},
        'click .modal-body input[name="form.button.save"]': {
          contentFilters: [ '#portal-column-content' ]
        }
      }
    }));

    // Rules form
    $('#plone-toolbar #plone-action-contentrules > a').ploneOverlay($.extend(options, {
    }));

    // Sharing form
    $('#plone-toolbar #plone-action-local_roles > a').ploneOverlay($.extend(options, {
      modalTemplate: function($modal) {
        // FIXME: we should hack like this
        $('#link-presentation', $modal).remove();
        return $modal;
      },
      ajaxSubmitOptions: {
        contentButtons: 'input[name="form.button.Save"],input[name="form.button.Cancel"]'
      },
      events: {
        'click .modal-body input[name="form.button.Search"]': {
          onSuccess: function(responseBody) {
            var self = this;
            self.$modal.html('');
            self.$modal.append($('> *', self.modalTemplate(responseBody)));
            self.initModalEvents(self.$modal);

            // patterns integration
            Patterns.initialize(self.$modal);
            $('[data-pattern~="tabs"] > li > a', self.$modal).on('shown', function() {
              self.resizeModal(self.$modal);
            });
          }
        },
        'click .modal-body input[name="form.button.Cancel"]': {},
        'click .modal-body input[name="form.button.Save"]': {
        }
      }
    }));

    // Delete Action
    $('#plone-toolbar #plone-contentmenu-actions > ul > li#plone-contentmenu-actions-delete > a').ploneOverlay($.extend(options, {
      events: {
        'click .modal-body input[name="form.button.Cancel"]': {},
        'click .modal-body input.destructive': {
          onSuccess: function(responseBody, state, xhr) {
            window.parent.location.href = window.parent.location.href + '/..';
          }
        }
      }
    }));

    // Rename Action
    $('#plone-toolbar #plone-contentmenu-actions > ul > li#plone-contentmenu-actions-rename > a').ploneOverlay($.extend(options, {
      events: {
        'click .modal-body input[name="form.button.Cancel"]': {},
        'click .modal-body input[name="form.button.RenameAll"]': {
          onSuccess: function(responseBody, state, xhr) {
            window.parent.location.href = responseBody.data('context-url') || window.parent.location.href;
          }
        }
      }
    }));

    // Change content item as default view...
    $('#plone-toolbar #plone-contentmenu-display > ul > li#folderChangeDefaultPage > a,' +
      '#plone-toolbar #plone-contentmenu-display > ul > li#contextSetDefaultPage > a').ploneOverlay($.extend(options, {
      modalTemplate: function($modal) {
        // FIXME: we should hack like this
        $('form > dl', $modal).addClass('default-page-listing');
        $('input[name="form.button.Cancel"]', $modal).attr('class', 'standalone');
        return $modal;
      },
      events: {
        'click .modal-body input[name="form.button.Cancel"]': {},
        'click .modal-body input[name="form.button.Save"]': {
          onSuccess: function(responseBody, state, xhr) {
            window.parent.location.href = window.parent.location.href;
          }
        }
      }
    }));

    // Add forms
    $('#plone-toolbar #plone-contentmenu-factories > ul > li:not(#plone-contentmenu-settings) > a').ploneOverlay($.extend(options, {
      events: {
        'click .modal-body input[name="form.button.cancel"]': {},
        'click .modal-body input[name="form.button.save"]': {
          onSuccess: function(responseBody, state, xhr) {
            window.parent.location.href = responseBody.data('context-url') || window.parent.location.href;
          }
        }
      }
    }));

    // "Restrictions..." form
    var restrictionsOverlayOptions = $.extend(options, {
      modalTemplate: function($modal) {
        var $details = $('#details', $modal)
          .removeAttr('style')
          .removeAttr('id')
          .first().parent();

        function show_submenu($modal) {
          if ($('#mode_enable', $modal).is(':checked')) {
            $details.attr({'id': 'details', 'style': ''});
          } else {
            $details.attr({'id': 'details', 'style': 'display:none;'});
          }
        }
        function check_mode($modal, value) {
          // The logic here is that from #6151, comment 12.
          var $preferred = $('#' + value, $modal),
              $allowed = $('#' + value + '_allowed', $modal),
              $allowed_hidden = $('#' + value + '_allowed_hidden', $modal);

          // type is not preferred, so it is not allowed, too.
          // We uncheck and disable (ghost) the allowed checkbox
          if (!$preferred.is(':checked')) {
            $allowed.attr('checked', false);
            $allowed.attr('disabled', true);

          // type _is_ preferred, so user _may_ want to make it
          // an "allowed-only" type by checking the "allowed" checkbox.
          // We need to enable (unghost) the allowed checkbox
          } else {
            $allowed.attr('disabled', false);
          }
        }

        $('input[name="constrainTypesMode:int"]', $modal)
          .removeAttr('onclick')
          .on('click', function() {
            show_submenu($(this).parents('.modal'));
          });
        $('input[name="currentPrefer:list"],input[name="currentAllow:list"]', $modal)
          .removeAttr('onclick')
          .on('click', function() {
            check_mode($(this).parents('.modal'), $(this).attr('id'));
          });
        show_submenu($modal);

        return $modal;
      },
      events: {
        'click .modal-body input[name="form.button.Cancel"]': {},
        'click .modal-body input[name="form.button.Save"]': {
          onSuccess: function(responseBody, state, xhr) {
            var self = this;
            $('#plone-contentmenu-factories').html(
                $('#plone-contentmenu-factories', responseBody).html());
            Patterns.initialize($('#plone-contentmenu-factories'));
            $('#plone-toolbar #plone-contentmenu-factories > ul > li#plone-contentmenu-settings > a').ploneOverlay(restrictionsOverlayOptions);
            self.hide();
          }
        }
      }
    });
    $('#plone-toolbar #plone-contentmenu-factories > ul > li#plone-contentmenu-settings > a').ploneOverlay(restrictionsOverlayOptions);

    // Advance workflow
    $('#plone-toolbar #plone-contentmenu-workflow > ul > li#workflow-transition-advanced > a').ploneOverlay($.extend(options, {
      modalTemplate: function($modal) {
        // FIXME: we should hack like this
        $('#workflow_action', $modal).parent().find('> br').remove();
        return $modal;
      },
      events: {
        'click .modal-body input[name="form.button.Cancel"]': {},
        'click .modal-body input[name="form.button.Publish"]': {}
      }
    }));


    // Site setup
    //$('#plone-toolbar #plone-personal-actions > ul > li#plone-personal-actions-plone_setup a').ploneOverlay({
    //  onShow: function() { $(this).patternToggle('toggle'); },
    //  onLoaded: function() {
    //    var overlay = this,
    //    el = overlay.el;
    //    el.find('a').on('click', function(e){
    //      el.load($(this).attr('href'));
    //      overlay._el = overlay.el = overlay.options.modalTemplate.apply(overlay, [ el ]).hide();
    //      e.stopPropagation();
    //      e.preventDefault();
    //    });
    //  }
    //});

  });

});

if (jQuery) {
  define( "jquery", [], function () { return jQuery; } );
}
define('js/toolbar',[
  'jquery',
  'js/patterns',
  'js/widgets',
  'js/plone.toolbar',
  'js/plone.cmsui'
], function($, Patterns) {

  // Initial initialization of patterns
  $(document).ready(function() {
    Patterns.initialize($(document));
  });

});
require(["js/toolbar"]);
