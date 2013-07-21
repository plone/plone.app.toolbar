from setuptools import setup, find_packages

version = '1.3.0'

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
        'plone.app.widgets',
        'Products.CMFPlone>=4.3b2',
        'plone.app.registry>=1.2.2'
    ],
    extras_require={
        'test': [
            'plone.testing',
            'plone.app.testing',
            'Products.CMFCore',
            'zope.configuration',
            'robotsuite',
        ],
    },
    entry_points="""
    # -*- Entry points: -*-
    [z3c.autoinclude.plugin]
    target = plone
    """,
)
