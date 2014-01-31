from Products.CMFCore.utils import getToolByName
from plone.app.robotframework.testing import REMOTE_LIBRARY_BUNDLE_FIXTURE
from plone.app.testing import PLONE_FIXTURE
from plone.app.testing import PloneSandboxLayer
from plone.app.testing import TEST_USER_ID
from plone.app.testing import TEST_USER_NAME
from plone.app.testing import applyProfile
from plone.app.testing import login
from plone.app.testing import setRoles
from plone.app.testing.layers import FunctionalTesting
from plone.app.testing.layers import IntegrationTesting
from plone.testing import z2
from zope.configuration import xmlconfig


class ToolbarLayer(PloneSandboxLayer):
    defaultBases = (PLONE_FIXTURE,)

    def setUpZope(self, app, configurationContext):
        # load ZCML
        import plone.app.toolbar
        xmlconfig.file('configure.zcml', plone.app.toolbar,
                       context=configurationContext)

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
        # inspect CSS and JavaScript
        getToolByName(portal, 'portal_css').setDebugMode(True)
        getToolByName(portal, 'portal_javascripts').setDebugMode(True)

        login(portal, TEST_USER_NAME)
        portal.portal_workflow.setDefaultChain("simple_publication_workflow")
        setRoles(portal, TEST_USER_ID, ['Manager'])
        portal.invokeFactory(
            "Folder",
            id="test-folder",
            title=u"Test Folder"
        )

    def tearDownPloneSite(self, portal):
        login(portal, TEST_USER_NAME)
        setRoles(portal, TEST_USER_ID, ['Manager'])
        portal.manage_delObjects(['test-folder'])


class ToolbarDXLayer(ToolbarLayer):

    def setUpZope(self, app, configurationContext):
        super(ToolbarDXLayer, self).setUpZope(app, configurationContext)
        import plone.app.contenttypes
        xmlconfig.file('configure.zcml',
                       plone.app.contenttypes,
                       context=configurationContext)

        try:
            import mockup
            self.loadZCML(package=mockup)
        except:
            pass

        z2.installProduct(app, 'Products.DateRecurringIndex')

    def setUpPloneSite(self, portal):
        super(ToolbarDXLayer, self).setUpPloneSite(portal)
        portal.portal_workflow.setDefaultChain("simple_publication_workflow")
        # we need contenttypes before installing widgets
        self.applyProfile(portal, 'plone.app.contenttypes:default')


PLONEAPPTOOLBAR_FIXTURE = ToolbarLayer()

PLONEAPPTOOLBAR_INTEGRATION_TESTING = IntegrationTesting(
    bases=(PLONEAPPTOOLBAR_FIXTURE,),
    name="PloneAppToolbarLayer:Integration")

PLONEAPPTOOLBAR_FUNCTIONAL_TESTING = FunctionalTesting(
    bases=(PLONEAPPTOOLBAR_FIXTURE,),
    name="PloneAppToolbarDXLayer:Functional")

PLONEAPPTOOLBARDX_FIXTURE = ToolbarDXLayer()

PLONEAPPTOOLBARDX_INTEGRATION_TESTING = IntegrationTesting(
    bases=(PLONEAPPTOOLBARDX_FIXTURE,),
    name="PloneAppToolbarDXLayer:Integration")

PLONEAPPTOOLBARDX_FUNCTIONAL_TESTING = FunctionalTesting(
    bases=(PLONEAPPTOOLBARDX_FIXTURE,),
    name="PloneAppToolbarDXLayer:Functional")


PLONEAPPTOOLBAR_ROBOT_TESTING = FunctionalTesting(
    bases=(PLONEAPPTOOLBAR_FIXTURE,
           REMOTE_LIBRARY_BUNDLE_FIXTURE,
           z2.ZSERVER_FIXTURE,),
    name="PloneAppToolbarLayer:Acceptance")
