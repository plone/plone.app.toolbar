from plone.app.portlets.browser.manage import ManageContextualPortlets


class ManagePortlets(ManageContextualPortlets):

    def __init__(self, context, request):
        super(ManagePortlets, self).__init__(context, request)
        # Disable the left and right columns
        self.request.set('disable_plone.leftcolumn', 1)
        self.request.set('disable_plone.rightcolumn', 1)
        # Initialize the manager name in case there is nothing
        # in the traversal path
        self.manager_name = 'plone.leftcolumn'

    def publishTraverse(self, request, name):
        """Get the portlet manager via traversal so that we can re-use
        the portlet machinery without overriding it all here.
        """
        self.manager_name = name
        return self
