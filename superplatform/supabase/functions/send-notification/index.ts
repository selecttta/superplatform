// Supabase Edge Function: send-notification
// Sends push notifications via Expo Push Notification service
// Deploy: supabase functions deploy send-notification

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { userId, title, body, data } = await req.json();
    if (!userId || !title) throw new Error('userId and title are required');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get user's push token
    const { data: profile } = await supabase
      .from('profiles')
      .select('push_token, full_name')
      .eq('id', userId)
      .single();

    // Store notification in DB regardless
    // Note: read_at is null = unread; no is_read column exists
    await supabase.from('notifications').insert({
      user_id: userId,
      title,
      body,
      data: data || {},
      created_at: new Date().toISOString(),
    });

    // Send via Expo Push if token exists
    if (profile?.push_token) {
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          to: profile.push_token,
          title,
          body,
          data: data || {},
          sound: 'default',
        }),
      });
      const result = await res.json();
      return new Response(JSON.stringify({ success: true, expo: result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true, note: 'No push token' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
