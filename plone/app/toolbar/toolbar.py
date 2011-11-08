from zope.component import getMultiAdapter
from zope.component import getUtility
from zope.publisher.browser import BrowserView
from plone.registry.interfaces import IRegistry
from plone.memoize.instance import memoize
from Acquisition import aq_inner
from urllib import unquote

from Acquisition import aq_base
from AccessControl import getSecurityManager
from Products.CMFCore.utils import getToolByName
from Products.CMFPlone.interfaces import IPloneSiteRoot


class Toolbar(BrowserView):
    """The view containing the overlay toolbar
    """

    def __call__(self):
        # Disable theming
        self.request.response.setHeader('X-Theme-Disabled', 'True')

        # Set the CMSUI skin so that we get the correct resources
        self.context.changeSkin('toolbar', self.request)

        # Commonly useful variables
        self.securityManager = getSecurityManager()
        self.anonymous = self.portalState.anonymous()
        self.tools = getMultiAdapter((self.context, self.request), name=u'plone_tools')

        # Render the template
        return self.index()

    # Personal actions

    @property
    @memoize
    def contextState(self):
        return getMultiAdapter((self.context, self.request), name=u'plone_context_state')

    @property
    @memoize
    def portalState(self):
        return getMultiAdapter((self.context, self.request), name=u'plone_portal_state')

    @memoize
    def personalActions(self):
        """Get the personal actions
        """
        actions = []
        for action in self.contextState.actions('user'):
            actions.append({
                'id': action['id'],
                'url': action['url'],
                'title': action['title'],
                'description': action['description'],
            })

        return actions

    @memoize
    def userName(self):
        """Get the username of the currently logged in user
        """
        if self.anonymous:
            return None

        member = self.portalState.member()
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
        member = self.portalState.member()
        userid = member.getId()
        return "%s/author/%s" % (self.portalState.navigation_root_url(), userid)

    @memoize
    def userPortrait(self):
        """Get the URL of the user's portrait
        """

        member = self.portalState.member()
        membership = self.tools.membership()
        portrait = membership.getPersonalPortrait(member.getId());
        return portrait.absolute_url()

    @memoize
    def workflowState(self):
        """Get the name of the workflow state
        """
        state = self.contextState.workflow_state()
        if state is None:
            return None
        workflows = self.tools.workflow().getWorkflowsFor(self.context)
        if workflows:
            for w in workflows:
                if state in w.states:
                    return w.states[state].title or state
        return state

    @memoize
    def editLink(self):
        """Get the URL of the edit action - taking locking into account
        """
        if not self.securityManager.checkPermission('Modify portal content', self.context):
            return None
        if self.contextState.is_locked():
            return self.context.absolute_url() + "/@@toolbar-lock-info"
        objectActions = self.contextState.actions('object')
        for action in objectActions:
            if action['id'] == self.settings.editActionId:
                return "%s?last_referer=%s" % (action['url'], self.context.absolute_url())
        return None

    @memoize
    def settingsActions(self):
        """Render every action other than the excluded ones (edit, view).
        Use the action icon if applicable, but fall back on the default icon.
        """

        actions = []
        objectActions = self.contextState.actions('object')

        defaultIcon = self.portalState.navigation_root_url() + self.settings.defaultActionIcon

        for action in objectActions:
            if action['id'] in self.settings.excludedActionIds:
                continue

            icon = action['icon']
            if not icon:
                icon = defaultIcon

            actions.append({
                'id': action['id'],
                'url': action['url'],
                'title': action['title'],
                'description': action['description'],
                'icon': icon,
            })

        return actions

    @memoize
    def baseURL(self):
        return self.context.absolute_url()

    @memoize
    def prepareObjectTabs(self, default_tab='view',
                          sort_first=['folderContents']):
        """Prepare the object tabs by determining their order and working
        out which tab is selected. Used in global_contentviews.pt
        """
        context = aq_inner(self.context)
        context_url = context.absolute_url()
        context_fti = context.getTypeInfo()

        context_state = getMultiAdapter(
            (context, self.request), name=u'plone_context_state')
        actions = context_state.actions

        action_list = []
        if context_state.is_structural_folder():
            action_list = actions('folder')
        action_list.extend(actions('object'))

        tabs = []
        found_selected = False
        fallback_action = None

        # we use the context-acquired request object here, which is
        # different from the request fetching the tile HTML
        request_url = self.context.REQUEST['ACTUAL_URL']
        request_url_path = request_url[len(context_url):]

        if request_url_path.startswith('/'):
            request_url_path = request_url_path[1:]

        for action in action_list:
            item = {'title': action['title'],
                    'id': action['id'],
                    'url': '',
                    'selected': False}

            action_url = action['url'].strip()
            starts = action_url.startswith
            if starts('http') or starts('javascript'):
                item['url'] = action_url
            else:
                item['url'] = '%s/%s' % (context_url, action_url)

            action_method = item['url'].split('/')[-1]

            # Action method may be a method alias:
            # Attempt to resolve to a template.
            action_method = context_fti.queryMethodID(
                action_method, default=action_method)
            if action_method:
                request_action = unquote(request_url_path)
                request_action = context_fti.queryMethodID(
                    request_action, default=request_action)
                if action_method == request_action:
                    item['selected'] = True
                    found_selected = True

            current_id = item['id']
            if current_id == default_tab:
                fallback_action = item

            tabs.append(item)

        if not found_selected and fallback_action is not None:
            fallback_action['selected'] = True

        def sortOrder(tab):
            try:
                return sort_first.index(tab['id'])
            except ValueError:
                return 255

        tabs.sort(key=sortOrder)
        return tabs

    def object_actions(self):
        context = aq_inner(self.context)
        context_state = getMultiAdapter((context, self.request),
                                        name=u'plone_context_state')

        return context_state.actions('object_actions')

    def icon(self, action):
        return action.get('icon', None)

