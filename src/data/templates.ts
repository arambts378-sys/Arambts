export interface TemplateConfig {
  id: string;
  name: string;
  description: string;
  category: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
    accent: string;
  };
  layout: string;
}

export const templates: TemplateConfig[] = [
  {
    id: "editorial",
    name: "Editorial",
    description: "Clean, text-focused layout perfect for summits and thought-leadership.",
    category: "Conference",
    colors: { primary: "#7A1F3D", secondary: "#1A1A1A", background: "#FFFFFF", text: "#171717", accent: "#E09E5F" },
    layout: "modern-centered"
  },
  {
    id: "executive",
    name: "Executive",
    description: "Bold and professional.",
    category: "Corporate",
    colors: { primary: "#0D253F", secondary: "#E2E8F0", background: "#F8FAFC", text: "#0F172A", accent: "#3B82F6" },
    layout: "sidebar-left"
  },
  {
    id: "creative",
    name: "Creative",
    description: "Vibrant and energetic.",
    category: "Festival",
    colors: { primary: "#8B5CF6", secondary: "#FBBF24", background: "#111827", text: "#F9FAFB", accent: "#EC4899" },
    layout: "asymmetric"
  }
];
