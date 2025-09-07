
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

const getSupabaseClient = () => {
    if (!supabaseClient) {
        supabaseClient = createClientComponentClient();
    }
    return supabaseClient;
};

export const supabase = getSupabaseClient();
