// @ts-nocheck
// Supabase Edge Function: omnichannel-webhook
// Handles WhatsApp, Facebook Messenger & Instagram Direct Webhooks
// Environment: Deno

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ""
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ""
const TENANT_ID = '00000000-0000-0000-0000-000000000000'

serve(async (req: Request) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // 1. GET — Webhook Verification (same for all Meta products)
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

  // 2. POST — Incoming messages
  try {
    const body = await req.json()
    const objectType = body.object // "whatsapp_business_account", "page", or "instagram"
    const entry = body.entry?.[0]

    // ─────────────────────────────────────────────
    // A) WhatsApp Cloud API
    // ─────────────────────────────────────────────
    if (objectType === 'whatsapp_business_account') {
      const changes = entry?.changes?.[0]?.value
      const messages = changes?.messages
      if (messages && messages.length > 0) {
        const msg = messages[0]
        const phoneNumberId = changes?.metadata?.phone_number_id

        const { data: channel } = await supabase
          .from('integration_channels')
          .select('id, tenant_id')
          .eq('settings->>phone_number_id', phoneNumberId)
          .single()

        if (channel) {
          const { data: contact } = await supabase
            .from('integration_contacts')
            .upsert({
              tenant_id: channel.tenant_id,
              external_id: msg.from,
              source: 'whatsapp',
              name: changes.contacts?.[0]?.profile?.name || msg.from
            }, { onConflict: 'tenant_id,external_id,source' })
            .select().single()

          if (contact) {
            await supabase.from('integration_messages').insert({
              tenant_id: channel.tenant_id,
              channel_id: channel.id,
              contact_id: contact.id,
              direction: 'inbound',
              type: msg.type || 'text',
              content: msg.text?.body || msg.caption || '[media]',
              metadata: { wa_id: msg.id, msg_type: msg.type }
            })
          }
        }
      }
    }

    // ─────────────────────────────────────────────
    // B) Facebook Messenger
    // ─────────────────────────────────────────────
    if (objectType === 'page') {
      const messagingEvents = entry?.messaging
      if (messagingEvents && messagingEvents.length > 0) {
        for (const event of messagingEvents) {
          if (!event.message || event.message.is_echo) continue

          const senderId = event.sender?.id
          const pageId = event.recipient?.id
          const text = event.message?.text || '[attachment]'

          // Find channel by page_id
          const { data: channel } = await supabase
            .from('integration_channels')
            .select('id, tenant_id')
            .eq('provider', 'messenger')
            .single()

          const tenantId = channel?.tenant_id || TENANT_ID
          const channelId = channel?.id || null

          const { data: contact } = await supabase
            .from('integration_contacts')
            .upsert({
              tenant_id: tenantId,
              external_id: senderId,
              source: 'messenger',
              name: senderId
            }, { onConflict: 'tenant_id,external_id,source' })
            .select().single()

          if (contact) {
            await supabase.from('integration_messages').insert({
              tenant_id: tenantId,
              channel_id: channelId,
              contact_id: contact.id,
              direction: 'inbound',
              type: 'text',
              content: text,
              metadata: { mid: event.message?.mid, page_id: pageId }
            })
          }
        }
      }
    }

    // ─────────────────────────────────────────────
    // C) Instagram Direct
    // ─────────────────────────────────────────────
    if (objectType === 'instagram') {
      const messagingEvents = entry?.messaging
      if (messagingEvents && messagingEvents.length > 0) {
        for (const event of messagingEvents) {
          if (!event.message || event.message.is_echo) continue

          const senderId = event.sender?.id
          const text = event.message?.text || '[attachment]'

          // Find channel by provider
          const { data: channel } = await supabase
            .from('integration_channels')
            .select('id, tenant_id')
            .eq('provider', 'instagram')
            .single()

          const tenantId = channel?.tenant_id || TENANT_ID
          const channelId = channel?.id || null

          const { data: contact } = await supabase
            .from('integration_contacts')
            .upsert({
              tenant_id: tenantId,
              external_id: senderId,
              source: 'instagram',
              name: senderId
            }, { onConflict: 'tenant_id,external_id,source' })
            .select().single()

          if (contact) {
            await supabase.from('integration_messages').insert({
              tenant_id: tenantId,
              channel_id: channelId,
              contact_id: contact.id,
              direction: 'inbound',
              type: 'text',
              content: text,
              metadata: { mid: event.message?.mid }
            })
          }
        }
      }
    }

    return new Response(JSON.stringify({ status: 'ok' }), { status: 200 })
  } catch (error: any) {
    console.error("Webhook Error:", error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
