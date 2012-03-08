import doctest

from plone.testing import layered

from plone.app.toolbar import testing

optionflags = (doctest.ELLIPSIS | doctest.NORMALIZE_WHITESPACE |
               doctest.REPORT_NDIFF)


def test_suite():
    return layered(
        doctest.DocFileSuite(
            'views.txt',
            'buttons.txt',
            optionflags=optionflags),
        layer=testing.TOOLBAR_INTEGRATION_TESTING)
