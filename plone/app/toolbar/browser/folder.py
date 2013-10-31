import transaction
from AccessControl import Unauthorized
from AccessControl import getSecurityManager
from Acquisition import aq_inner
from Acquisition import aq_parent
from zope.component import getMultiAdapter
from zope.component import getUtility
from OFS.CopySupport import CopyError
from Products.CMFCore.utils import getToolByName
from Products.Five import BrowserView
from Products.CMFPlone import utils
from Products.CMFPlone import PloneMessageFactory as _
from plone.protect.postonly import check as checkpost
from ZODB.POSException import ConflictError
from zope.component.hooks import getSite
from zope.event import notify
from zope.lifecycleevent import ObjectModifiedEvent
from plone.folder.interfaces import IExplicitOrdering
from Products.CMFPlone.interfaces.siteroot import IPloneSiteRoot
from DateTime import DateTime
from Products.CMFCore.interfaces._content import IFolderish
from zope.browsermenu.interfaces import IBrowserMenu

import json


class FolderContentsView(BrowserView):

    def __call__(self):
        site = getSite()
        base_url = site.absolute_url()
        base_vocabulary = '%s/@@getVocabulary?name=' % base_url
        site_path = site.getPhysicalPath()
        context_path = self.context.getPhysicalPath()
        options = {
            'vocabularyUrl': '%splone.app.vocabularies.Catalog' % (
                base_vocabulary),
            'tagsVocabularyUrl': '%splone.app.vocabularies.Keywords' % (
                base_vocabulary),
            'usersVocabularyUrl': '%splone.app.vocabularies.Users' % (
                base_vocabulary),
            'uploadUrl': '%s{path}/fileUpload' % base_url,
            'moveUrl': '%s{path}/fc-itemOrder' % base_url,
            'indexOptionsUrl': '%s/@@qsOptions' % base_url,
            'contextInfoUrl': '%s{path}/@@fc-contextInfo' % base_url,
            'setDefaultPageUrl': '%s{path}/@@fc-setDefaultPage' % base_url,
            'buttonGroups': {
                'primary': [{
                    'title': 'Cut',
                }, {
                    'title': 'Copy',
                }, {
                    'title': 'Paste',
                    'url': base_url + '/@@fc-paste'
                }, {
                    'title': 'Delete',
                    'url': base_url + '/@@fc-delete',
                    'context': 'danger',
                    'icon': 'trash'
                }],
                'secondary': [{
                    'title': 'Workflow',
                    'url': base_url + '/@@fc-workflow'
                }, {
                    'title': 'Tags',
                    'url': base_url + '/@@fc-tags'
                }, {
                    'title': 'Properties',
                    'url': base_url + '/@@fc-properties'
                }, {
                    'title': 'Rename',
                    'url': base_url + '/@@fc-rename'
                }]
            },
            'basePath': '/' + '/'.join(context_path[len(site_path):])
        }
        self.options = json.dumps(options)
        return super(FolderContentsView, self).__call__()


class FolderContentsActionView(BrowserView):

    success_msg = _('Success')
    failure_msg = _('Failure')
    required_obj_permission = None

    def objectTitle(self, obj):
        context = aq_inner(obj)
        title = utils.pretty_title_or_id(context, context)
        return utils.safe_unicode(title)

    def protect(self):
        authenticator = getMultiAdapter((self.context, self.request),
                                        name='authenticator')
        if not authenticator.verify():
            raise Unauthorized
        checkpost(self.request)

    def json(self, data):
        self.request.response.setHeader("Content-Type", "application/json")
        return json.dumps(data)

    def get_selection(self):
        selection = self.request.form.get('selection', '[]')
        return json.loads(selection)

    def action(self, obj):
        """
        fill in this method to do action against each item in the selection
        """
        pass

    def __call__(self):
        self.protect()
        self.errors = []
        site = getSite()
        context = aq_inner(self.context)
        selection = self.get_selection()

        self.dest = site.restrictedTraverse(
            str(self.request.form['folder'].lstrip('/')))

        self.catalog = getToolByName(context, 'portal_catalog')
        self.mtool = getToolByName(self.context, 'portal_membership')

        for brain in self.catalog(UID=selection):
            selection.remove(brain.UID)  # remove everyone so we know if we
                                         # missed any
            obj = brain.getObject()
            if self.required_obj_permission:
                if not self.mtool.checkPermission(self.required_obj_permission,
                                                  obj):
                    self.errors.append(_('Permission denied for "${title}"',
                                         mapping={
                                             'title': self.objectTitle(obj)
                                         }))
            self.action(obj)

        return self.message(selection)

    def message(self, missing=[]):
        if len(missing) > 0:
            self.errors.append(_('${items} could not be found', mapping={
                'items': str(len(missing))}))
        if not self.errors:
            msg = self.success_msg
        else:
            msg = self.failure_msg

        return self.json({
            'status': 'success',
            'msg': '%s: %s' % (msg, '\n'.join(self.errors))
        })


