import { readFileSync } from 'fs';

async function restoreOriginalData() {
  try {
    console.log('🔄 Loading original backup file...');
    const backupContent = readFileSync('./awesome-pos-backup-2025-06-28.json', 'utf8');
    
    console.log('📤 Sending restore request...');
    const response = await fetch('http://localhost:5000/api/backup/restore', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ backup: backupContent })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to restore: ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Restore completed:', result);
    
  } catch (error) {
    console.error('❌ Restore failed:', error);
  }
}

restoreOriginalData();