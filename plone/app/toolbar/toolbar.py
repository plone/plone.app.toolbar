
try:
    import json
except:
    import simplejson as json

from urllib import unquote
from zope.i18n import translate
from zope.component import getUtility
from zope.component import getMultiAdapter
from zope.publisher.browser import BrowserView
from zope.browsermenu.interfaces import IBrowserMenu

from plone.memoize.instance import memoize

from Acquisition import aq_inner
from Products.Five.browser.pagetemplatefile import ViewPageTemplateFile

class Toolbar(BrowserView):

    render = ViewPageTemplateFile('templates/toolbar.pt')

    def __init__(self, context, request, view=None):
        super(Toolbar, self).__init__(context, request)
        self.__parent__ = view

        self.context = aq_inner(self.context)
        self.context_url = self.context.absolute_url()
        self.context_fti = self.context.getTypeInfo()
        self.request_url = self.request.get('ACTUAL_URL')
        request_url_path = self.request_url[len(self.context_url):]
        if request_url_path.startswith('/'):
            request_url_path = request_url_path[1:]
        self.request_url_path = request_url_path

        self.default_action = 'view'
        self.sort_order = ['folderContents']

        self.context_state = getMultiAdapter((self.context, self.request),
                name=u'plone_context_state')
        self.resource_scripts = getMultiAdapter((self.context, self.request),
                name=u'resourceregistries_scripts_view')
        self.resource_styles = getMultiAdapter((self.context, self.request),
                name=u'resourceregistries_styles_view')

        self.context.changeSkin('toolbar', self.request)

    def update(self):
        pass

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

    def contentmenu(self):
        menu = getUtility(IBrowserMenu, name='plone_contentmenu')
        return menu.getMenuItems(self.context, self.request)

    #@memoize
    def buttons(self):
        buttons = []

        # content actions (eg. Contents, Edit, View, Sharing...)
        selected_button = None
        selected_button_found = False
        for action in self.action_list():
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

        # contentmenu (eg: Display, Add new..., State)
        def contentmenu_buttons(items=self.contentmenu()):
            buttons = []
            for item in items:
                button = {
                    'title': translate(item['title']),
                    'description': translate(item['description']),
                    'url': item['action'] and item['action'] or '#',
                    'icon': item['icon'],
                    }

                if item.has_key('extra'):
                    if item['extra'].has_key('id') and item['extra']['id']:
                        button['id'] = 'toolbar-button-'+item['extra']['id']
                    if item['extra'].has_key('class') and item['extra']['class']:
                        button['klass'] = 'button ' + item['extra']['class']

                if item['submenu']:
                    button['buttons'] = contentmenu_buttons(item['submenu'])

                buttons.append(button)

            return buttons

        buttons += contentmenu_buttons()

        return buttons

    def toolbar_initialize_js(self):
        return '$.toolbar(%s);' % json.dumps({
            'id': 'plone-toolbar',
            'name': 'plone-toolbar',
            'klass': 'plone-toolbar',
            'css_resources': self.resource_styles.styles(),
            'js_resources': self.resource_scripts.scripts(),
            'buttons': self.buttons(),
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
