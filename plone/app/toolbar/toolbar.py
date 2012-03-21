from urllib import unquote
from zope.i18n import translate
from zope.component import getMultiAdapter
from zope.component import getUtility
from zope.browsermenu.interfaces import IBrowserMenu
from plone.memoize.instance import memoize
from plone.tiles import Tile

from Acquisition import aq_inner
from Products.Five.browser.pagetemplatefile import ViewPageTemplateFile


class ToolbarTile(Tile):

    render = ViewPageTemplateFile('templates/toolbar.pt')

    def get_multi_adapter(self, name):
        return getMultiAdapter((self.context, self.request), name=name)


    def __init__(self, context, request):
        super(ToolbarTile, self).__init__(context, request)
        self.context = aq_inner(self.context)

        # Set the 'toolbar' skin so that we get the correct resources
        self.context.changeSkin('toolbar', self.request)

        self.tools = self.get_multi_adapter(u'plone_tools')
        self.scripts_view = self.get_multi_adapter(u'resourceregistries_scripts_view')
        self.styles_view = self.get_multi_adapter(u'resourceregistries_styles_view')
        self.context_state = self.get_multi_adapter(u'plone_context_state')
        self.portal_state = self.get_multi_adapter(u'plone_portal_state')
        self.anonymous = self.portal_state.anonymous()

        self.context_url = self.context.absolute_url()
        self.context_fti = self.context.getTypeInfo()
        self.request_url = self.request.get('ACTUAL_URL', '')

        request_url_path = self.request_url[len(self.context_url):]
        if request_url_path.startswith('/'):
            request_url_path = request_url_path[1:]
        self.request_url_path = request_url_path

    #@memoize
    def resources(self):
        resources = []
        for item in self.styles_view.styles() + self.scripts_view.scripts():
            if item['src']:
                # FIXME: definetly not optimal but for now it will be ok
                if 'bootstrap-plone.min.css' in item['src']:
                    resources.append(item['src'].replace('min.css', 'less'))
                    resources.append(
                        item['src'][:-(len('src/bootstrap-plone.min.css'))] +
                        'lib/less-1.3.0.min.js')
                else:
                    resources.append(item['src'])
        return resources

    #@memoize
    def actions(self):
        actions = []

        # 'folder' actions
        if self.context_state.is_structural_folder():
            actions.extend(self.context_state.actions('folder'))

        # 'object' actions
        actions.extend(self.context_state.actions('object'))

        # sort actions
        sort_order = ['folderContents']
        def sort_actions(action):
            try:
                return sort_order.index(action['id'])
            except ValueError:
                return 255
        actions.sort(key=sort_actions)

        # content actions (eg. Contents, Edit, View, Sharing...)
        result = []
        active_action_found = False
        for action in actions:
            item = action

            # make sure id is unique
            item['id'] = 'plone-action-' + item['id']

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

            # Determine if action is activated 
            if action_method:
                request_action = unquote(self.request_url_path)
                request_action = self.context_fti.queryMethodID(
                    request_action, default=request_action)
                if action_method == request_action:
                    item['klass'] = 'active'
                    active_action_found = True

            result.append(item)

        if not active_action_found:
            for action in result:
                if action['id'] == 'plone-toolbar-action-view':
                    action['klass'] = 'active'

        return result

    #@memoize
    def contentmenu(self):
        def contentmenu_actions(items):
            buttons = []
            for item in items:
                item['id'] = ''
                item['klass'] = ''
                if 'extra' in item:
                    if 'id'  in item['extra'] and item['extra']['id']:
                        item['id'] = item['extra']['id']
                    if 'class' in item['extra'] and item['extra']['class']:
                        if item['extra']['class'] == 'actionMenuSelected':
                            item['klass'] = 'active'
                    if 'submenu' in item and item['submenu']:
                        item['submenu'] = contentmenu_actions(item['submenu'])
                buttons.append(item)
            return buttons

        contentmenu = getUtility(IBrowserMenu, name='plone_contentmenu').getMenuItems
        return contentmenu_actions(contentmenu(self.context, self.request))

    #@memoize
    def user_displayname(self):
        """Get the username of the currently logged in user
        """

        if self.anonymous:
            return None

        member = self.portal_state.member()
        userid = member.getId()

        membership = self.tools.membership()
        memberInfo = membership.getMemberInfo(userid)

        fullname = userid

        # Member info is None if there's no Plone user object, as when using
        # OpenID.
        if memberInfo is not None:
            fullname = memberInfo.get('fullname', '') or fullname

        return fullname

    #@memoize
    def user_portrait(self):
        member = self.portal_state.member()
        membership = self.tools.membership()
        portrait = membership.getPersonalPortrait(member.getId())
        if portrait is not None:
            return portrait.absolute_url()

    #@memoize
    def user_homeurl(self):
        member = self.portal_state.member()
        userid = member.getId()
        return "%s/author/%s" % (
                self.portal_state.navigation_root_url(), userid)

    #@memoize
    def user_actions(self):
        actions = self.context_state.actions('user')
        return [item for item in actions if item['available']]


class ToolbarFallback:
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
