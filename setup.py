from setuptools import setup, find_packages

version = '1.1.1'

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
        'Acquisition',
        'Products.CMFCore',
        'zope.interface',
        'zope.component',
        'zope.i18nmessageid',
        'zope.browsermenu',
        'zope.traversing',
        'zope.viewlet',
        'plone.memoize',
        'plone.tiles',
        'plone.app.jquery',
        'Products.ResourceRegistries',
        'plone.app.jquery>=1.7.2',
        'plone.app.jquerytools>=1.4',
        ],
    extras_require={
        'test': [
            'zope.configuration',
            'plone.app.testing',
            'unittest_jshint',
            ],
        },
    entry_points="""
        [z3c.autoinclude.plugin]
        target = plone
        """,
    )
