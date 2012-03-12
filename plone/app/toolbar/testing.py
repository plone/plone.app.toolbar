from plone.app.testing import PLONE_FIXTURE
from plone.app.testing import PloneSandboxLayer
from plone.app.testing import TEST_USER_NAME
from plone.app.testing import TEST_USER_PASSWORD
from plone.app.testing import applyProfile
from plone.app.testing.layers import FunctionalTesting
from plone.app.testing.layers import IntegrationTesting
from Products.CMFCore.utils import getToolByName
from zope.configuration import xmlconfig

class Toolbar(PloneSandboxLayer):
    defaultBases = (PLONE_FIXTURE,)

    def setUpZope(self, app, configurationContext):
        # load ZCML
        import plone.app.toolbar
        xmlconfig.file('configure.zcml', plone.app.toolbar, context=configurationContext)

    def setUpPloneSite(self, portal):
        # install into the Plone site
        applyProfile(portal, 'plone.app.toolbar:default')
        workflowTool = getToolByName(portal, 'portal_workflow')
        workflowTool.setDefaultChain('plone_workflow')

        # Don't ignore exceptions so that problems don't hide behind
        # Unauthorized or NotFound exceptions when doing functional
        # testing.
        error_log = getToolByName(portal, 'error_log')
        error_props = error_log.getProperties()
        error_props['ignored_exceptions'] = ('Redirect',)
        error_props = error_log.setProperties(
            **error_props)

        # Put resource registries in debug mode to make it easier to
        # inspect CSS, JavaScript, and KSS
        getToolByName(portal, 'portal_css').setDebugMode(True)
        getToolByName(portal, 'portal_javascripts').setDebugMode(True)
        getToolByName(portal, 'portal_kss').setDebugMode(True)


TOOLBAR_FIXTURE = Toolbar()
TOOLBAR_INTEGRATION_TESTING = IntegrationTesting(bases=(TOOLBAR_FIXTURE,), name="TOOLBAR:Integration")
TOOLBAR_FUNCTIONAL_TESTING = FunctionalTesting(bases=(TOOLBAR_FIXTURE,), name="TOOLBAR:Functional")

def browser_login(portal, browser, username=None, password=None):
    handleErrors = browser.handleErrors
    try:
        browser.handleErrors = False
        browser.open(portal.absolute_url() + '/login_form')
        if username is None:
            username = TEST_USER_NAME
        if password is None:
            password = TEST_USER_PASSWORD
        browser.getControl(name='__ac_name').value = username
        browser.getControl(name='__ac_password').value = password
        browser.getControl(name='submit').click()
    finally:
        browser.handleErrors = handleErrors
