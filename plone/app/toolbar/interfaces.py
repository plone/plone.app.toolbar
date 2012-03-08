from zope.interface import Interface
from zope.i18nmessageid import MessageFactory

from plone.app.layout.viewlets import interfaces

_ = MessageFactory(u"plone")


class IToolbarLayer(Interface):
    """Browser layer used to indicate that plone.app.toolbar is installed
    """

class IUIView(Interface):
    """ Browser layer to mark views used in the overlayed ui. """

class IToolbarButtons(interfaces.IContentViews):
    """The viewlet manager for the toolbar buttons."""
