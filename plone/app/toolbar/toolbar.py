
try:
    import json
except:
    import simplejson as json

from urllib import unquote
from zope.component import getMultiAdapter
from zope.publisher.browser import BrowserView

from plone.memoize.instance import memoize

from Acquisition import aq_inner
from Products.Five.browser.pagetemplatefile import ViewPageTemplateFile


class Toolbar(BrowserView):

    render = ViewPageTemplateFile('templates/toolbar.pt')

    def __init__(self, context, request, view=None):
        super(Toolbar, self).__init__(context, request)
        self.__parent__ = view

        self.context = aq_inner(self.context)
        self.context_url = context.absolute_url()
        self.context_fti = context.getTypeInfo()
        self.request_url = self.request.get('ACTUAL_URL')
        request_url_path = self.request_url[len(self.context_url):]
        if request_url_path.startswith('/'):
            request_url_path = request_url_path[1:]
        self.request_url_path = request_url_path

        self.default_action = 'view'
        self.sort_order = ['folderContents']

        self.context_state = getMultiAdapter((context, self.request),
                name=u'plone_context_state')

    def update(self):
        pass

    #@memoize
    @property
    def action_list(self):
        """ actions registered for
        """
        action_list = []
        actions = self.context_state.actions

        # 'folder' actions
        if self.context_state.is_structural_folder():
            action_list = actions('folder')

        # 'object' actions
        action_list.extend(actions('object'))

        # sort actions
        def sort_buttons(action):
            try:
                return self.sort_order.index(action['id'])
            except ValueError:
                return 255
        action_list.sort(key=sort_buttons)

        return action_list

    #@memoize
    @property
    def buttons(self):
        buttons = []

        selected_button_found = False
        selected_button = None

        for action in self.action_list:
            item = {
                'title': action['title'],
                'id': 'toolbar-button-' + action['id'],
                }

            # button url
            button_url = action['url'].strip()
            if button_url.startswith('http') or \
               button_url.startswith('javascript'):
                item['url'] = button_url
            else:
                item['url'] = '%s/%s' % (self.context_url, button_url)

            # Action method may be a method alias:
            # Attempt to resolve to a template.
            action_method = item['url'].split('/')[-1]
            action_method = self.context_fti.queryMethodID(
                    action_method, default=action_method)

            # Determine if button is selected
            if action_method:
                request_action = unquote(self.request_url_path)
                request_action = self.context_fti.queryMethodID(
                    request_action, default=request_action)
                if action_method == request_action:
                    item['klass'] = 'selected'
                    selected_button_found = True

            if action['id'] == self.default_action:
                selected_button = item

            buttons.append(item)

        if not selected_button_found and selected_button is not None:
            selected_button['klass'] = 'selected'

        return buttons

    def toolbar_initialize_js(self):
        return '$.toolbar.initialize(%s);' % json.dumps({
            'id': 'plone-toolbar',
            'name': 'plone-toolbar',
            'klass': 'plone-toolbar', 
            'buttons': self.buttons,
            })

class ToolbarFallback(BrowserView):
    """ View which is going to be shown when javascript is not available.
    """

    recurse = ViewPageTemplateFile('templates/toolbar_fallback_recurse.pt')

    def __init__(self, context, request):
        super(ToolbarFallback, self).__init__(context, request)
        self.toolbar = getMultiAdapter(
                (context, request, self), name=u'plone_toolbar')

    @property
    def buttons(self):
        return self.toolbar.buttons
