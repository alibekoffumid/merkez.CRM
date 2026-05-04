// @ts-nocheck
// Supabase Edge Function: omnichannel-webhook
// Handles WhatsApp (Meta) and Instagram Direct Webhooks
// Environment: Deno

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ""
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ""

serve(async (req: Request) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // 1. GET requests for Webhook Verification (Meta challenge)
  if (req.method === 'GET') {
    const url = new URL(req.url)
    const mode = url.searchParams.get('hub.mode')
    const token = url.searchParams.get('hub.verify_token')
    const challenge = url.searchParams.get('hub.challenge')

    if (mode === 'subscribe' && token === 'merkez_omni_2024') {
      return new Response(challenge, { status: 200 })
    }
    return new Response('Forbidden', { status: 403 })
  }

  // 2. POST requests for incoming messages
  try {
    const body = await req.json()
    
    // Determine source (WhatsApp vs Instagram)
    const entry = body.entry?.[0]
    const changes = entry?.changes?.[0]?.value
    const messages = changes?.messages
    const messaging = entry?.messaging

    if (messages) {
      const msg = messages[0]
      const from = msg.from
      const text = msg.text?.body
      
      const { data: channel } = await supabase
        .from('integration_channels')
        .select('id, tenant_id')
        .eq('settings->>phone_number_id', changes.metadata.phone_number_id)
        .single()

      if (channel) {
        // Business logic to upsert contact and message
        const { data: contact } = await supabase
          .from('integration_contacts')
          .upsert({
            tenant_id: channel.tenant_id,
            external_id: from,
            source: 'whatsapp',
            name: body.entry[0].changes[0].value.contacts?.[0]?.profile?.name || from
          }, { onConflict: 'tenant_id,external_id,source' })
          .select()
          .single()

        if (contact) {
          await supabase.from('integration_messages').insert({
            tenant_id: channel.tenant_id,
            channel_id: channel.id,
            contact_id: contact.id,
            direction: 'inbound',
            type: 'text',
            content: text,
            metadata: { wa_id: msg.id }
          })
        }
      }
    }

    return new Response(JSON.stringify({ status: 'ok' }), { status: 200 })
  } catch (error: any) {
    console.error("Webhook Error:", error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
