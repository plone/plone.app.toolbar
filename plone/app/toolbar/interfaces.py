from zope.interface import Interface

_ = MessageFactory(u"plone")


class IToolbarLayer(Interface):
    """Browser layer used to indicate that plone.app.toolbar is installed
    """

