from zope.interface import Interface


class IToolbarLayer(Interface):
    """Browser layer used to indicate that plone.app.toolbar is installed
    """
class ISiteSetupLayer(IToolbarLayer):
    """Browser layer used for pages of the site setup.
    """