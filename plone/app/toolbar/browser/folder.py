from AccessControl import Unauthorized
from zope.component import getMultiAdapter
from OFS.CopySupport import CopyError
from Acquisition import aq_inner
from Acquisition import aq_parent
from Products.CMFCore.utils import getToolByName
from Products.Five import BrowserView
from Products.CMFPlone import utils
from Products.CMFPlone import PloneMessageFactory as _
from plone.protect.postonly import check as checkpost
from ZODB.POSException import ConflictError
from Products.CMFCore.exceptions import ResourceLockedError
from Products.PythonScripts.standard import url_unquote
from zope.component.hooks import getSite

import json


class FolderContentsView(BrowserView):

    def __call__(self):
        site = getSite()
        base_url = site.absolute_url()
        base_vocabulary = '%s/@@getVocabulary?name=' % base_url
        options = {
            'ajaxVocabulary': '%splone.app.vocabularies.Catalog' % (
                base_vocabulary),
            'tagsAjaxVocabulary': '%splone.app.vocabularies.Keywords' % (
                base_vocabulary),
            'usersAjaxVocabulary': '%splone.app.vocabularies.Users' % (
                base_vocabulary),

        }
        self.options = json.dumps(options)
        return super(FolderContentsView, self).__call__()


class FolderContentsActionView(BrowserView):

    def objectTitle(self):
        context = aq_inner(self.context)
        title = utils.pretty_title_or_id(context, context)
        return utils.safe_unicode(title)

    def protect(self):
        authenticator = getMultiAdapter((self.context, self.request),
                                        name='authenticator')
        if not authenticator.verify():
            raise Unauthorized
        checkpost(self.request)

    def paste(self):
        self.protect()
        context = aq_inner(self.context)

        msg = _(u'Copy or cut one or more items to paste.')
        return json.dumps({
            'status': 'success',
            'msg': msg
        })

    def delete(self):
        self.protect()
        context = aq_inner(self.context)
        request = self.request
        parent = aq_parent(context)
        title = self.objectTitle()
        plone_utils = getToolByName(context, 'plone_utils')

        lock_info = getMultiAdapter((context, request),
                                    name='plone_lock_info')

        if lock_info is not None and lock_info.is_locked():
            message = _(u'${title} is locked and cannot be deleted.',
                mapping={u'title': title})
            plone_utils.addPortalMessage(message, type='error')
            return request.response.redirect(context.absolute_url())
        else:
            parent.manage_delObjects(context.getId())
            message = _(u'${title} has been deleted.',
                mapping={u'title': title})
            utils.transaction_note('Deleted %s' % context.absolute_url())
            plone_utils.addPortalMessage(message)
            return request.response.redirect(parent.absolute_url())

    def rename(self, paths=[], new_ids=[], new_titles=[]):
        self.protect()
        context = aq_inner(self.context)
        req = self.request
        plone_utils = getToolByName(context, 'plone_utils')
        orig_template = req.get('orig_template', None)
        change_template = paths and orig_template is not None
        message = None
        if change_template:
            # We were called by 'object_rename'.  So now we take care that the
            # user is redirected to the object with the new id.
            portal_url = getToolByName(context, 'portal_url')
            portal = portal_url.getPortalObject()
            obj = portal.restrictedTraverse(paths[0])
            new_id = new_ids[0]
            obid = obj.getId()
            if new_id and new_id != obid:
                orig_path = obj.absolute_url_path()
                # replace the id in the object path with the new id
                base_path = orig_path.split('/')[:-1]
                base_path.append(new_id)
                new_path = '/'.join(base_path)
                orig_template = orig_template.replace(url_unquote(orig_path),
                                                      new_path)
                req.set('orig_template', orig_template)
                message = _(u"Renamed '${oldid}' to '${newid}'.",
                            mapping={u'oldid': obid, u'newid': new_id})

        success, failure = plone_utils.renameObjectsByPaths(
            paths, new_ids, new_titles, REQUEST=req)

        if message is None:
            message = _(u'${count} item(s) renamed.',
                        mapping={u'count': str(len(success))})

        if failure:
            message = _(u'The following item(s) could not be '
                        u'renamed: ${items}.',
                        mapping={u'items': ', '.join(failure.keys())})

        context.plone_utils.addPortalMessage(message)
        return self.redirectFolderContents()

    def tags(self):
        pass

    def workflow(self):
        pass

    def order(self):
        pass

    def properties(self):
        pass


