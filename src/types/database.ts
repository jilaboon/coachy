export interface Coach {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
}

export interface Team {
  id: string;
  coach_id: string;
  name: string;
  age_group: string;
  theme_color_name: string;
  theme_color_hex: string;
  default_location: string | null;
  created_at: string;
}

export interface Player {
  id: string;
  team_id: string;
  full_name: string;
  phone: string;
  jersey_number: number | null;
  active: boolean;
  created_at: string;
}

export interface Practice {
  id: string;
  team_id: string;
  title: string;
  practice_date: string;
  start_time: string;
  end_time: string | null;
  location: string;
  notes: string | null;
  status: 'upcoming' | 'completed' | 'cancelled';
  created_at: string;
}

export interface Invitation {
  id: string;
  practice_id: string;
  player_id: string;
  token: string;
  response_status: 'yes' | 'no' | 'maybe' | 'no_response';
  responded_at: string | null;
  last_opened_at: string | null;
  created_at: string;
}

export interface Attendance {
  id: string;
  practice_id: string;
  player_id: string;
  actual_attended: boolean;
  marked_at: string | null;
  created_at: string;
}

export type ResponseStatus = 'yes' | 'no' | 'maybe' | 'no_response';

export const TEAM_COLORS = [
  { name: 'כחול', hex: '#2563eb' },
  { name: 'אדום', hex: '#dc2626' },
  { name: 'ירוק', hex: '#16a34a' },
  { name: 'כתום', hex: '#ea580c' },
  { name: 'סגול', hex: '#9333ea' },
  { name: 'שחור', hex: '#171717' },
  { name: 'תכלת', hex: '#0ea5e9' },
] as const;

export const RESPONSE_LABELS: Record<ResponseStatus, string> = {
  yes: 'מגיע',
  no: 'לא מגיע',
  maybe: 'אולי',
  no_response: 'טרם ענה',
};
