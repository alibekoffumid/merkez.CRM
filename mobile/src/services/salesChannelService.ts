
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';

const STORAGE_KEY = '@merkez_custom_sales_channels';

export const DEFAULT_SALES_CHANNELS: string[] = [
  'Mağaza',
  'Instagram',
  'Web site',
  'Birmarket',
  'Tap.az',
  'Lalafo',
  'TikTok',
];

export const salesChannelService = {
  async getChannels(): Promise<{ allChannels: string[]; customChannels: string[] }> {
    let customChannels: string[] = [];

    // 1. Try local cache first for instant 0ms rendering
    try {
      const localJson = await AsyncStorage.getItem(STORAGE_KEY);
      if (localJson) {
        const parsed = JSON.parse(localJson);
        if (Array.isArray(parsed)) {
          customChannels = parsed;
        }
      }
    } catch (e) {
      console.warn('AsyncStorage getChannels error:', e);
    }

    // 2. Fetch from Supabase profiles.custom_channels
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (userId) {
        const { data, error } = await supabase
          .from('profiles')
          .select('custom_channels')
          .eq('id', userId)
          .maybeSingle();

        if (!error && data?.custom_channels && Array.isArray(data.custom_channels)) {
          customChannels = data.custom_channels;
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(customChannels));
        }
      }
    } catch (e) {
      console.warn('Supabase fetch custom_channels error:', e);
    }

    // Merge defaults + unique custom channels
    const allSet = new Set<string>([...DEFAULT_SALES_CHANNELS, ...customChannels]);
    return {
      allChannels: Array.from(allSet),
      customChannels,
    };
  },

  async addChannel(newChannelName: string): Promise<{ allChannels: string[]; customChannels: string[] }> {
    const trimmed = newChannelName.trim();
    if (!trimmed) {
      return this.getChannels();
    }

    const { customChannels } = await this.getChannels();
    if (!DEFAULT_SALES_CHANNELS.includes(trimmed) && !customChannels.includes(trimmed)) {
      const updated = [...customChannels, trimmed];
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

      try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;
        if (userId) {
          await supabase
            .from('profiles')
            .update({ custom_channels: updated })
            .eq('id', userId);
        }
      } catch (e) {
        console.warn('Supabase update custom_channels error:', e);
      }

      const allSet = new Set<string>([...DEFAULT_SALES_CHANNELS, ...updated]);
      return {
        allChannels: Array.from(allSet),
        customChannels: updated,
      };
    }

    return this.getChannels();
  },

  async deleteChannel(channelToDelete: string): Promise<{ allChannels: string[]; customChannels: string[] }> {
    const { customChannels } = await this.getChannels();
    const updated = customChannels.filter((c) => c !== channelToDelete);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (userId) {
        await supabase
          .from('profiles')
          .update({ custom_channels: updated })
          .eq('id', userId);
      }
    } catch (e) {
      console.warn('Supabase delete custom_channels error:', e);
    }

    const allSet = new Set<string>([...DEFAULT_SALES_CHANNELS, ...updated]);
    return {
      allChannels: Array.from(allSet),
      customChannels: updated,
    };
  },
};
