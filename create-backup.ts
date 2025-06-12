
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(process.cwd(), 'pos-data.db');
const backupDir = path.join(process.cwd(), 'backups');

interface BackupOptions {
  includeDatabase?: boolean;
  includeJson?: boolean;
  includeImages?: boolean;
  customName?: string;
}

export class BackupManager {
  constructor() {
    this.ensureBackupDirectory();
  }

  private ensureBackupDirectory(): void {
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
      console.log('📁 Created backups directory');
    }
  }

  async createFullBackup(options: BackupOptions = {}): Promise<string> {
    const {
      includeDatabase = true,
      includeJson = true,
      includeImages = true,
      customName
    } = options;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').split('.')[0];
    const backupName = customName || `pos-backup-${timestamp}`;
    const backupPath = path.join(backupDir, backupName);

    console.log('🔄 Starting comprehensive backup...');
    console.log(`📦 Backup name: ${backupName}`);

    // Create backup folder
    fs.mkdirSync(backupPath, { recursive: true });

    const backupManifest = {
      timestamp: new Date().toISOString(),
      backupName,
      components: {},
      fileCount: 0,
      totalSize: 0
    };

    try {
      // 1. Database backup
      if (includeDatabase && fs.existsSync(dbPath)) {
        const dbBackupPath = path.join(backupPath, 'pos-data.db');
        fs.copyFileSync(dbPath, dbBackupPath);
        const dbStats = fs.statSync(dbBackupPath);
        backupManifest.components['database'] = {
          file: 'pos-data.db',
          size: dbStats.size,
          status: 'success'
        };
        backupManifest.totalSize += dbStats.size;
        backupManifest.fileCount++;
        console.log('✅ Database backed up');
      }

      // 2. JSON data export
      if (includeJson) {
        const jsonBackupPath = path.join(backupPath, 'data-export.json');
        await this.exportDataToJSON(jsonBackupPath);
        const jsonStats = fs.statSync(jsonBackupPath);
        backupManifest.components['json_export'] = {
          file: 'data-export.json',
          size: jsonStats.size,
          status: 'success'
        };
        backupManifest.totalSize += jsonStats.size;
        backupManifest.fileCount++;
        console.log('✅ JSON data exported');
      }

      // 3. Application configuration
      const configFiles = [
        'package.json',
        'tsconfig.json',
        'tailwind.config.ts',
        'components.json',
        '.env'
      ];

      const configDir = path.join(backupPath, 'config');
      fs.mkdirSync(configDir, { recursive: true });

      for (const configFile of configFiles) {
        const sourcePath = path.join(process.cwd(), configFile);
        if (fs.existsSync(sourcePath)) {
          const destPath = path.join(configDir, configFile);
          fs.copyFileSync(sourcePath, destPath);
          const stats = fs.statSync(destPath);
          backupManifest.totalSize += stats.size;
          backupManifest.fileCount++;
        }
      }

      backupManifest.components['configuration'] = {
        folder: 'config',
        files: configFiles.filter(f => fs.existsSync(path.join(process.cwd(), f))),
        status: 'success'
      };
      console.log('✅ Configuration files backed up');

      // 4. Images backup (if they exist)
      if (includeImages) {
        const imagesDir = path.join(process.cwd(), 'uploads');
        const clientImagesDir = path.join(process.cwd(), 'client', 'public', 'images');
        
        if (fs.existsSync(imagesDir) || fs.existsSync(clientImagesDir)) {
          const backupImagesDir = path.join(backupPath, 'images');
          fs.mkdirSync(backupImagesDir, { recursive: true });
          
          let imageCount = 0;
          let imageSize = 0;

          // Copy uploads folder
          if (fs.existsSync(imagesDir)) {
            this.copyDirectory(imagesDir, path.join(backupImagesDir, 'uploads'));
            const uploadStats = this.getDirectorySize(path.join(backupImagesDir, 'uploads'));
            imageCount += uploadStats.count;
            imageSize += uploadStats.size;
          }

          // Copy client images
          if (fs.existsSync(clientImagesDir)) {
            this.copyDirectory(clientImagesDir, path.join(backupImagesDir, 'client'));
            const clientStats = this.getDirectorySize(path.join(backupImagesDir, 'client'));
            imageCount += clientStats.count;
            imageSize += clientStats.size;
          }

          backupManifest.components['images'] = {
            folder: 'images',
            fileCount: imageCount,
            size: imageSize,
            status: 'success'
          };
          backupManifest.totalSize += imageSize;
          backupManifest.fileCount += imageCount;
          console.log(`✅ Images backed up (${imageCount} files)`);
        }
      }

      // 5. Create backup manifest
      const manifestPath = path.join(backupPath, 'backup-manifest.json');
      fs.writeFileSync(manifestPath, JSON.stringify(backupManifest, null, 2));
      console.log('✅ Backup manifest created');

      // 6. Create restore script
      this.createRestoreScript(backupPath);
      console.log('✅ Restore script created');

      const sizeInMB = (backupManifest.totalSize / (1024 * 1024)).toFixed(2);
      console.log('');
      console.log('🎉 Backup completed successfully!');
      console.log(`📁 Location: ${backupPath}`);
      console.log(`📊 Files: ${backupManifest.fileCount}`);
      console.log(`💾 Size: ${sizeInMB} MB`);
      console.log('');

      return backupPath;

    } catch (error) {
      console.error('❌ Backup failed:', error);
      // Clean up partial backup
      if (fs.existsSync(backupPath)) {
        fs.rmSync(backupPath, { recursive: true, force: true });
      }
      throw error;
    }
  }

  private async exportDataToJSON(outputPath: string): Promise<void> {
    if (!fs.existsSync(dbPath)) {
      console.log('⚠️ No database file found to export');
      return;
    }

    const db = new Database(dbPath);

    try {
      // Get all table names
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
      
      const data: any = {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        tables: {}
      };

      for (const table of tables) {
        const tableName = table.name;
        try {
          const tableData = db.prepare(`SELECT * FROM ${tableName}`).all();
          data.tables[tableName] = tableData;
          console.log(`📄 Exported ${tableName}: ${tableData.length} records`);
        } catch (error) {
          console.warn(`⚠️ Could not export table ${tableName}:`, error.message);
          data.tables[tableName] = { error: error.message };
        }
      }

      fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
    } finally {
      db.close();
    }
  }

  private copyDirectory(source: string, destination: string): void {
    if (!fs.existsSync(source)) return;

    fs.mkdirSync(destination, { recursive: true });
    const files = fs.readdirSync(source);

    for (const file of files) {
      const sourcePath = path.join(source, file);
      const destPath = path.join(destination, file);
      const stat = fs.statSync(sourcePath);

      if (stat.isDirectory()) {
        this.copyDirectory(sourcePath, destPath);
      } else {
        fs.copyFileSync(sourcePath, destPath);
      }
    }
  }

  private getDirectorySize(dirPath: string): { count: number; size: number } {
    if (!fs.existsSync(dirPath)) return { count: 0, size: 0 };

    let count = 0;
    let size = 0;
    const files = fs.readdirSync(dirPath);

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        const subDirStats = this.getDirectorySize(filePath);
        count += subDirStats.count;
        size += subDirStats.size;
      } else {
        count++;
        size += stat.size;
      }
    }

    return { count, size };
  }

  private createRestoreScript(backupPath: string): void {
    const restoreScript = `#!/bin/bash
# POS System Restore Script
# Generated on: ${new Date().toISOString()}

echo "🔄 Starting POS System restore..."

# Stop any running processes
pkill -f "npm run dev" || true
pkill -f "node.*server" || true
sleep 2

# Backup current database (if exists)
if [ -f "pos-data.db" ]; then
    echo "📦 Backing up current database..."
    cp pos-data.db pos-data.db.backup.$(date +%Y%m%d_%H%M%S)
fi

# Restore database
if [ -f "pos-data.db" ]; then
    echo "📥 Restoring database..."
    cp pos-data.db ../pos-data.db
    echo "✅ Database restored"
fi

# Restore configuration
if [ -d "config" ]; then
    echo "⚙️ Restoring configuration files..."
    cp config/* ../
    echo "✅ Configuration restored"
fi

# Restore images
if [ -d "images" ]; then
    echo "🖼️ Restoring images..."
    mkdir -p ../uploads
    mkdir -p ../client/public/images
    [ -d "images/uploads" ] && cp -r images/uploads/* ../uploads/
    [ -d "images/client" ] && cp -r images/client/* ../client/public/images/
    echo "✅ Images restored"
fi

echo "🎉 Restore completed successfully!"
echo "You can now start your POS system."
`;

    const scriptPath = path.join(backupPath, 'restore.sh');
    fs.writeFileSync(scriptPath, restoreScript);
    
    // Make script executable on Unix-like systems
    try {
      fs.chmodSync(scriptPath, '755');
    } catch (error) {
      // Ignore on Windows
    }
  }

  async listBackups(): Promise<any[]> {
    if (!fs.existsSync(backupDir)) {
      return [];
    }

    const backups = [];
    const items = fs.readdirSync(backupDir);

    for (const item of items) {
      const itemPath = path.join(backupDir, item);
      const stat = fs.statSync(itemPath);

      if (stat.isDirectory()) {
        const manifestPath = path.join(itemPath, 'backup-manifest.json');
        let manifest = null;

        if (fs.existsSync(manifestPath)) {
          try {
            manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
          } catch (error) {
            console.warn(`⚠️ Could not read manifest for ${item}`);
          }
        }

        backups.push({
          name: item,
          path: itemPath,
          created: stat.birthtime,
          size: this.getDirectorySize(itemPath),
          manifest
        });
      }
    }

    return backups.sort((a, b) => b.created.getTime() - a.created.getTime());
  }

  async deleteBackup(backupName: string): Promise<boolean> {
    const backupPath = path.join(backupDir, backupName);
    
    if (!fs.existsSync(backupPath)) {
      console.log(`⚠️ Backup ${backupName} not found`);
      return false;
    }

    try {
      fs.rmSync(backupPath, { recursive: true, force: true });
      console.log(`🗑️ Backup ${backupName} deleted successfully`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to delete backup ${backupName}:`, error);
      return false;
    }
  }
}

// CLI functionality
if (import.meta.url === `file://${process.argv[1]}`) {
  const backupManager = new BackupManager();
  const command = process.argv[2];

  switch (command) {
    case 'create':
      const options: BackupOptions = {};
      if (process.argv.includes('--no-db')) options.includeDatabase = false;
      if (process.argv.includes('--no-json')) options.includeJson = false;
      if (process.argv.includes('--no-images')) options.includeImages = false;
      
      const nameIndex = process.argv.indexOf('--name');
      if (nameIndex !== -1 && process.argv[nameIndex + 1]) {
        options.customName = process.argv[nameIndex + 1];
      }

      backupManager.createFullBackup(options).catch(console.error);
      break;

    case 'list':
      backupManager.listBackups().then(backups => {
        console.log('\n📦 Available backups:');
        if (backups.length === 0) {
          console.log('   No backups found');
          return;
        }

        backups.forEach((backup, index) => {
          const sizeInMB = (backup.size.size / (1024 * 1024)).toFixed(2);
          console.log(`${index + 1}. ${backup.name}`);
          console.log(`   Created: ${backup.created.toLocaleString()}`);
          console.log(`   Size: ${sizeInMB} MB (${backup.size.count} files)`);
          if (backup.manifest) {
            console.log(`   Components: ${Object.keys(backup.manifest.components).join(', ')}`);
          }
          console.log('');
        });
      }).catch(console.error);
      break;

    case 'delete':
      const backupToDelete = process.argv[3];
      if (!backupToDelete) {
        console.log('❌ Please specify backup name to delete');
        console.log('Usage: npx tsx create-backup.ts delete <backup-name>');
        process.exit(1);
      }
      backupManager.deleteBackup(backupToDelete).catch(console.error);
      break;

    default:
      console.log('POS System Backup Manager');
      console.log('');
      console.log('Usage:');
      console.log('  npx tsx create-backup.ts create [options]    - Create a new backup');
      console.log('  npx tsx create-backup.ts list               - List all backups');
      console.log('  npx tsx create-backup.ts delete <name>      - Delete a backup');
      console.log('');
      console.log('Create options:');
      console.log('  --name <name>     - Custom backup name');
      console.log('  --no-db          - Skip database backup');
      console.log('  --no-json        - Skip JSON export');
      console.log('  --no-images      - Skip images backup');
      console.log('');
      console.log('Examples:');
      console.log('  npx tsx create-backup.ts create');
      console.log('  npx tsx create-backup.ts create --name "before-update"');
      console.log('  npx tsx create-backup.ts create --no-images');
      break;
  }
}
