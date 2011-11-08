from setuptools import setup, find_packages
import os

version = '0.1'

setup(name='plone.app.toolbar',
      version=version,
      description="Toolbar for Plone",
      long_description=open("README.rst").read() + "\n\n" +
                       open(os.path.join("docs", "HISTORY.txt")).read(),
      classifiers=[
        "Framework :: Plone",
        "Programming Language :: Python",
        "Topic :: Software Development :: Libraries :: Python Modules",
        ],
      keywords='plone ui',
      author='Plone developers',
      author_email='',
      url='http://pypi.python.org/pypi/plone.app.toolbar',
      license='GPL',
      packages=find_packages(exclude=['ez_setup']),
      namespace_packages=['plone', 'plone.app'],
      include_package_data=True,
      zip_safe=False,
      install_requires=[
          'setuptools',
          'Products.ResourceRegistries',
      ],
      extras_require={
        'test': ['plone.app.testing'],
      },
      entry_points="""
      [z3c.autoinclude.plugin]
      target = plone
      """,
      )
