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

    Wait Until Page Contains Element  css=div.toolbar

    Frame Should Contain  id=toolbar  Contents
    Frame Should Contain  id=toolbar  View
    # The 'Edit' button is not present, as we are viewing a Plone Site, not
    #   a default front page for a Plone Site.
    Frame Should Contain  id=toolbar  Rules
    Frame Should Contain  id=toolbar  Sharing

Toolbar should contain document actions menus
    Log in as site owner
    Go to  ${PLONE_URL}

    Wait Until Page Contains Element  css=div.toolbar

    Frame Should Contain  id=toolbar  Display
    Frame Should Contain  id=toolbar  Add new

Contents tab should open folder listing
    Log in as site owner
    Go to  ${PLONE_URL}

    Wait Until Page Contains Element  css=div.toolbar
    Select Frame  id=toolbar
    Wait Until Keyword Succeeds  3  5  Current Frame Contains  Contents
    Click Link  Contents

    Location Should Contain  folder_contents

Edit tab should open edit view
    Log in as site owner
    Go to  ${PLONE_URL}/${TEST_FOLDER}

    Wait Until Page Contains Element  css=div.toolbar
    Select Frame  id=toolbar
    Wait Until Keyword Succeeds  3  5  Current Frame Contains  Edit
    Click Link  Edit

    Location Should Be  ${PLONE_URL}/${TEST_FOLDER}/edit

View tab should return to view
    Log in as site owner
    Go to  ${PLONE_URL}/${TEST_FOLDER}/edit

    Wait Until Page Contains Element  css=div.toolbar
    Select Frame  id=toolbar
    Wait Until Keyword Succeeds  3  5  Current Frame Contains  View
    Click Link  View

    Location Should Be  ${PLONE_URL}/${TEST_FOLDER}

Rules tab should open rules view
    Log in as site owner
    Go to  ${PLONE_URL}

    Wait Until Page Contains Element  css=div.toolbar
    Select Frame  id=toolbar
    Wait Until Keyword Succeeds  3  5  Current Frame Contains  Rules
    Click Link  Rules

    Location Should Be  ${PLONE_URL}/@@manage-content-rules

Sharing tab should open sharing view
    Log in as site owner
    Go to  ${PLONE_URL}

    Wait Until Page Contains Element  css=div.toolbar
    Select Frame  id=toolbar
    Wait Until Keyword Succeeds  3  5  Current Frame Contains  Sharing
    Click Link  Sharing

    Location Should Be  ${PLONE_URL}/@@sharing

Actions menu dropdown should open on click
    Log in as site owner
    Go to  ${PLONE_URL}/${TEST_FOLDER}
    Wait Until Page Contains Element  css=div.toolbar
    Select Frame  id=toolbar
    Wait Until Keyword Succeeds  3  5  Current Frame Contains  Actions

    Element Should Not Be Visible  id=cut
    Click Element  xpath=id('plone-contentmenu-actions')/a

    Element Should Be Visible  id=cut

Display menu dropdown should open on click
    Log in as site owner
    Go to  ${PLONE_URL}/${TEST_FOLDER}
    Wait Until Page Contains Element  css=div.toolbar
    Select Frame  id=toolbar
    Wait Until Keyword Succeeds  3  5  Current Frame Contains  Display

    Element Should Not Be Visible  id=contextSetDefaultPage
    Click Element  xpath=id('plone-contentmenu-display')/a

    Element Should Be Visible  id=contextSetDefaultPage

Factories menu dropdown should open on click
    Log in as site owner
    Go to  ${PLONE_URL}/${TEST_FOLDER}
    Wait Until Page Contains Element  css=div.toolbar
    Select Frame  id=toolbar
    Wait Until Keyword Succeeds  3  5  Current Frame Contains  Add new…

    Element Should Not Be Visible  id=document
    Click Element  xpath=id('plone-contentmenu-factories')/a

    Element Should Be Visible  id=document

Workflow menu dropdown should open on click
    Log in as site owner
    Go to  ${PLONE_URL}/${TEST_FOLDER}
    Wait Until Page Contains Element  css=div.toolbar
    Select Frame  id=toolbar
    Wait Until Keyword Succeeds  3  5  Current Frame Contains  State:

    Element Should Not Be Visible  id=advanced
    Click Element  xpath=id('plone-contentmenu-workflow')/a

    Element Should Be Visible  id=advanced

Personal actions dropdown should open on click
    Log in as site owner
    Go to  ${PLONE_URL}/${TEST_FOLDER}
    Wait Until Page Contains Element  css=div.toolbar
    Select Frame  id=toolbar
    Wait Until Keyword Succeeds  3  5  Current Frame Contains  State:

    Element Should Not Be Visible  id=plone-personal-actions-logout
    Click Element  xpath=id('plone-personal-actions')/a

    Element Should Be Visible  id=plone-personal-actions-logout
