import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zvumiqtxmjlqpeqvlszj.supabase.co';
const supabaseAnonKey = 'sb_publishable_-Xg-MvexK-uAJaEozhXZ6Q_vkuV_pvv';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
