import transaction
from AccessControl import Unauthorized
from AccessControl import getSecurityManager
from Acquisition import aq_inner
from Acquisition import aq_parent
from zope.component import getMultiAdapter
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

import json


class FolderContentsView(BrowserView):

    def __call__(self):
        site = getSite()
        base_url = site.absolute_url()
        context_url = self.context.absolute_url()
        base_vocabulary = '%s/@@getVocabulary?name=' % base_url
        options = {
            'ajaxVocabulary': '%splone.app.vocabularies.Catalog' % (
                base_vocabulary),
            'tagsAjaxVocabulary': '%splone.app.vocabularies.Keywords' % (
                base_vocabulary),
            'usersAjaxVocabulary': '%splone.app.vocabularies.Users' % (
                base_vocabulary),
            'indexOptionsUrl': '%s/@@qsOptions' % base_url,
            'buttonGroups': {
                'primary': [{
                    'title': 'Cut',
                }, {
                    'title': 'Copy',
                }, {
                    'title': 'Paste',
                    'url': context_url + '/@@fc-paste'
                }, {
                    'title': 'Delete',
                    'url': context_url + '/@@fc-delete',
                    'context': 'danger'
                }],
                'secondary': [{
                    'title': 'Workflow',
                    'url': context_url + '/@@fc-workflow'
                }, {
                    'title': 'Tags',
                    'url': context_url + '/@@fc-tags'
                }, {
                    'title': 'Properties',
                    'url': context_url + '/@@fc-properties'
                }, {
                    'title': 'Rename',
                    'url': context_url + '/@@fc-rename'
                }],
                'folder': [{
                    'title': 'Order',
                    # {path} is rewritten by javascript to the current
                    # viewed path
                    'url': base_url + '{path}/@@fc-order'
                }]
            },
            'folderOrderModes': [{
                'id': '',
                'title': 'Manual'
            }, {
                'id': 'effectiveDate',
                'title': 'Publication Date'
            }, {
                'id': 'creationDate',
                'title': 'Creation Date'
            }],
            'folderOrder': ''
        }
        self.options = json.dumps(options)
        return super(FolderContentsView, self).__call__()


class FolderContentsActionView(BrowserView):

    success_msg = _('Success')
    failure_msg = _('Failure')

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
        site = getSite()
        context = aq_inner(self.context)
        selection = self.get_selection()

        self.dest = site.restrictedTraverse(
            str(self.request.form['folder'].lstrip('/')))
        self.operation = self.request.form['pasteOperation']

        catalog = getToolByName(context, 'portal_catalog')

        msg = ''
        missing = []
        for uid in selection:
            brains = catalog(UID=uid)
            if len(brains) == 0:
                missing.append(uid)
                continue
            obj = brains[0].getObject()
            msg += self.action(obj) or ''

        return self.message(msg, missing)

    def message(self, msg, missing=[]):
        if len(missing) > 0:
            msg += _('${items} could not be found', mapping={
                'items': str(len(missing))}) + '\n'
        if not msg:
            msg = self.success_msg + '\n' + msg
        else:
            msg = self.failure_msg + '\n' + msg

        return self.json({
            'status': 'success',
            'msg': msg
        })


class PasteAction(FolderContentsActionView):
    success_msg = _('Successfully pasted all items')
    failure_msg = _('Error during paste, some items were not pasted')

    def copy(self, obj):
        mtool = getToolByName(self.context, 'portal_membership')
        title = self.objectTitle(obj)
        if not mtool.checkPermission('Copy or Move', obj):
            return _(u'Permission denied to copy ${title}.',
                     mapping={u'title': title}) + '\n'

        parent = obj.aq_inner.aq_parent
        try:
            parent.manage_copyObjects(obj.getId(), self.request)
        except CopyError:
            return _(u'${title} is not copyable.',
                     mapping={u'title': title}) + '\n'
        return ''

    def cut(self, obj):
        mtool = getToolByName(self.context, 'portal_membership')
        title = self.objectTitle(obj)
        if not mtool.checkPermission('Copy or Move', obj):
            msg = _(u'Permission denied to cut ${title}.',
                    mapping={u'title': title})
            raise Unauthorized(msg)

        try:
            lock_info = obj.restrictedTraverse('@@plone_lock_info')
        except AttributeError:
            lock_info = None

        if lock_info is not None and lock_info.is_locked():
            return _(u'${title} is locked and cannot be cut.',
                     mapping={u'title': title}) + '\n'

        parent = obj.aq_inner.aq_parent
        try:
            parent.manage_cutObjects(obj.getId(), self.request)
        except CopyError:
            return _(u'${title} is not moveable.',
                     mapping={u'title': title}) + '\n'
        return ''

    def action(self, obj):
        if self.operation == 'copy':
            msg = self.copy(obj)
        else:  # cut
            msg = self.cut(obj)
        if msg:
            return msg
        try:
            self.dest.manage_pasteObjects(self.request['__cp'])
        except ConflictError:
            raise
        except Unauthorized:
            # avoid this unfriendly exception text:
            # "You are not allowed to access 'manage_pasteObjects' in this
            # context"
            return _(u'You are not authorized to paste ${title} here.',
                     mapping={u'title': self.objectTitle(obj)})


class DeleteAction(FolderContentsActionView):

    def action(self, obj):
        parent = obj.aq_inner.aq_parent
        title = self.objectTitle(obj)

        try:
            lock_info = obj.restrictedTraverse('@@plone_lock_info')
        except AttributeError:
            lock_info = None

        if lock_info is not None and lock_info.is_locked():
            return _(u'${title} is locked and cannot be deleted.',
                     mapping={u'title': title})
        else:
            parent.manage_delObjects(obj.getId())
            return _(u'${title} has been deleted.',
                     mapping={u'title': title})


class RenameAction(FolderContentsActionView):
    success_msg = _('Items renamed')
    failure_msg = _('Failed to rename all items')

    def __call__(self):
        self.protect()
        context = aq_inner(self.context)

        torename = json.loads(self.request.form['torename'])

        catalog = getToolByName(context, 'portal_catalog')
        mtool = getToolByName(context, 'portal_membership')

        msg = ''
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
                msg += _(u'Permission denied to rename ${title}.',
                         mapping={u'title': title})
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
                msg += _('Error renaming ${title}', mapping={
                    'title': title})

        return self.message(msg, missing)


class TagsAction(FolderContentsActionView):

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

    def action(self, obj):
        pass


class OrderAction(FolderContentsActionView):

    def __call__(self):
        pass


class PropertiesAction(FolderContentsActionView):

    def action(self, obj):
        pass
