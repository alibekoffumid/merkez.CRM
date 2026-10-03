import { supabase } from '../config/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

let activeChannel: RealtimeChannel | null = null;

export const scannerSyncService = {
  initPCChannel(roomCode: string, onFeedback?: (msg: string) => void) {
    if (activeChannel) {
      supabase.removeChannel(activeChannel);
      activeChannel = null;
    }

    const channelName = `scanner-room-${roomCode}`;
    activeChannel = supabase.channel(channelName);

    activeChannel
      .on('broadcast', { event: 'pc-ack' }, (payload) => {
        if (onFeedback && payload.payload?.text) {
          onFeedback(payload.payload.text);
        }
      })
      .subscribe((status) => {
        console.log(`Scanner channel [${channelName}] status:`, status);
      });

    return activeChannel;
  },

  async beamBarcodeToPC(roomCode: string, barcode: string, productName?: string): Promise<boolean> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      // 1. Broadcast over Realtime channel for ultra-low latency (<50ms)
      if (activeChannel) {
        await activeChannel.send({
          type: 'broadcast',
          event: 'barcode-scanned',
          payload: {
            barcode,
            productName: productName || '',
            timestamp: Date.now(),
          },
        });
      }

      // 2. Also write to scanner_cart_events so existing desktop listener catches it
      if (userId) {
        await supabase.from('scanner_cart_events').insert([{
          user_id: userId,
          barcode: barcode,
          product_name: productName || 'Skan edilmiş məhsul',
          status: 'pending',
          quantity: 1,
        }]);
      }

      return true;
    } catch (e) {
      console.error('beamBarcodeToPC error:', e);
      return false;
    }
  },

  disconnect() {
    if (activeChannel) {
      supabase.removeChannel(activeChannel);
      activeChannel = null;
    }
  }
};
