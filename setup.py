from setuptools import setup, find_packages

version = '1.2'

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
        'plone.app.jquery>=1.8.3',
        'plone.app.widgets',
        'Products.ResourceRegistries>=2.1',
        'Products.CMFPlone>=4.3b1',
        'Products.TinyMCE>=1.3b8',
    ],
    extras_require={
        'test': [
            'plone.testing',
            'plone.app.testing',
            'Products.CMFCore',
            'zope.configuration',
            'robotsuite',
            'plone.act',
        ],
    },
    entry_points="""
        [z3c.autoinclude.plugin]
        target = plone
        """,
)
