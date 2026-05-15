import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// You should eventually set this via: npx supabase secrets set TELEGRAM_BOT_TOKEN=your_token
const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') || '8836779840:AAFCOyW47duv5z6e9B7HSX_ju51YQqCSU2E';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user } = await req.json()
    if (!user || !user.hash) {
      return new Response(JSON.stringify({ error: 'Missing user data or hash' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 1. Verify Telegram Hash
    const { hash, ...dataToCheck } = user;
    const dataCheckArr = Object.keys(dataToCheck)
      .sort()
      .map(key => `${key}=${dataToCheck[key]}`);
    const dataCheckString = dataCheckArr.join('\n');

    const encoder = new TextEncoder();
    const secretKey = await crypto.subtle.importKey(
      'raw',
      await crypto.subtle.digest('SHA-256', encoder.encode(BOT_TOKEN)),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign(
      'HMAC',
      secretKey,
      encoder.encode(dataCheckString)
    );

    const hashHex = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (hash !== hashHex) {
      console.error("Hash mismatch", { expected: hashHex, got: hash });
      return new Response(JSON.stringify({ error: 'Invalid Telegram hash' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Check auth date to prevent replay attacks (e.g. older than 24h)
    const now = Math.floor(Date.now() / 1000);
    if (now - user.auth_date > 86400) {
      return new Response(JSON.stringify({ error: 'Auth data is outdated' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 2. Authenticate or Create user in Supabase
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const dummyEmail = `${user.id}@telegram.local`;
    // Generate a strong random password that acts as a secure access token
    const generatedPassword = crypto.randomUUID() + crypto.randomUUID(); 

    // Try to find the user
    const { data: usersData, error: getUserError } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = usersData?.users?.find(u => u.email === dummyEmail);

    if (existingUser) {
      // Update password to the new generated one
      await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
        password: generatedPassword,
        user_metadata: {
          full_name: `${user.first_name} ${user.last_name || ''}`.trim(),
          avatar_url: user.photo_url || null,
          telegram_username: user.username || null
        }
      });
    } else {
      // Create new user
      const { error: createUserError } = await supabaseAdmin.auth.admin.createUser({
        email: dummyEmail,
        password: generatedPassword,
        email_confirm: true,
        user_metadata: {
          full_name: `${user.first_name} ${user.last_name || ''}`.trim(),
          avatar_url: user.photo_url || null,
          telegram_id: user.id,
          telegram_username: user.username || null
        }
      });
      if (createUserError) throw createUserError;
    }

    // Return the credentials to the frontend so it can sign in
    return new Response(JSON.stringify({ 
      email: dummyEmail, 
      password: generatedPassword 
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })

  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
})
