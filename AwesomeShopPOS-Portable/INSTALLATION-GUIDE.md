# Awesome Shop POS - Installation Guide

## Complete Installation Instructions

### 📋 Prerequisites

**Required:**
- Node.js version 18 or higher
- Windows 7+, macOS 10.12+, or Linux
- 2GB RAM minimum
- 500MB free disk space

**Download Node.js:**
- Visit: https://nodejs.org/
- Download the LTS version for your operating system
- Install and restart your computer

### 🚀 Installation Steps

#### Windows Installation

1. **Extract the Package**
   - Extract `AwesomeShopPOS-Portable` folder to your desired location
   - Example: `C:\Programs\AwesomeShopPOS-Portable\`

2. **Run the Installer**
   - Double-click `Install-POS.bat`
   - Wait for installation to complete
   - Follow the on-screen instructions

3. **Launch the Application**
   - Double-click the desktop shortcut "Awesome Shop POS"
   - Or run `AwesomeShopPOS.js` from the folder
   - Or use `Start-Desktop-POS.bat`

#### Linux/Mac Installation

1. **Extract the Package**
   ```bash
   tar -xzf AwesomeShopPOS-Desktop-v1.0.0.tar.gz
   cd AwesomeShopPOS-Portable
   ```

2. **Run the Installer**
   ```bash
   chmod +x Install-POS.sh
   ./Install-POS.sh
   ```

3. **Launch the Application**
   ```bash
   ./AwesomeShopPOS.js
   # Or use: ./Start-Desktop-POS.sh
   ```

### 🔧 First Time Setup

1. **Application Launch**
   - The application will start automatically after installation
   - Wait for the "Ready for professional retail operations!" message
   - Open your web browser to: http://localhost:5000

2. **Login Credentials**
   - Username: `admin`
   - Password: `admin`

3. **Initial Configuration**
   - Set up your business information
   - Configure GST rates and HSN codes
   - Add your first products
   - Set up suppliers and customers

### 💰 Key Features Available

- **Complete POS System**: Sales, inventory, purchases, customers
- **Indian Business Compliance**: GST calculations, HSN codes, Indian Rupee formatting
- **Offline Capability**: Works completely offline with local database
- **Professional Printing**: Thermal receipt printing and label generation
- **Data Management**: Backup, export, and restore functionality

### 🔍 Troubleshooting

#### Common Issues

**"Node.js not found" Error:**
- Install Node.js from https://nodejs.org/
- Restart your computer after installation
- Try running the installer again

**Port Already in Use:**
- Close any existing instances of the application
- Wait 30 seconds and try again
- Restart your computer if issue persists

**Installation Fails:**
- Run the installer as administrator (Windows)
- Use `sudo` for installation (Linux/Mac)
- Check internet connection for dependency download

**Application Won't Start:**
- Check if all files were extracted properly
- Verify Node.js installation: `node --version`
- Try running from command line to see error messages

#### Getting Help

1. Check the `DESKTOP-SETUP.md` file for detailed setup instructions
2. Review `Desktop-README.md` for troubleshooting guides
3. Look in the `logs` folder for error messages
4. Verify system requirements are met

### 📁 Directory Structure

```
AwesomeShopPOS-Portable/
├── AwesomeShopPOS.js          # Main application launcher
├── Install-POS.bat            # Windows installer
├── Install-POS.sh             # Linux/Mac installer
├── README.md                  # Basic documentation
├── INSTALLATION-GUIDE.md      # This file
├── package-info.json          # Package information
├── app/                       # Application source files
│   ├── package.json
│   ├── web-desktop-app.cjs
│   ├── client/               # Frontend application
│   ├── server/               # Backend services
│   ├── desktop-backend/      # Desktop-specific services
│   └── shared/               # Shared utilities
├── data/                      # Database and user data
├── logs/                      # Application logs
├── backups/                   # Automatic database backups
└── exports/                   # Data export files
```

### 💡 Usage Tips

- **Data Storage**: All your business data is stored locally in the `data` folder
- **Backups**: Regular backups are automatically created in the `backups` folder
- **Portability**: You can copy the entire folder to another computer
- **Security**: Change the default admin password after first login
- **Updates**: Keep the `app` folder intact when updating

### 🎯 Next Steps After Installation

1. **Business Setup**
   - Configure your business information
   - Set up tax rates and compliance settings
   - Add your product catalog
   - Configure thermal printer settings

2. **User Management**
   - Create staff user accounts
   - Set appropriate permissions
   - Train staff on POS operations

3. **System Integration**
   - Connect thermal printers
   - Set up barcode scanners
   - Configure receipt formats
   - Test all hardware connections

---

**Awesome Shop POS** - Professional retail management for Indian businesses.
Complete GST compliance and offline capability built-in.