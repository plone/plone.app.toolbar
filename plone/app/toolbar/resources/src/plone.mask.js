/**
* stripped down version of jquerytools $.mask which works on top frame
*
*/
(function($) {

    var _window = window.parent,
        _document = _window.document;

    /* one of the greatest headaches in the tool. finally made it */
    function viewport() {

        // the horror case
        if ($.browser.msie) {

            // if there are no scrollbars then use window.height
            var d = $(_document).height(), w = $(_window).height();

            return [
                _window.innerWidth || // ie7+
                _document.documentElement.clientWidth || // ie6
                _document.body.clientWidth, // ie6 quirks mode
                d - w < 20 ? w : d
            ];
        }

        // other well behaving browsers
        return [$(_document).width(), $(_document).height()];
    }

    function call(fn) {
        if (fn) { return fn.call($.mask); }
    }

    var mask, exposed, loaded, config, overlayIndex;

    $.plone = $.plone || {};
    $.plone.mask = {

        load: function(conf) {

            // already loaded ?
            if (loaded) { return this; }

            // configuration
            if (typeof conf == 'string') {
                conf = { color: conf };
            }

            // use latest config
            conf = conf || config;

            config = conf = $.extend($.extend({
                maskId: 'exposeMask',
                loadSpeed: 'slow',
                closeSpeed: 'fast',
                closeOnClick: false,
                closeOnEsc: false,

                // css settings
                zIndex: 400,
                opacity: 0.8,
                startOpacity: 0,
                color: '#000',

                // callbacks
                onLoad: null,
                onClose: null
            }), conf);

            // get the mask
            mask = $("#" + conf.maskId, _document);

            // or create it
            if (!mask.length) {
                mask = $('<div/>').attr("id", conf.maskId);
                $("body", _document).append(mask);
            }

            // set position and dimensions
            var size = viewport();

            mask.css({
                position:'absolute',
                top: 0,
                left: 0,
                width: size[0],
                height: size[1],
                display: 'none',
                opacity: conf.startOpacity,
                zIndex: conf.zIndex
            });

            if (conf.color) {
                mask.css("backgroundColor", conf.color);
            }

            // onBeforeLoad
            if (call(conf.onBeforeLoad) === false) {
                return this;
            }

            // esc button
            if (conf.closeOnEsc) {
                $(_document).on("keydown.mask", function(e) {
                    if (e.keyCode == 27) {
                        $.mask.close(e);
                    }
                });
            }

            // mask click closes
            if (conf.closeOnClick) {
                mask.on("click.mask", function(e) {
                    $.mask.close(e);
                });
            }

            // resize mask when window is resized
            $(_window).on("resize.mask", function() {
                $.mask.fit();
            });

            // reveal mask
            mask.css({display: 'block'}).fadeTo(conf.loadSpeed, conf.opacity, function() {
                $.mask.fit();
                call(conf.onLoad);
                loaded = "full";
            });

            loaded = true;
            return this;
        },

        close: function() {
            if (loaded) {

                // onBeforeClose
                if (call(config.onBeforeClose) === false) { return this; }

                mask.fadeOut(config.closeSpeed, function() {
                    call(config.onClose);
                    if (exposed) {
                        exposed.css({zIndex: overlayIndex});
                    }
                    loaded = false;
                });

                // unbind various event listeners
                $(_document).off("keydown.mask");
                mask.off("click.mask");
                $(_window).off("resize.mask");
            }

            return this;
        },

        fit: function() {
            if (loaded) {
                var size = viewport();
                mask.css({width: size[0], height: size[1]});
            }
        },

        getMask: function() {
            return mask;
        },

        isLoaded: function(fully) {
            return fully ? loaded == 'full' : loaded;
        },

        getConf: function() {
            return config;
        }
    };

})(jQuery);
