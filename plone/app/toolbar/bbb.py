from lxml import html
from zope.component import getMultiAdapter
from zope.viewlet.viewlet import ViewletBase


class ToolbarViewlet(ViewletBase):

    def render(self):
        context, request = self.context, self.request
        tile = getMultiAdapter((context, request), name=u'plone.toolbar')

        tile_body = ''
        tree = html.fromstring(tile.index())
        for el in tree.body.getchildren():
            tile_body += html.tostring(el)

        return u'<div style="display:none;" ' + \
            u'     data-iframe="plone-toolbar" ' + \
            u'     data-iframe-resources="%s">%s</div>' % (
                u';'.join(tile.resources()), tile_body)


class NullViewlet(ViewletBase):
    """Simply view that renders an empty string.

    For BBB purposes, to disable certain viewlets, we register an override
    for the same name and context, specific to the ICMSUILayer layer, using
    this class to render nothing.
    """

    def render(self):
        return u""
