# -*- coding: utf-8 -*-
from plone.app.toolbar.testing import (
    PLONEAPPTOOLBAR_INTEGRATION_TESTING,
    PLONEAPPTOOLBARDX_INTEGRATION_TESTING
)
from plone.app.testing import TEST_USER_ID
from plone.app.testing import TEST_USER_NAME
from plone.app.testing import login
from plone.app.testing import setRoles

from zope.publisher.browser import TestRequest
from plone.uuid.interfaces import IUUID
import unittest
from plone.protect.authenticator import createToken
import json
from DateTime import DateTime
from Products.CMFCore.utils import getToolByName


class BaseTest(unittest.TestCase):

    def setUp(self):
        self.portal = self.layer['portal']
        login(self.portal, TEST_USER_NAME)
        setRoles(self.portal, TEST_USER_ID, ['Manager'])
        self.portal.invokeFactory('Document', id="page", title="page")
        self.portal.page.reindexObject()
        self.request = TestRequest(
            environ={
                'HTTP_ACCEPT_LANGUAGE': 'en',
                'REQUEST_METHOD': 'POST'
            },
            form={
                'selection': '["' + IUUID(self.portal.page) + '"]',
                '_authenticator': createToken(),
                'folder': '/'
            }
        )
        self.request.REQUEST_METHOD = 'POST'
        self.userList = json.dumps([{
            'id': 'one'
        }, {
            'id': 'two'
        }])


class PropertiesDXTest(BaseTest):

    layer = PLONEAPPTOOLBARDX_INTEGRATION_TESTING

    def testEffective(self):
        from plone.app.toolbar.browser.folder import PropertiesAction
        self.request.form['effectiveDate'] = '1999/01/01'
        self.request.form['effectiveTime'] = '09:00'
        view = PropertiesAction(self.portal.page, self.request)
        view()
        self.assertEquals(self.portal.page.effective,
                          DateTime('1999/01/01 09:00'))

    def testExpires(self):
        from plone.app.toolbar.browser.folder import PropertiesAction
        self.request.form['expirationDate'] = '1999/01/01'
        self.request.form['expirationTime'] = '09:00'
        view = PropertiesAction(self.portal.page, self.request)
        view()
        self.assertEquals(self.portal.page.expires,
                          DateTime('1999/01/01 09:00'))

    def testSetDexterityExcludeFromNav(self):
        from plone.app.toolbar.browser.folder import PropertiesAction
        self.request.form['exclude_from_nav'] = 'yes'
        view = PropertiesAction(self.portal.page, self.request)
        view()
        self.assertEquals(self.portal.page.exclude_from_nav, True)

    def testRights(self):
        from plone.app.toolbar.browser.folder import PropertiesAction
        self.request.form['copyright'] = 'foobar'
        view = PropertiesAction(self.portal.page, self.request)
        view()
        self.assertEquals(self.portal.page.rights, 'foobar')

    def testContributors(self):
        from plone.app.toolbar.browser.folder import PropertiesAction
        self.request.form['contributors'] = self.userList
        view = PropertiesAction(self.portal.page, self.request)
        view()
        self.assertEquals(self.portal.page.contributors, ('one', 'two'))

    def testCreators(self):
        from plone.app.toolbar.browser.folder import PropertiesAction
        self.request.form['creators'] = self.userList
        view = PropertiesAction(self.portal.page, self.request)
        view()
        self.assertEquals(
            self.portal.page.creators,
            ('one', 'two', 'test_user_1_')
        )


class PropertiesArchetypesTest(BaseTest):

    layer = PLONEAPPTOOLBAR_INTEGRATION_TESTING

    def testExcludeFromNav(self):
        from plone.app.toolbar.browser.folder import PropertiesAction
        self.request.form['exclude_from_nav'] = 'yes'
        view = PropertiesAction(self.portal.page, self.request)
        view()
        self.assertEquals(self.portal.page.getExcludeFromNav(), True)

    def testEffective(self):
        from plone.app.toolbar.browser.folder import PropertiesAction
        self.request.form['effectiveDate'] = '1999/01/01'
        self.request.form['effectiveTime'] = '09:00'
        view = PropertiesAction(self.portal.page, self.request)
        view()
        self.assertEquals(
            DateTime(self.portal.page.EffectiveDate()).toZone('UTC'),
            DateTime('1999/01/01 09:00').toZone('UTC'))

    def testExpires(self):
        from plone.app.toolbar.browser.folder import PropertiesAction
        self.request.form['expirationDate'] = '1999/01/01'
        self.request.form['expirationTime'] = '09:00'
        view = PropertiesAction(self.portal.page, self.request)
        view()
        self.assertEquals(
            DateTime(self.portal.page.ExpirationDate()).toZone('UTC'),
            DateTime('1999/01/01 09:00').toZone('UTC'))

    def testRights(self):
        from plone.app.toolbar.browser.folder import PropertiesAction
        self.request.form['copyright'] = 'foobar'
        view = PropertiesAction(self.portal.page, self.request)
        view()
        self.assertEquals(self.portal.page.Rights(), 'foobar')

    def testContributors(self):
        from plone.app.toolbar.browser.folder import PropertiesAction
        self.request.form['contributors'] = self.userList
        view = PropertiesAction(self.portal.page, self.request)
        view()
        self.assertEquals(self.portal.page.Contributors(), ('one', 'two'))

    def testCreators(self):
        from plone.app.toolbar.browser.folder import PropertiesAction
        self.request.form['creators'] = self.userList
        view = PropertiesAction(self.portal.page, self.request)
        view()
        self.assertEquals(self.portal.page.Creators(), ('one', 'two'))


class WorkflowTest(BaseTest):

    layer = PLONEAPPTOOLBAR_INTEGRATION_TESTING

    def testStateChange(self):
        from plone.app.toolbar.browser.folder import WorkflowAction
        self.request.form['transition'] = 'publish'
        view = WorkflowAction(self.portal.page, self.request)
        view()
        workflowTool = getToolByName(self.portal, "portal_workflow")
        self.assertEquals(
            workflowTool.getInfoFor(self.portal.page, 'review_state'),
            'published')
