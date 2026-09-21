import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { supabase } from '../config/supabase';
import { decryptPassword } from '../routes/authRoutes';

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

async function main() {
  const args = process.argv.slice(2);
  const inputPayloadOrEmail = args[0];
  const secretKey = args[1] || process.env.ADMIN_ENCRYPTION_KEY || process.env.ADMIN_PASSWORD || 'JBJ_MASTER_SECRET_KEY_2026';

  console.log('\n============================================================');
  console.log('   🔐 JBJ ERP - Database Password Decryption Tool');
  console.log('============================================================\n');

  if (!inputPayloadOrEmail) {
    console.log('Fetching stored admin credentials from Database / Local store...');
    const email = (process.env.ADMIN_EMAIL || 'jayabhavanijewellers2021@gmail.com').trim().toLowerCase();

    let encryptedPayload: string | null = null;

    // 1. Check Supabase
    try {
      const { data, error } = await supabase
        .from('admin_auth')
        .select('email, encrypted_password, password_hash')
        .eq('email', email)
        .maybeSingle();

      if (!error && data?.encrypted_password) {
        encryptedPayload = data.encrypted_password;
        console.log(`[Supabase DB] Found record for: ${email}`);
      }
    } catch (e) {
      console.warn('⚠️ Supabase fetch warning:', e);
    }

    // 2. Check local file
    if (!encryptedPayload) {
      const credFile = path.join(__dirname, '..', '..', '.admin_credentials.json');
      if (fs.existsSync(credFile)) {
        try {
          const parsed = JSON.parse(fs.readFileSync(credFile, 'utf8'));
          if (parsed.encrypted_password) {
            encryptedPayload = parsed.encrypted_password;
            console.log(`[Local Store] Found record for: ${parsed.email || email}`);
          }
        } catch (e) {}
      }
    }

    if (!encryptedPayload) {
      console.error('❌ No encrypted_password found in Database or .admin_credentials.json.');
      console.log('\nUsage:');
      console.log('  npx ts-node src/scripts/decryptPassword.ts "<encrypted_ciphertext>" "<your_secret_key>"');
      process.exit(1);
    }

    try {
      const plain = decryptPassword(encryptedPayload, secretKey);
      console.log('\n✅ Decryption Successful!');
      console.log('------------------------------------------------------------');
      console.log(`👤 Admin Email:        ${email}`);
      console.log(`🔒 Encrypted DB Column: ${encryptedPayload}`);
      console.log(`🔑 Secret Key Used:     ${secretKey}`);
      console.log(`🔓 Plaintext Password:  ${plain}`);
      console.log('------------------------------------------------------------\n');
    } catch (err: any) {
      console.error(`\n❌ Decryption Failed: ${err.message}`);
      console.log(`Provided Secret Key: "${secretKey}" did not match.`);
    }
    return;
  }

  // If ciphertext was provided directly
  if (inputPayloadOrEmail.includes(':')) {
    try {
      const plain = decryptPassword(inputPayloadOrEmail, secretKey);
      console.log('\n✅ Decryption Successful!');
      console.log('------------------------------------------------------------');
      console.log(`🔒 Ciphertext:         ${inputPayloadOrEmail}`);
      console.log(`🔑 Secret Key:         ${secretKey}`);
      console.log(`🔓 Plaintext Password: ${plain}`);
      console.log('------------------------------------------------------------\n');
    } catch (err: any) {
      console.error(`\n❌ Decryption Failed: ${err.message}`);
    }
  } else {
    // Treat as email lookup
    const email = inputPayloadOrEmail.trim().toLowerCase();
    let encryptedPayload: string | null = null;
    try {
      const { data } = await supabase
        .from('admin_auth')
        .select('email, encrypted_password')
        .eq('email', email)
        .maybeSingle();
      if (data?.encrypted_password) {
        encryptedPayload = data.encrypted_password;
      }
    } catch (e) {}

    if (!encryptedPayload) {
      console.error(`❌ No encrypted_password found in DB for email: ${email}`);
      process.exit(1);
    }

    try {
      const plain = decryptPassword(encryptedPayload, secretKey);
      console.log('\n✅ Decryption Successful!');
      console.log('------------------------------------------------------------');
      console.log(`👤 Email:               ${email}`);
      console.log(`🔒 Encrypted DB Column: ${encryptedPayload}`);
      console.log(`🔓 Plaintext Password:  ${plain}`);
      console.log('------------------------------------------------------------\n');
    } catch (err: any) {
      console.error(`\n❌ Decryption Failed: ${err.message}`);
    }
  }
}

main().catch(console.error);
