// Create encryption utility (utils/encryption.ts)
import CryptoJS from 'crypto-js';
import { API_CONFIG } from '../constants/config';

const SECRET_KEY = API_CONFIG.REACT_APP_ENCRYPTION_KEY || 'your-secret-key-change-in-production';

export const encryptId = (id: number): string => {
  return CryptoJS.AES.encrypt(id.toString(), SECRET_KEY).toString()
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};

export const decryptId = (encryptedId: string): number | null => {
  try {
    const restored = encryptedId
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const decrypted = CryptoJS.AES.decrypt(restored, SECRET_KEY);
    return parseInt(decrypted.toString(CryptoJS.enc.Utf8));
  } catch {
    return null;
  }
};
