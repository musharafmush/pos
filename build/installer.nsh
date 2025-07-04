# NSIS installer script for Awesome Shop POS

# Custom installer pages
!include "MUI2.nsh"

# Additional installer configurations
RequestExecutionLevel admin

# Installer pages
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "LICENSE.txt"
!insertmacro MUI_PAGE_COMPONENTS
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

# Uninstaller pages
!insertmacro MUI_UNPAGE_WELCOME
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

# Languages
!insertmacro MUI_LANGUAGE "English"

# Custom functions
Function .onInit
    # Check if already installed
    ReadRegStr $R0 HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\AwesomeShopPOS" "DisplayName"
    StrCmp $R0 "" done
    
    MessageBox MB_OKCANCEL|MB_ICONEXCLAMATION \
    "Awesome Shop POS is already installed. $\n$\nClick 'OK' to remove the previous version or 'Cancel' to cancel this upgrade." \
    IDOK uninst
    Abort
    
    uninst:
        ClearErrors
        ExecWait '$INSTDIR\Uninstall.exe _?=$INSTDIR'
        
        IfErrors no_remove_uninstaller done
        
        no_remove_uninstaller:
            Delete $INSTDIR\Uninstall.exe
            RMDir $INSTDIR
    
    done:
FunctionEnd

# Post-install configurations
Section "Main Application" SecMain
    SectionIn RO  # Read-only section
    
    # Set output path
    SetOutPath $INSTDIR
    
    # Install Visual C++ Redistributable if needed
    File /oname=vcredist_x64.exe "${BUILD_RESOURCES_DIR}\vcredist_x64.exe"
    ExecWait '"$INSTDIR\vcredist_x64.exe" /quiet /norestart'
    Delete "$INSTDIR\vcredist_x64.exe"
    
    # Create application data directory
    CreateDirectory "$APPDATA\AwesomeShopPOS"
    CreateDirectory "$APPDATA\AwesomeShopPOS\data"
    CreateDirectory "$APPDATA\AwesomeShopPOS\backups"
    CreateDirectory "$APPDATA\AwesomeShopPOS\exports"
    CreateDirectory "$APPDATA\AwesomeShopPOS\logs"
    
    # Set permissions for data directory
    AccessControl::GrantOnFile "$APPDATA\AwesomeShopPOS" "(BU)" "FullAccess"
    
    # Register application
    WriteRegStr HKLM "Software\AwesomeShopPOS" "InstallPath" "$INSTDIR"
    WriteRegStr HKLM "Software\AwesomeShopPOS" "Version" "${VERSION}"
    
    # Add to Add/Remove Programs
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\AwesomeShopPOS" "DisplayName" "Awesome Shop POS"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\AwesomeShopPOS" "UninstallString" '"$INSTDIR\Uninstall.exe"'
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\AwesomeShopPOS" "DisplayIcon" '"$INSTDIR\AwesomeShopPOS.exe"'
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\AwesomeShopPOS" "DisplayVersion" "${VERSION}"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\AwesomeShopPOS" "Publisher" "Awesome Shop POS Team"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\AwesomeShopPOS" "URLInfoAbout" "https://awesomeshop.com"
    WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\AwesomeShopPOS" "NoModify" 1
    WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\AwesomeShopPOS" "NoRepair" 1
    
    # Create uninstaller
    WriteUninstaller "$INSTDIR\Uninstall.exe"
SectionEnd

Section "Sample Data" SecSample
    # Install sample data files
    SetOutPath "$APPDATA\AwesomeShopPOS\data"
    File /oname=sample-products.json "${BUILD_RESOURCES_DIR}\sample-products.json"
    File /oname=sample-customers.json "${BUILD_RESOURCES_DIR}\sample-customers.json"
SectionEnd

Section "Desktop Shortcut" SecDesktop
    CreateShortCut "$DESKTOP\Awesome Shop POS.lnk" "$INSTDIR\AwesomeShopPOS.exe" "" "$INSTDIR\AwesomeShopPOS.exe" 0
SectionEnd

Section "Quick Launch Shortcut" SecQuick
    CreateShortCut "$QUICKLAUNCH\Awesome Shop POS.lnk" "$INSTDIR\AwesomeShopPOS.exe" "" "$INSTDIR\AwesomeShopPOS.exe" 0
SectionEnd

# Section descriptions
!insertmacro MUI_FUNCTION_DESCRIPTION_BEGIN
    !insertmacro MUI_DESCRIPTION_TEXT ${SecMain} "Main application files (required)"
    !insertmacro MUI_DESCRIPTION_TEXT ${SecSample} "Install sample data for testing"
    !insertmacro MUI_DESCRIPTION_TEXT ${SecDesktop} "Create desktop shortcut"
    !insertmacro MUI_DESCRIPTION_TEXT ${SecQuick} "Create quick launch shortcut"
!insertmacro MUI_FUNCTION_DESCRIPTION_END

# Uninstaller
Section "Uninstall"
    # Remove files
    Delete "$INSTDIR\AwesomeShopPOS.exe"
    Delete "$INSTDIR\Uninstall.exe"
    
    # Remove shortcuts
    Delete "$DESKTOP\Awesome Shop POS.lnk"
    Delete "$SMPROGRAMS\Awesome Shop POS\Awesome Shop POS.lnk"
    Delete "$SMPROGRAMS\Awesome Shop POS\Uninstall.lnk"
    Delete "$QUICKLAUNCH\Awesome Shop POS.lnk"
    
    # Remove directories
    RMDir "$SMPROGRAMS\Awesome Shop POS"
    RMDir "$INSTDIR"
    
    # Remove registry entries
    DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\AwesomeShopPOS"
    DeleteRegKey HKLM "Software\AwesomeShopPOS"
    
    # Ask user if they want to remove data
    MessageBox MB_YESNO "Do you want to remove all application data including your POS data, backups, and settings?" IDNO skip_data_removal
    
    RMDir /r "$APPDATA\AwesomeShopPOS"
    
    skip_data_removal:
SectionEnd