from urllib import unquote
from AccessControl import getSecurityManager
from Acquisition import aq_inner
from zope.interface import implements
from zope.component import getMultiAdapter
from zope.component import getUtility
from zope.component import getUtilitiesFor
from zope.browsermenu.interfaces import IBrowserMenu
from zope.traversing.interfaces import ITraversable
from plone.registry.interfaces import IRegistry
from plone.memoize.instance import memoize
from plone.portlets.interfaces import IPortletManager
from plone.tiles import Tile
from Products.CMFCore.utils import _checkPermission


def ajax_load_url(url):
    if url and not 'ajax_load' in url:
        sep = '?' in url and '&' or '?'  # url parameter seperator
        url = '%s%sajax_load=1' % (url, sep)
    return url


class ToolbarTile(Tile):

    def get_multi_adapter(self, name):
        return getMultiAdapter((self.context, self.request), name=name)

    def __init__(self, context, request):
        super(ToolbarTile, self).__init__(context, request)
        self.context = aq_inner(self.context)

        # Set the 'toolbar' skin so that we get the correct resources

        self.registry = getUtility(IRegistry)
        self.tools = self.get_multi_adapter(u'plone_tools')
        self.scripts_view = self.get_multi_adapter(
            u'resourceregistries_scripts_view')
        self.styles_view = self.get_multi_adapter(
            u'resourceregistries_styles_view')
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

    @memoize
    def resources(self):
        resources = []
        skinname = self.context.getCurrentSkinName()
        self.context.changeSkin(self.registry['plone.app.toolbar.skinname'],
                                self.request)
        for item in self.styles_view.styles() + self.scripts_view.scripts():
            if item['src']:
                resources.append(item['src'])
        self.context.changeSkin(skinname, self.request)
        return resources

    def is_deco_enabled(self):
        try:
            from plone.app.blocks.layoutbehavior import ILayoutAware
            if ILayoutAware.providedBy(self.context):
                return True
        except:
            pass
        return False

    @memoize
    def actions(self):
        if self.request.getURL() == self.context.absolute_url() + '/dashboard':
            return [{
                'id': 'manage-dashboard',
                'title': 'Manage Dashboard',  # TODO: translate
                'url': self.context.absolute_url() + '/@@manage-dashboard'
            }]

        if 'disable_border' in self.request:
            return []

        actions = []

        # 'folder' actions
        if self.context_state.is_structural_folder():
            actions.extend(self.context_state.actions('folder'))

        # 'object' actions
        object_actions = self.context_state.actions('object')
        actions.extend(object_actions)
        if object_actions and \
           _checkPermission('CMFEditions: Access previous versions',
                            self.context):
            history_action = {
                'id': 'content-history',
                'title': 'History',  # TODO: translate
                'url': '%s/@@historyview' % self.context.absolute_url(),
            }
            actions.append(history_action)

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

            # we skip view button
            if item['id'] == 'view':
                continue

            # deco edit button should have a bit different id
            if item['id'] == 'edit' and self.is_deco_enabled():
                item['id'] = 'deco'

            # make sure id is unique
            item['id'] = 'plone-action-' + item['id']

            # button url
            button_url = action['url'].strip()
            if button_url.startswith('http') or \
                    button_url.startswith('javascript'):
                item['url'] = button_url
            else:
                item['url'] = '%s/%s' % (self.context_url, button_url)

            # Append ajax_load=1 to the url. This skips rendering of the
            # Plone border, which makes things a lot faster.
            item['url'] = ajax_load_url(item['url'])

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

    @memoize
    def contentmenu(self):
        if 'disable_border' in self.request:
            return []

        def contentmenu(items):
            buttons = []
            for item in items:
                item['id'] = ''
                item['klass'] = ''
                if 'extra' in item:
                    if 'id' in item['extra'] and item['extra']['id']:
                        item['id'] = item['extra']['id']
                    if 'class' in item['extra'] and item['extra']['class']:
                        if item['extra']['class'] == 'actionMenuSelected':
                            item['klass'] = 'active'
                        else:
                            if 'stateTitle' not in item['extra']:
                                item['klass'] = item['extra']['class']
                    if 'submenu' in item and item['submenu']:
                        item['submenu'] = contentmenu(item['submenu'])
                item['action'] = ajax_load_url(item['action'])

                buttons.append(item)
            return buttons

        plone_contentmenu = getUtility(IBrowserMenu,
                                       name='plone_contentmenu').getMenuItems

        return contentmenu(plone_contentmenu(self.context, self.request))

    @memoize
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

    @memoize
    def user_portrait(self):
        member = self.portal_state.member()
        membership = self.tools.membership()
        portrait = membership.getPersonalPortrait(member.getId())
        if portrait is not None:
            return portrait.absolute_url()

    @memoize
    def user_homeurl(self):
        member = self.portal_state.member()
        userid = member.getId()
        return "%s/author/%s" % (
            self.portal_state.navigation_root_url(), userid)

    @memoize
    def user_actions(self):
        return [
            item for item in self.context_state.actions('user')
            if item['available'] and item['id'] != 'plone_setup'
        ]

    @memoize
    def site_setup(self):
        for item in self.context_state.actions('user'):
            if item['id'] == 'plone_setup' and item['available']:
                item['url'] = ajax_load_url(item['url'])
                return item

    @memoize
    def portlet_managers(self):
        items = []
        sm = getSecurityManager()
        perm = 'plone.app.portlets.ManagePortlets'
        # Bail out if the user can't manage portlets
        if not sm.checkPermission(perm, self.context):
            return items
        blacklist = self.registry.get(
            'plone.app.toolbar.PortletManagerBlacklist', [])
        manager_titles = self.registry.get(
            'plone.app.toolbar.PortletManagerTitles', {})
        managers = getUtilitiesFor(IPortletManager)
        current_url = self.context.absolute_url()
        for manager in managers:
            manager_name = manager[0]
            # Don't show items like 'plone.dashboard1' by default
            if manager_name in blacklist:
                continue
            item = {}
            item['id'] = 'portlet-manager-%s' % manager_name
            # Look up a pretty title in the registry, otherwise
            # generate a human friendly title
            if manager_name in manager_titles:
                item['title'] = manager_titles[manager_name]
            else:
                item['title'] = ' '.join(manager_name.split('.')).title()
            item['url'] = ajax_load_url('%s/@@toolbar-manage-portlets/%s' % (
                current_url, manager_name))

            items.append(item)
        items.sort()
        return items


class ToolbarRequest(object):
    implements(ITraversable)

    def __init__(self, context, request=None):
        self.context = context
        self.request = request
        self.registry = getUtility(IRegistry)

    def traverse(self, name, ignore):
        if self.request is not None:
            # make sure no diazo theme is applied
            self.request.response.setHeader('X-Theme-Disabled', 'True')
            self.request['HTTP_X_THEME_ENABLED'] = False
            # change skin to the one in registry
            self.context.changeSkin(
                self.registry['plone.app.toolbar.skinname'],
                self.request)
        return self.context


class NoDiazoRequest(object):
    implements(ITraversable)

    def __init__(self, context, request=None):
        self.context = context
        self.request = request
        self.registry = getUtility(IRegistry)

    def traverse(self, name, ignore):
        if self.request is not None:
            # make sure no diazo theme is applied
            self.request.response.setHeader('X-Theme-Disabled', 'True')
            self.request['HTTP_X_THEME_ENABLED'] = False
            # change skin to the one in registry
            self.context.changeSkin(
                self.registry['plone.app.toolbar.NoDiazoSkinName'],
                self.request)
        return self.context
