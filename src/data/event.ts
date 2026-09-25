import { EventData } from "@/types/event";

export const eventData: EventData = {
  name: "Annual Leadership Summit 2027",
  type: "Conference",
  format: "In-Person",
  date: "12–13 March 2027",
  time: "09:00 AM – 06:00 PM IST",
  venue: "Chennai Trade Centre",
  location: "Chennai, Tamil Nadu, India",
  description:
    "Join industry leaders for two days of keynotes, strategic discussions, leadership insights, and high-impact executive networking.",
  speakers: [
    {
      id: "s1",
      name: "Aarav Menon",
      role: "Chief Executive Officer",
      organization: "Northstar Technologies",
      imageUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=400&auto=format&fit=crop",
    },
    {
      id: "s2",
      name: "Meera Krishnan",
      role: "Founder & Managing Director",
      organization: "Vertex Labs",
      imageUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=400&auto=format&fit=crop",
    },
    {
      id: "s3",
      name: "Rahul Iyer",
      role: "Chief Strategy Officer",
      organization: "Nexa Group",
      imageUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=400&auto=format&fit=crop",
    },
    {
      id: "s4",
      name: "Ananya Rao",
      role: "Technology & Innovation Leader",
      organization: "FutureWorks",
      imageUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=400&auto=format&fit=crop",
    },
  ],
  agenda: [
    {
      id: "d1",
      dayNumber: "01",
      date: "12 March 2027",
      items: [
        { id: "a1", time: "09:00", title: "Registration & Welcome Coffee" },
        { id: "a2", time: "10:00", title: "Opening Keynote" },
        { id: "a3", time: "11:30", title: "Leadership in a Changing World" },
        { id: "a4", time: "13:00", title: "Executive Lunch" },
        { id: "a5", time: "14:30", title: "Strategic Innovation Panel" },
        { id: "a6", time: "16:00", title: "Networking Session" },
      ],
    },
    {
      id: "d2",
      dayNumber: "02",
      date: "13 March 2027",
      items: [
        { id: "b1", time: "09:00", title: "Morning Keynote" },
        { id: "b2", time: "10:30", title: "Technology & Business Transformation" },
        { id: "b3", time: "12:00", title: "Leadership Roundtable" },
        { id: "b4", time: "14:00", title: "Future of Work" },
        { id: "b5", time: "15:30", title: "Executive Networking" },
        { id: "b6", time: "17:00", title: "Closing Session" },
      ],
    },
  ],
  sponsors: [
    { id: "sp1", name: "Northstar" },
    { id: "sp2", name: "Vertex" },
    { id: "sp3", name: "Nexa" },
    { id: "sp4", name: "FutureWorks" },
    { id: "sp5", name: "Axiom" },
  ],
  exhibitors: [
    { id: "e1", name: "Innovation Lab" },
    { id: "e2", name: "Future Systems" },
    { id: "e3", name: "Digital Works" },
    { id: "e4", name: "Enterprise Hub" },
  ],
  contact: {
    email: "events@example.com",
    phone: "+91 90000 00000",
    location: "Chennai, Tamil Nadu, India",
  },
};
