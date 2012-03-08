from plone.app.toolbar.interfaces import IUIView

def UnthemeUI(event):
    request = event.request
    view = request.get('PUBLISHED', None)
    if view is not None and IUIView.providedBy(view):
        request.response.setHeader('X-Theme-Disabled', 'True')
        request['HTTP_X_THEME_ENABLED'] = False
