
from plone.app.layout.viewlets import common
from Products.Five.browser.pagetemplatefile import ViewPageTemplateFile


class PersonalBarViewlet(common.PersonalBarViewlet):
    """ Only providing functionality for anonymous users.
        Eg. showing "Register" and "Login" links.
    """

    index = ViewPageTemplateFile('personal_bar.pt')
