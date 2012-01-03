
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
        self.portal_state = getMultiAdapter((self.context, self.request),
                name=u'plone_portal_state')
        self.resource_scripts = getMultiAdapter((self.context, self.request),
                name=u'resourceregistries_scripts_view')
        self.resource_styles = getMultiAdapter((self.context, self.request),
                name=u'resourceregistries_styles_view')
        self.tools = getMultiAdapter((self.context, self.request),
                name=u'plone_tools')
        self.anonymous = self.portal_state.anonymous()

        # Set the 'toolbar' skin so that we get the correct resources
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

    @memoize
    def userName(self):
        """Get the username of the currently logged in user
        """

        if self.anonymous:
            return None

        member = self.portal_state.member()
        userid = member.getId()

        membership = self.tools.membership()
        memberInfo = membership.getMemberInfo(userid)

        fullname = userid

        # Member info is None if there's no Plone user object, as when using OpenID.
        if memberInfo is not None:
            fullname = memberInfo.get('fullname', '') or fullname

        return fullname

    @memoize
    def userHomeLinkURL(self):
        """Get the URL of the user's home page (profile age)
        """
        member = self.portal_state.member()
        userid = member.getId()
        return "%s/author/%s" % (self.portal_state.navigation_root_url(), userid)

    @memoize
    def userPortrait(self):
        """Get the URL of the user's portrait
        """
        member = self.portal_state.member()
        membership = self.tools.membership()
        portrait = membership.getPersonalPortrait(member.getId());
        if portrait is not None:
            return portrait.absolute_url()

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
                'category': 'leftactions',
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
                    'title': '<span>' + translate(item['title']) + '</span>',
                    'description': translate(item['description']),
                    'url': item['action'] and item['action'] or '#',
                    'icon': item['icon'],
                    'category': 'rightactions',
                    }

                if item.has_key('extra'):

                    if item['extra'].has_key('id') and item['extra']['id']:
                        button['id'] = 'toolbar-button-'+item['extra']['id']

                    if item['extra'].has_key('class') and item['extra']['class']:
                        if item['extra']['class'] == 'actionMenuSelected':
                            button['klass'] = 'selected'
                        else:
                            button['klass'] = 'label-' + item['extra']['class']

                    if item['extra'].has_key('stateTitle') and item['extra']['stateTitle']:
                        button['title'] += '<span class="%s">%s</span>' % (
                            item['extra'].get('class', ''),
                            item['extra']['stateTitle'],
                            )

                if item['submenu']:
                    button['title'] += '<span> &#9660;</span>'
                    button['submenu'] = contentmenu_buttons(item['submenu'])

                buttons.append(button)

            return buttons

        buttons += contentmenu_buttons()

        # personal actions (Dashboard, Personal Properties, Site Setup)
        buttons.append({
            'title': '<span>%s</span><span> &#9660;</span>' % self.userName(),
            'icon': self.userPortrait(),
            'url': self.userHomeLinkURL(),
            'klass': 'personalactions-user',
            'category': 'personalactions',
            'submenu': [{
                    'title': item['title'],
                    'url': item['url'],
                    'class': item.get('class', ''),
                    'id': item.get('id', ''),
                } for item in self.context_state.actions('user')
                    if item['available']],
            })

        return buttons

    def toolbar_initialize_js(self):
        buttons = self.buttons()
        return '$.plone.toolbar(%s);' % json.dumps({
            'id': 'plone-toolbar',
            'name': 'plone-toolbar',
            'klass': 'plone-toolbar',
            'toolbar_template':
                '<div class="toolbar-wrapper">' + \
                ' <div class="toolbar">' + \
                '  <div class="toolbar-top"></div>' + \
                '  <div class="toolbar-right">' + \
                '   <div class="toolbar-swirl"><div></div></div>' + \
                '   <div class="toolbar-category-personalactions"></div>' + \
                '  </div>' + \
                '  <div class="toolbar-left">' + \
                '   <div class="toolbar-category-rightactions"></div>' + \
                '   <div class="toolbar-category-leftactions"></div>' + \
                '  </div>' + \
                ' </div>' + \
                '</div>',
            'resources_css': self.resource_styles.styles(),
            'resources_js': self.resource_scripts.scripts(),
            'buttons': buttons,
            }, sort_keys=True, indent=4)



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
