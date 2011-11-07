from zope.interface import Interface
from zope.i18nmessageid import MessageFactory

_ = MessageFactory(u"plone")


class IToolbarLayer(Interface):
    """Browser layer used to indicate that plone.app.toolbar is installed
    """

