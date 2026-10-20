export interface LandingMetric {
  id: string;
  value: string;
  label: string;
  colorClass: string;
}

export interface LandingFeature {
  id: string;
  icon: string;
  title: string;
  description: string;
  colorBgClass: string;
  colorTextClass: string;
  visualType: 'sparkline' | 'tags' | 'keyboard';
}

export interface LandingTestimonial {
  id: string;
  author: string;
  role: string;
  content: string;
  avatarUrl: string;
  rating: number;
}

export interface LandingData {
  hero: {
    badge: string;
    headline: string;
    subheadline: string;
    trialText: string;
  };
  metrics: LandingMetric[];
  features: LandingFeature[];
  testimonials: LandingTestimonial[];
}
