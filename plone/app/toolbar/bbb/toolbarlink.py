from zope.viewlet.viewlet import ViewletBase

class ToolbarLinkViewlet(ViewletBase):
    
    def getLink(self):
        return self.context.absolute_url()+"/@@portal-toolbar"
