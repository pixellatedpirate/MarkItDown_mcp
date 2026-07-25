import { execSync } from 'child_process';

try {
  if (process.platform === 'win32') {
    execSync('setup.bat', { stdio: 'inherit' });
  } else {
    execSync('bash ./setup.sh', { stdio: 'inherit' });
  }
} catch (e) {
  console.warn('Preinstall setup notice: Python virtual environment setup warning:', e.message);
}