export interface Speaker {
  id: string;
  name: string;
  role: string;
  organization: string;
  imageUrl?: string;
}

export interface AgendaItem {
  id: string;
  time: string;
  title: string;
  description?: string;
}

export interface AgendaDay {
  id: string;
  dayNumber: string;
  date: string;
  items: AgendaItem[];
}

export interface Sponsor {
  id: string;
  name: string;
  tier?: string;
}

export interface Exhibitor {
  id: string;
  name: string;
}

export interface EventData {
  name: string;
  type: string;
  format: string;
  date: string;
  time: string;
  venue: string;
  location: string;
  description: string;
  speakers: Speaker[];
  agenda: AgendaDay[];
  sponsors: Sponsor[];
  exhibitors: Exhibitor[];
  contact: {
    email: string;
    phone: string;
    location: string;
  };
}
