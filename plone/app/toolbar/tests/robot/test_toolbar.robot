*** Settings ***

Resource  plone/app/robotframework/keywords.robot
Resource  plone/app/robotframework/saucelabs.robot
Resource  plone/app/robotframework/variables.robot

Library  Remote  ${PLONE_URL}/RobotRemote

Test Setup  Run keywords  Open SauceLabs test browser
Test Teardown  Run keywords  Report test status  Close all browsers


*** Variables ***

${TEST_FOLDER}  test-folder


*** Test cases ***

Anonymous shouldn't see toolbar
    Log out
    Page Should Not Contain Element  id=plone-toolbar

Logged in should see toolbar
    Log in as site owner
    Page Should Contain Element  id=plone-toolbar

Toolbar should contain content action tabs
    Log in as site owner
    Go to  ${PLONE_URL}

    Wait Until Page Contains Element  css=iframe#plone-toolbar
    Select Frame  xpath=//iframe[@name='plone-toolbar']

    # The 'Edit' button is not present, as we are viewing a Plone Site, not
    #   a default front page for a Plone Site.

    Current Frame Contains  Contents
    Current Frame Contains  Sharing
    Current Frame Contains  History

    # Current Frame Contains  View
    # Current Frame Contains  Rules


Toolbar should contain document actions menus
    Log in as site owner
    Go to  ${PLONE_URL}

    Wait Until Page Contains Element  css=iframe#plone-toolbar
    Select Frame  xpath=//iframe[@name='plone-toolbar']

    Current Frame Contains  Manage Portlets
    Current Frame Contains  Display
    Current Frame Contains  Add New...


Toolbar buttons urls should contain ajax_load=1
    Log in as site owner
    Go to  ${PLONE_URL}

    Wait Until Page Contains Element  css=iframe#plone-toolbar
    Select Frame  xpath=//iframe[@name='plone-toolbar']

    ${href} =  Get element attribute  css=li#plone-action-folderContents>a@href
    Should Contain  ${href}  folder_contents?ajax_load=1

    ${href} =  Get element attribute  css=li#plone-action-local_roles>a@href
    Should Contain  ${href}  @@sharing?ajax_load=1

    ${href} =  Get element attribute  css=li#plone-action-content-history>a@href
    Should Contain  ${href}  @@historyview?ajax_load=1

    ${href} =  Get element attribute  css=li#plone-sitesetup>a@href
    Should Contain  ${href}  @@overview-controlpanel?ajax_load=1 

    ${href} =  Get element attribute  css=li#folder>a@href
    Should Contain  ${href}  createObject?type_name=Folder&ajax_load=1
    # TODO: or this one...
    # ++add++Folder?ajax_load=1

    # TODO: BREAKS, but shouldn't in my understanding.

    ${href} =  Get element attribute  css=li#plone-action-edit>a@href
    Should Contain  ${href}  edit?ajax_load=1

    # NOTE: the id's portlet-manager-plone.leftcolumn and
    # portlet-manager-plone.rightcolumn contain dots, which can be
    # misinterpreted as CSS class selectors!
    ${href} =  Get element attribute  css=a#portlet-manager-plone.leftcolumn@href
    Should Contain  ${href}  @@toolbar-manage-portlets/plone.leftcolumn?ajax_load=1

    ${href} =  Get element attribute  css=a#portlet-manager-plone.rightcolumn@href
    Should Contain  ${href}  @@toolbar-manage-portlets/plone.rightcolumn?ajax_load=1


Contents tab should open folder listing
    Log in as site owner
    Go to  ${PLONE_URL}

    Wait Until Page Contains Element  css=iframe#plone-toolbar
    Select Frame  xpath=//iframe[@name='plone-toolbar']
    
    Wait Until Keyword Succeeds  3  5  Current Frame Contains  Contents
    Click Link  Contents

    Location Should Contain  folder_contents

Edit tab should open edit view
    Log in as site owner
    Go to  ${PLONE_URL}/${TEST_FOLDER}

    Wait Until Page Contains Element  css=iframe#plone-toolbar
    Select Frame  xpath=//iframe[@name='plone-toolbar']
    
    Wait Until Keyword Succeeds  3  5  Current Frame Contains  Edit
    Click Link  Edit

    Location Should Be  ${PLONE_URL}/${TEST_FOLDER}/edit

