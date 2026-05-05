/**
 * Auth & User Types
 */

export interface UserProfile {
  id: string;
  full_name: string;
  business_name?: string;
  preferred_language: 'en' | 'ru' | 'az';
  tenant_id?: string;
  created_at?: string;
}
