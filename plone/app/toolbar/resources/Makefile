LESSC = lessc
UGLIFYJS = uglifyjs
CSSMIN = cssmin
TARGETS = build/toolbar_init.css build/toolbar_init.js build/toolbar.css build/toolbar.js


all:: clean $(TARGETS)

build:
	mkdir build -p

clean:
	rm -rf $(TARGETS)
	rmdir build


build/toolbar_init.js: build
	$(UGLIFYJS) js/iframe.js > $@

build/toolbar_init.css: build
	$(LESSC) less/toolbar_init.less | $(CSSMIN) >> $@
	sed -i 's@toolbar.png@++resource++plone.app.toolbar.png@g' $@


build/toolbar.js: build
	$(UGLIFYJS) lib/jquery.form.js > $@
	$(UGLIFYJS) js/jquery.iframe.js > $@
	$(UGLIFYJS) js/jquery.mask.js >> $@
	$(UGLIFYJS) js/plone.overlay.js >> $@
	$(UGLIFYJS) js/plone.toolbar.js >> $@
	$(UGLIFYJS) js/plone.cmsui.js >> $@

build/toolbar.css: build
	$(LESSC) less/toolbar.less | $(CSSMIN) >> $@
	sed -i 's@toolbar.png@++resource++plone.app.toolbar.png@g' $@

build/toolbar.png: build
	cp less/toolbar.png $@


.PHONY: all clean
