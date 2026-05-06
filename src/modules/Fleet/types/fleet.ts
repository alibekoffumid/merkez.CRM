export type VehicleStatus = 'active' | 'repair' | 'available';

export interface Vehicle {
  id: string;
  business_id: string;
  plate_number: string;
  brand_model: string;
  year: number;
  vin: string;
  status: VehicleStatus;
  current_mileage: number;
  last_oil_change: number;
  insurance_expiry: string;
  created_at: string;
}

export interface Driver {
  id: string;
  business_id: string;
  full_name: string;
  license_number: string;
  whatsapp_number: string;
  balance: number;
  status: 'active' | 'suspended';
  created_at: string;
}

export interface RentLog {
  id: string;
  business_id: string;
  vehicle_id: string;
  driver_id: string;
  daily_plan: number;
  actual_revenue: number;
  commission: number;
  shift_start: string;
  shift_end?: string;
  start_mileage: number;
  end_mileage?: number;
  status: 'open' | 'closed';
  vehicle?: Vehicle;
  driver?: Driver;
}

export interface FleetStats {
  total_vehicles: number;
  active_vehicles: number;
  daily_revenue: number;
  pending_maintenance: number;
}
