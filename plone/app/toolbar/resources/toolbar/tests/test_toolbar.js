var toolbar_original = $.extend(true, {}, $.toolbar);

module('toolbar.js', {
    setup: function() {
        $.toolbar = toolbar_original;
    },
    teardown: function() {
        $('#' + $.toolbar.defaults.iframe_id).remove();
    }
});

test('Utilities: outerHtml and Micro Templating', function() {
    var outerHtml = $.toolbar._.outerHtml,
        template = $.toolbar._.template;

    equal(outerHtml(template('<li><a href="#" class="link"/><li>',
            {'.link': 'Link'})), '<li><a href="#" class="link">Link</a></li>',
        'check if simple templating is working.');

    // TODO: add tests for outerHtml
    equal(outerHtml($('<div>example</div>')), '<div>example</div>',
        'check if outerHtml returns html and the element');

});

test('Namespace', function() {

    notEqual($.toolbar, undefined,
        'check if toolbar namespace exists');

    equal($.toolbar.testing, true,
        'check if variable set on $.toolbar stays there after toolbar is ' +
        'initialized');

});

test('Options', function() {

    equal($.toolbar.defaults.iframe_id, 'testing-toolbar',
        'check if default option will be set globally on the ' +
            '$.toolbar.defaults object');

});

test('Resource', function() {
    var Resource = $.toolbar._.Resource, resource;


    resource = new Resource('example.css');
    equal(resource.render_as_string(), '<link href="example.css" ' +
            'media="screen" rel="stylesheet" type="text/css">',
        'check if css resources passed as string renders correctly');

    resource = new Resource('example.js');
    equal(resource.render_as_string(), '<script type="text/javascript" ' +
            'src="example.js"></script>',
        'check if javascript resources passed as string renders correctly');

    resource = new Resource('css!example');
    equal(resource.render_as_string(), '<link href="example" ' +
            'media="screen" rel="stylesheet" type="text/css">',
        'check if css resource passed is passed with bang syntax');

    resource = new Resource('js!example');
    equal(resource.render_as_string(), '<script type="text/javascript" ' +
            'src="example"></script>',
        'check if javascript resource passed is passed with bang syntax');

    resource = new Resource('example.css', {media:"example"});
    equal(resource.render_as_string(), '<link href="example.css" ' +
            'media="example" rel="stylesheet" type="text/css">',
        'check if css resources passed as object renders correctly and sets ' +
            'additional attribute on element');

    resource = new Resource('example.js', {id:"example"});
    equal(resource.render_as_string(), '<script type="text/javascript" ' +
            'src="example.js" id="example"></script>',
        'check if javascript resources passed as object renders correctly ' +
            'and sets additional attribute on element');

});

test('Buttons and Groups', function() {
    var outerHtml = $.toolbar._.outerHtml,
        Button = $.toolbar._.Button,
        button = new Button([], {
            groups_labels: { 'example': 'Example group' }
            }),
        el_button;

    el_button = button.render();
    equal(outerHtml(el_button), '<li class="toolbar-button" id=""><a ' +
            'class="" href="#"></a></li>',
        'check most simple button');

    // set all options (also icon, no exec and buttons)
    el_button = button.render({
        url: 'http://example.com/example-link.html',
        id: 'example',
        klass: 'example',
        title: 'Example',
        icon: 'http://example.com/example-image.jpg'
    });
    equal(outerHtml(el_button), '<li class="toolbar-button" ' +
            'id="example"><a class="example" ' +
            'href="http://example.com/example-link.html"><img ' +
            'src="http://example.com/example-image.jpg">Example</a></li>',
        'check buttons with all options set.');

    // empty submenu
    el_button = button.render({ buttons: [] });
    equal(outerHtml(el_button), '<li class="toolbar-button" ' +
            'id=""><a class="" href="#"></a></li>',
        'check if empty submenu is created - it shouldn\'t be');

    // submenu default group
    el_button = button.render({
        buttons: [{
            url: 'http://example.com/example-link.html',
            id: 'example',
            klass: 'example',
            title: 'Example',
            icon: 'http://example.com/example-image.jpg'
        }]
    });
    equal(outerHtml(el_button), '<li class="toolbar-button" id=""><a ' +
            'class="" href="#"></a><div style="display: none;" ' +
            'class="toolbar-groups"><ul class="toolbar-group-default"><li ' +
            'class="toolbar-button" id="example"><a class="example" ' + 
            'href="http://example.com/example-link.html"><img ' +
            'src="http://example.com/example-image.jpg">Example</a></li>' +
            '</ul></div></li>',
        'check if one button submenu can be created in default group');

    // submenu with default and example group
    el_button = button.render({
        buttons: [{
            url: 'http://example.com/example-link.html',
            id: 'example1',
            klass: 'example1',
            title: 'Example1',
            icon: 'http://example.com/example-image.jpg'
        }, {
            url: 'http://example.com/example-link.html',
            id: 'example2',
            klass: 'example2',
            title: 'Example2',
            group: 'example',
            icon: 'http://example.com/example-image.jpg'
        }]
    });
    equal(outerHtml(el_button), '<li class="toolbar-button" id=""><a ' +
            'class="" href="#"></a><div style="display: none;" ' +
            'class="toolbar-groups"><ul class="toolbar-group-default"><li ' +
            'class="toolbar-button" id="example1"><a class="example1" ' +
            'href="http://example.com/example-link.html"><img ' +
            'src="http://example.com/example-image.jpg">Example1</a></li>' +
            '</ul><h3>Example group</h3><ul class="toolbar-group-example">' +
            '<li class="toolbar-button" id="example2"><a class="example2" ' +
            'href="http://example.com/example-link.html"><img ' +
            'src="http://example.com/example-image.jpg">Example2</a></li>' +
            '</ul></div></li>',
        'check if one button submenu can be created in default group');

    var button_title, button_html;
    el_button = button.render({
        title: 'Example',
        exec: function(button2, options) {
            button_html = outerHtml(this);
            button_check = button2 === button;
            button_title = options.title;
        }
    });
    equal(button_html, '<li class="toolbar-button" id=""><a class="" ' +
            'href="#">Example</a></li>',
        'check that you can access button element in exec function');
    equal(button_check, true,
        'check if button in exec funtion is the same as the one we ' +
            'instantiate with');
    equal(button_title, 'Example',
        'check if button options that we passed initially can be access in ' +
            'exec function');
});

test('Toolbar and jQuery integration', function() {
    var outerHtml = $.toolbar._.outerHtml,
        toolbar_el = $('<iframe/>').prependTo($('body')),
        Toolbar = $.toolbar._.Toolbar,
        toolbar = new Toolbar(toolbar_el);

    equal(outerHtml(toolbar.render()), '<div ' +
            'class="toolbar-wrapper"><div id="toolbar"></div></div>',
        'check if toolbar can be created with no buttons.');

    equal(outerHtml(toolbar.render([{ title: 'Example' }])), '<div ' +
            'class="toolbar-wrapper"><div id="toolbar"><ul ' +
            'class="toolbar-group-default"><li class="toolbar-button" id="">' +
            '<a class="" href="#">Example</a></li></ul></div></div>',
        'check if buttons can be passed to toolbar.');

//    equal(toolbar.el.toolbar(), toolbar,
//        'check if jquery integration works');

// shrinking
// stretching
// open submenu

});
