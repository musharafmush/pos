
import { BackupManager } from './create-backup.js';

async function createQuickBackup() {
  console.log('🚀 Creating quick backup of your POS system...');
  
  const backupManager = new BackupManager();
  
  try {
    const backupPath = await backupManager.createFullBackup({
      customName: `quick-backup-${Date.now()}`
    });
    
    console.log('');
    console.log('✅ Quick backup created successfully!');
    console.log(`📂 Backup location: ${backupPath}`);
    console.log('');
    console.log('💡 To restore this backup later:');
    console.log('1. Navigate to the backup folder');
    console.log('2. Run the restore.sh script (Linux/Mac) or manually copy files');
    console.log('');
    
  } catch (error) {
    console.error('❌ Quick backup failed:', error);
  }
}

createQuickBackup();
