from setuptools import setup, find_packages

version = '1.5.0dev'

setup(
    name='plone.app.toolbar',
    version=version,
    description="Toolbar for Plone",
    long_description=open("README.rst").read(),
    classifiers=[
        "Framework :: Plone",
        "Programming Language :: Python",
        "Topic :: Software Development :: Libraries :: Python Modules",
    ],
    keywords='plone ui toolbar',
    author='Rok Garbas',
    author_email='rok@garbas.si',
    url='https://github.com/plone/plone.app.toolbar',
    license='GPL',
    packages=find_packages(),
    namespace_packages=['plone', 'plone.app'],
    include_package_data=True,
    zip_safe=False,
    install_requires=[
        'setuptools',
        'lxml',
        'zope.component',
        'zope.viewlet',
        'zope.i18nmessageid',
        'zope.browsermenu',
        'zope.interface',
        'zope.traversing',
        'plone.memoize',
        'plone.tiles',
        'Acquisition',
        # needed because we use bundles
        'Products.ResourceRegistries>=2.1',
        # nedded because users vocabulary was added here
        'plone.app.vocabularies>=2.1.12dev',
        # needed for pickadate javascript
        'plone.app.jquery>=1.8.0',
        # needed so it works with jquery >= 1.8
        'plone.app.search>=1.1.2',
        'plone.app.registry>=1.2.2',
        'plone.app.querystring>=1.1.0',
        'Products.CMFPlone>=4.3b2',
        'plone.app.contenttypes>=1.0.99',
        'plone.app.event>1.0.99',
    ],
    extras_require={
        'test': [
            'Products.CMFCore',
            'plone.app.robotframework',
            'robotframework-selenium2library',
            'plone.app.testing',
            'plone.testing',
            'zope.configuration',
            'plone.app.contenttypes'
        ],
    },
    entry_points="""
    # -*- Entry points: -*-
    [z3c.autoinclude.plugin]
    target = plone
    """,
)
