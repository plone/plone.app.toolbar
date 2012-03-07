import re

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
from plone.app.toolbar import PloneMessageFactory as _
from plone.app.layout.viewlets import common

from Acquisition import aq_inner
from Products.Five.browser.pagetemplatefile import ViewPageTemplateFile
from Products.Five.browser import metaconfigure


class Toolbar(metaconfigure.ViewMixinForTemplates):

    index = ViewPageTemplateFile('toolbar.pt')

    def __call__(self):
        self.update()
        return super(Toolbar, self).__call__()

    def update(self):
        # Set the 'toolbar' skin so that we get the correct resources
        self.context.changeSkin('toolbar', self.request)


GROUPS_LABELS = {
    'tile-group-structure':
        _(u'tile-group-structure-label', default=u"Structure"),
    'tile-group-media':
        _(u'tile-group-media-label', default=u"Media"),
    'tile-group-fields':
        _(u'tile-group-fields-label', default=u"Fields"),
    'tile-group-other':
        _(u'tile-group-other-label', default=u"Other"),
    }


class ToolbarViewlet(common.ContentViewsViewlet):

    link_target_re = re.compile(r'plone\.app\.toolbar:(.*)')

    def __init__(self, context, request, view=None, manager=None):
        super(ToolbarViewlet, self).__init__(context, request, view, manager)
        self.__parent__ = view

        self.context = aq_inner(self.context)
        self.context_url = self.context.absolute_url()
        self.context_fti = self.context.getTypeInfo()
        self.request_url = self.request.get('ACTUAL_URL', '')
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

    def update(self):
        pass

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

        # Member info is None if there's no Plone user object, as when using
        # OpenID.
        if memberInfo is not None:
            fullname = memberInfo.get('fullname', '') or fullname

        return fullname

    @memoize
    def userHomeLinkURL(self):
        """Get the URL of the user's home page (profile age)
        """
        member = self.portal_state.member()
        userid = member.getId()
        return "%s/author/%s" % (
                self.portal_state.navigation_root_url(), userid)

    @memoize
    def userPortrait(self):
        """Get the URL of the user's portrait
        """
        member = self.portal_state.member()
        membership = self.tools.membership()
        portrait = membership.getPersonalPortrait(member.getId())
        if portrait is not None:
            return portrait.absolute_url()

    @memoize
    def buttons(self):
        buttons = []

        # content actions (eg. Contents, Edit, View, Sharing...)
        selected_button = None
        selected_button_found = False
        for action in self.prepareObjectTabs():
            item = dict(action)
            item.update({
                'id': 'toolbar-button-' + item['id'],
                'group': 'leftactions',
                })

            # button url
            button_url = item['url'].strip()
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

            if item['id'] == self.default_action:
                selected_button = item

            buttons.append(item)

        if not selected_button_found and selected_button is not None:
            selected_button['klass'] = 'selected'

        # contentmenu (eg: Display, Add new..., State)
        def contentmenu_buttons(items, group='default'):
            buttons = []
            for button in items:
                button.update({
                    'title': '<span>' + translate(
                            button['title'],
                            context=self.request,
                            ) + '</span>',
                    'description': translate(
                            button['description'],
                            context=self.request,
                            ),
                    'url': button['action'] and button['action'] or '#',
                    'group': group,
                    })

                if 'extra' in button:

                    if 'id'  in button['extra'] and button['extra']['id']:
                        button['id'] = 'toolbar-button-' + button['extra']['id']

                    if 'class' in button['extra'] and button['extra']['class']:
                        if button['extra']['class'] == 'actionMenuSelected':
                            button['klass'] = 'selected'
                        else:
                            button['klass'] = 'label-' + button['extra']['class']

                    if 'stateTitle' in button['extra'] and \
                            button['extra']['stateTitle']:
                        button['title'] += '<span class="%s">%s</span>' % (
                            button['extra'].get('class', ''),
                            button['extra']['stateTitle'],
                            )

                if button['submenu']:
                    button['title'] += '<span> &#9660;</span>'
                    button['buttons'] = contentmenu_buttons(button['submenu'])

                buttons.append(button)

            return buttons

        buttons += contentmenu_buttons(
                self.contentmenu(), group='rightactions')

        # personal actions (Dashboard, Personal Properties, Site Setup)
        buttons.append({
            'title': '<span>%s</span><span> &#9660;</span>' % self.userName(),
            'icon': self.userPortrait(),
            'url': self.userHomeLinkURL(),
            'klass': 'personalactions-user',
            'group': 'personalactions',
            'id': 'toolbar-button-plone-personalactions',
            'buttons': [{
                    'title': item['title'],
                    'url': item['url'],
                    'class': item.get('class', ''),
                    'id': item.get('id', ''),
                } for item in self.context_state.actions('user')
                    if item['available']],
            })

        for button in buttons:
            match = self.link_target_re.match(
                button.get('link_target') or '')
            if match is not None:
                button['klass'] = (
                    button.get('klass', '') + ' ' + match.group(1)).strip()

        return buttons

    def groups_labels(self):
        # TODO: this needs to be pluggable
        labels = {}
        for item_id in GROUPS_LABELS:
            labels[item_id] = translate(
                    GROUPS_LABELS[item_id],
                    context=self.request,
                    )
        return labels

    def resources(self):
        resources = []
        for item in self.resource_styles.styles() + \
                    self.resource_scripts.scripts():
            if item['src']:
                resources.append(item['src'])
        return resources


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

class OverlayViewlet(common.ViewletBase):
    """ Adds the hidden structure that will become the bootstrap overlay to
        the plone footer. """
    index = ViewPageTemplateFile('templates/overlay.pt')

class UnthemeRequestViewlet(common.ViewletBase):
    """ Allow the theme to be turned off using an http header. """
    def update(self):
        """ If X-Theme-Disabled is set on the request, also set it on the
            response to generate an unthemed response. """
        if bool(self.request.getHeader('X-Theme-Disabled', None)):
            self.request.response.setHeader('X-Theme-Disabled', 'True')
    
    def index(self):
        """ Do nothing, everything happens in update(). """
        return ''
