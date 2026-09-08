import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const rawUrl = process.env.SUPABASE_URL || '';
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const supabaseKey = (process.env.SUPABASE_KEY || '').trim();

export const supabase = createClient(
  supabaseUrl !== '' ? supabaseUrl : 'https://placeholder.supabase.co',
  supabaseKey !== '' ? supabaseKey : 'placeholder-key'
);