class PasteAction(FolderContentsActionView):
    success_msg = _('Successfully pasted all items')
    failure_msg = _('Error during paste, some items were not pasted')
    required_obj_permission = 'Copy or Move'

    def copy(self, obj):
        title = self.objectTitle(obj)
        parent = obj.aq_inner.aq_parent
        try:
            parent.manage_copyObjects(obj.getId(), self.request)
        except CopyError:
            self.errors.append(_(u'${title} is not copyable.',
                                 mapping={u'title': title}))

    def cut(self, obj):
        title = self.objectTitle(obj)

        try:
            lock_info = obj.restrictedTraverse('@@plone_lock_info')
        except AttributeError:
            lock_info = None

        if lock_info is not None and lock_info.is_locked():
            self.errors.append(_(u'${title} is locked and cannot be cut.',
                                 mapping={u'title': title}))

        parent = obj.aq_inner.aq_parent
        try:
            parent.manage_cutObjects(obj.getId(), self.request)
        except CopyError:
            self.errors.append(_(u'${title} is not moveable.',
                                 mapping={u'title': title}))

    def action(self, obj):
        operation = self.request.form['pasteOperation']
        if operation == 'copy':
            self.copy(obj)
        else:  # cut
            self.cut(obj)
        if self.errors:
            return
        try:
            self.dest.manage_pasteObjects(self.request['__cp'])
        except ConflictError:
            raise
        except Unauthorized:
            # avoid this unfriendly exception text:
            # "You are not allowed to access 'manage_pasteObjects' in this
            # context"
            self.errors.append(
                _(u'You are not authorized to paste ${title} here.',
                    mapping={u'title': self.objectTitle(obj)}))


class DeleteAction(FolderContentsActionView):

    def action(self, obj):
        parent = obj.aq_inner.aq_parent
        title = self.objectTitle(obj)

        try:
            lock_info = obj.restrictedTraverse('@@plone_lock_info')
        except AttributeError:
            lock_info = None

        if lock_info is not None and lock_info.is_locked():
            self.errors.append(_(u'${title} is locked and cannot be deleted.',
                                 mapping={u'title': title}))
            return
        else:
            parent.manage_delObjects(obj.getId())


class RenameAction(FolderContentsActionView):
    success_msg = _('Items renamed')
    failure_msg = _('Failed to rename all items')

    def __call__(self):
        self.errors = []
        self.protect()
        context = aq_inner(self.context)

        torename = json.loads(self.request.form['torename'])

        catalog = getToolByName(context, 'portal_catalog')
        mtool = getToolByName(context, 'portal_membership')

        missing = []
        for data in torename:
            uid = data['UID']
            brains = catalog(UID=uid)
            if len(brains) == 0:
                missing.append(uid)
                continue
            obj = brains[0].getObject()
            title = self.objectTitle(obj)
            if not mtool.checkPermission('Copy or Move', obj):
                self.errors(_(u'Permission denied to rename ${title}.',
                              mapping={u'title': title}))
                continue

            sp = transaction.savepoint(optimistic=True)

            newid = data['newid'].encode('utf8')
            newtitle = data['newtitle']
            try:
                obid = obj.getId()
                title = obj.Title()
                change_title = newtitle and title != newtitle
                if change_title:
                    getSecurityManager().validate(obj, obj, 'setTitle',
                                                  obj.setTitle)
                    obj.setTitle(newtitle)
                    notify(ObjectModifiedEvent(obj))
                if newid and obid != newid:
                    parent = aq_parent(aq_inner(obj))
                    parent.manage_renameObjects((obid,), (newid,))
                elif change_title:
                    # the rename will have already triggered a reindex
                    obj.reindexObject()
            except ConflictError:
                raise
            except Exception:
                sp.rollback()
                self.errors.append(_('Error renaming ${title}', mapping={
                    'title': title}))

        return self.message(missing)


class TagsAction(FolderContentsActionView):
    required_obj_permission = 'Modify portal content'

    def __call__(self):
        self.remove = set(json.loads(self.request.form.get('remove')))
        self.add = set(json.loads(self.request.form.get('add')))
        return super(TagsAction, self).__call__()

    def action(self, obj):
        tags = set(obj.Subject())
        tags = tags - self.remove
        tags = tags | self.add
        obj.setSubject(list(tags))
        obj.reindexObject()