View tab should return to view
    Log in as site owner
    Go to  ${PLONE_URL}/${TEST_FOLDER}/edit

    Wait Until Page Contains Element  css=iframe#plone-toolbar
    Select Frame  xpath=//iframe[@name='plone-toolbar']

    Wait Until Keyword Succeeds  3  5  Current Frame Contains  View
    Click Link  View

    Location Should Be  ${PLONE_URL}/${TEST_FOLDER}

Rules tab should open rules view
    Log in as site owner
    Go to  ${PLONE_URL}

    Wait Until Page Contains Element  css=iframe#plone-toolbar
    Select Frame  xpath=//iframe[@name='plone-toolbar']

    Wait Until Keyword Succeeds  3  5  Current Frame Contains  Rules
    Click Link  Rules

    Location Should Be  ${PLONE_URL}/@@manage-content-rules

Sharing tab should open sharing view
    Log in as site owner
    Go to  ${PLONE_URL}

    Wait Until Page Contains Element  css=iframe#plone-toolbar
    Select Frame  xpath=//iframe[@name='plone-toolbar']

    Wait Until Keyword Succeeds  3  5  Current Frame Contains  Sharing
    Click Link  Sharing

    Location Should Be  ${PLONE_URL}/@@sharing

Actions menu dropdown should open on click
    Log in as site owner
    Go to  ${PLONE_URL}/${TEST_FOLDER}

    Wait Until Page Contains Element  css=iframe#plone-toolbar
    Select Frame  xpath=//iframe[@name='plone-toolbar']

    Wait Until Keyword Succeeds  3  5  Current Frame Contains  Actions

    Element Should Not Be Visible  id=cut
    Click Element  xpath=id('plone-contentmenu-actions')/a

    Element Should Be Visible  id=cut

Display menu dropdown should open on click
    Log in as site owner
    Go to  ${PLONE_URL}/${TEST_FOLDER}
   
    Wait Until Page Contains Element  css=iframe#plone-toolbar
    Select Frame  xpath=//iframe[@name='plone-toolbar']

    Wait Until Keyword Succeeds  3  5  Current Frame Contains  Display

    Element Should Not Be Visible  id=contextSetDefaultPage
    Click Element  xpath=id('plone-contentmenu-display')/a

    Element Should Be Visible  id=contextSetDefaultPage

Factories menu dropdown should open on click
    Log in as site owner
    Go to  ${PLONE_URL}/${TEST_FOLDER}

    Wait Until Page Contains Element  css=iframe#plone-toolbar
    Select Frame  xpath=//iframe[@name='plone-toolbar']

    Wait Until Keyword Succeeds  3  5  Current Frame Contains  Add new…

    Element Should Not Be Visible  id=document
    Click Element  xpath=id('plone-contentmenu-factories')/a

    Element Should Be Visible  id=document

Workflow menu dropdown should open on click
    Log in as site owner
    Go to  ${PLONE_URL}/${TEST_FOLDER}

    Wait Until Page Contains Element  css=iframe#plone-toolbar
    Select Frame  xpath=//iframe[@name='plone-toolbar']

    Wait Until Keyword Succeeds  3  5  Current Frame Contains  State:

    Element Should Not Be Visible  id=advanced
    Click Element  xpath=id('plone-contentmenu-workflow')/a

    Element Should Be Visible  id=advanced

Personal actions dropdown should open on click
    Log in as site owner
    Go to  ${PLONE_URL}/${TEST_FOLDER}

    Wait Until Page Contains Element  css=iframe#plone-toolbar
    Select Frame  xpath=//iframe[@name='plone-toolbar']

    Wait Until Keyword Succeeds  3  5  Current Frame Contains  State:

    Element Should Not Be Visible  id=plone-personal-actions-logout
    Click Element  xpath=id('plone-personal-actions')/a

    Element Should Be Visible  id=plone-personal-actions-logout
