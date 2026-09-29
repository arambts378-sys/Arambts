export interface User {
  id: string;
  name: string;
  email: string;
}

export interface WebsiteSection {
  id: string; // e.g., 'home', 'about', 'speakers'
  type: string;
  visible: boolean;
  order: number;
  content?: {
    image?: string;
    layout?: 'banner' | 'split';
    imageFit?: 'contain' | 'cover';
    imageAlignment?: 'left' | 'center' | 'right';
    overlay?: 'none' | 'light' | 'dark';
    showEventInfo?: boolean;
    heroHeight?: 'small' | 'medium' | 'large';
    [key: string]: any;
  };
}

export interface ThemeConfig {
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  fontHeading?: string;
  fontBody?: string;
  buttonStyle?: string;
}

export interface WebsiteState {
  templateId: string;
  status: 'draft' | 'published';
  theme: ThemeConfig;
  sections: WebsiteSection[];
  seo?: any;
}

export interface WebsiteConfig {
  status: 'draft' | 'published';
  draft?: WebsiteState;
  published?: WebsiteState;
  
  // Keep legacy properties optional for backward compatibility
  templateId?: string;
  sections?: WebsiteSection[];
}

export interface Event {
  id: string;
  slug: string;
  name: string;
  type: string;
  format: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  timezone: string;
  location?: string;
  description?: string;
  status: 'draft' | 'published' | 'archived';
  createdAt: string;
  flyer?: string;
  website: WebsiteConfig;
}

export type EventPersonType = 'attendee' | 'staff' | 'speaker';
export type EventPersonStatus = 'active' | 'inactive';

export interface Person {
  id: string;
  workspace_id: string;
  profile_id?: string | null;
  first_name: string;
  last_name?: string | null;
  email: string;
  phone?: string | null;
  organization?: string | null;
  job_title?: string | null;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventPerson {
  id: string;
  event_id: string;
  person_id: string;
  person_type: EventPersonType;
  status: EventPersonStatus;
  created_at: string;
  updated_at: string;
  person?: Person; // Joined data
  speaker_profile?: EventSpeakerProfile; // Joined data for speakers
}

export interface EventSpeakerProfile {
  event_person_id: string;
  headline?: string | null;
  bio?: string | null;
  website_url?: string | null;
  twitter_url?: string | null;
  linkedin_url?: string | null;
  is_featured: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export type RegistrationStatus = 'pending' | 'confirmed' | 'cancelled' | 'failed';
export type ConfirmationStatus = 'pending' | 'confirmed' | 'failed';

export interface EventRegistrationSettings {
  event_id: string;
  is_enabled: boolean;
  title?: string | null;
  description?: string | null;
  capacity?: number | null;
  confirmation_message?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Registration {
  id: string;
  event_id: string;
  person_id: string;
  event_person_id: string;
  registration_number: string;
  status: RegistrationStatus;
  confirmation_status: ConfirmationStatus;
  registered_at: string;
  confirmed_at?: string | null;
  cancelled_at?: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
  distance_category_id?: string | null;
  person?: Person; // Joined data
  event_person?: EventPerson; // Joined data
  distance_category?: WalkathonDistanceCategory; // Joined data
}

export interface WalkathonDistanceCategory {
  id: string;
  event_id: string;
  distance_km: number;
  name: string;
  capacity?: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