class WorkflowAction(FolderContentsActionView):
    required_obj_permission = 'Modify portal content'

    def __call__(self):
        self.pworkflow = getToolByName(self.context, 'portal_workflow')
        self.putils = getToolByName(self.context, 'plone_utils')
        self.transition_id = self.request.form.get('transition', None)
        self.comments = self.request.form.get('comments', '')
        self.recurse = self.request.form.get('recurse', 'no') == 'yes'
        if self.request.REQUEST_METHOD == 'POST':
            return super(WorkflowAction, self).__call__()
        else:
            # for GET, we return available transitions
            selection = self.get_selection()
            catalog = getToolByName(self.context, 'portal_catalog')
            brains = catalog(UID=selection)
            transitions = []
            for brain in brains:
                obj = brain.getObject()
                for transition in self.pworkflow.getTransitionsFor(obj):
                    tdata = {
                        'id': transition['id'],
                        'title': transition['name']
                    }
                    if tdata not in transitions:
                        transitions.append(tdata)
            return self.json({
                'transitions': transitions
            })

    def action(self, obj):
        transitions = self.pworkflow.getTransitionsFor(obj)
        if self.transition_id in [t['id'] for t in transitions]:
            try:
                # set effective date if not already set
                if obj.EffectiveDate() == 'None':
                    obj.setEffectiveDate(DateTime())

                self.pworkflow.doActionFor(obj, self.transition_id,
                                           comment=self.comments)
                if self.putils.isDefaultPage(obj):
                    self.action(obj.aq_parent.aq_parent)
                if self.recurse and IFolderish.providedBy(obj):
                    for sub in obj.values():
                        self.action(sub)
            except ConflictError:
                raise
            except Exception:
                self.errors.append('Could not transition: %s' % (
                    self.objectTitle(obj)))


class PropertiesAction(FolderContentsActionView):
    success_msg = _(u'Successfully updated metadata')
    failure_msg = _(u'Failure updating metadata')
    required_obj_permission = 'Modify portal content'

    def __call__(self):
        self.effectiveDate = self.request.form['effectiveDate']
        effectiveTime = self.request.form['effectiveTime']
        if effectiveTime:
            self.effectiveDate = self.effectiveDate + ' ' + effectiveTime
        self.expirationDate = self.request.form['expirationDate']
        expirationTime = self.request.form['expirationTime']
        if expirationTime:
            self.expirationDate = self.expirationDate + ' ' + expirationTime
        self.copyright = self.request.form.get('copyright', '')
        self.contributors = json.loads(
            self.request.form.get('contributors', '[]'))
        self.creators = json.loads(self.request.form.get('creators', '[]'))
        self.exclude = self.request.form.get('exclude_from_nav', None)
        return super(PropertiesAction, self).__call__()

    def action(self, obj):
        if self.effectiveDate:
            obj.setEffectiveDate(DateTime(self.effectiveDate))
        if self.expirationDate:
            obj.setExpirationDate(DateTime(self.expirationDate))
        if self.copyright:
            obj.setRights(self.copyright)
        if self.contributors:
            obj.setContributors([c['id'] for c in self.contributors])
        if self.creators:
            obj.setCreators([c['id'] for c in self.creators])
        if self.exclude:
            obj.setExcludeFromNav(self.exclude == 'yes')
        obj.reindexObject()


class ItemOrder(FolderContentsActionView):
    success_msg = _('Successfully moved item')
    failure_msg = _('Error moving item')

    def getOrdering(self):
        if IPloneSiteRoot.providedBy(self.context):
            return self.context
        else:
            ordering = self.context.getOrdering()
            if not IExplicitOrdering.providedBy(ordering):
                return None
            return ordering

    def __call__(self):
        self.errors = []
        self.protect()
        id = self.request.form.get('id')
        ordering = self.getOrdering()
        delta = self.request.form['delta']
        subset_ids = json.loads(self.request.form.get('subset_ids', '[]'))

        if delta == 'top':
            ordering.moveObjectsToTop([id])
        elif delta == 'bottom':
            ordering.moveObjectsToBottom([id])
        else:
            delta = int(delta)
            if subset_ids:
                position_id = [(ordering.getObjectPosition(i), i)
                               for i in subset_ids]
                position_id.sort()
                if subset_ids != [i for position, i in position_id]:
                    self.errors.append(_('Client/server ordering mismatch'))
                    return self.message()

            ordering.moveObjectsByDelta([id], delta)
        return self.message()


class SetDefaultPage(FolderContentsActionView):
    success_msg = _(u'Default page set successfully')
    failure_msg = _(u'Failed to set default page')

    def __call__(self):
        id = self.request.form.get('id')
        self.errors = []

        if id not in self.context.objectIds():
            self.errors.append(
                _(u'There is no object with short name '
                  u'${name} in this folder.',
                  mapping={u'name': id}))
        else:
            self.context.setDefaultPage(id)
        return self.message()


class ContextInfo(BrowserView):

    def __call__(self):
        factories_menu = getUtility(
            IBrowserMenu, name='plone_contentmenu_factory',
            context=self.context).getMenuItems(self.context, self.request)
        factories_menu = [m for m in factories_menu
                          if m.get('title') != 'folder_add_settings']
        return json.dumps({
            'addButtons': factories_menu,
            'defaultPage': self.context.getDefaultPage()
        })
