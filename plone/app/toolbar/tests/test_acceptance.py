import unittest

from plone.testing import layered

from plone.app.toolbar.testing import PLONEAPPTOOLBAR_ACCEPTANCE_TESTING

import robotsuite


def test_suite():
    suite = unittest.TestSuite()
    suite.addTests([
        layered(robotsuite.RobotTestSuite("acceptance/toolbar.txt"),
        layer=PLONEAPPTOOLBAR_ACCEPTANCE_TESTING),
    ])
    return suite
