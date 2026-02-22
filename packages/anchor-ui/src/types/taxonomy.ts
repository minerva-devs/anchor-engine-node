// Minimal taxonomy types
export interface TaxonomyRule {
  id: string;
  name: string;
  description: string;
  tags: string[];
}

export interface TaxonomyPreset {
  id: string;
  name: string;
  timestamp: number;
  rules: TaxonomyRule[];
}

export type SemanticCategory =
  | 'RELATIONSHIP'
  | 'NARRATIVE'
  | 'TECHNICAL'
  | 'INDUSTRY'
  | 'LOCATION'
  | 'OTHER';

export const SemanticCategory = {
  RELATIONSHIP: 'RELATIONSHIP' as SemanticCategory,
  NARRATIVE: 'NARRATIVE' as SemanticCategory,
  TECHNICAL: 'TECHNICAL' as SemanticCategory,
  INDUSTRY: 'INDUSTRY' as SemanticCategory,
  LOCATION: 'LOCATION' as SemanticCategory,
  OTHER: 'OTHER' as SemanticCategory
} as const;

export interface SemanticRule {
  id: string;
  category: SemanticCategory;
  weight: number;
  triggers: string[];
  exclusions: string[];
}

export interface DiscoveredEntity {
  name: string;
  frequency: number;
  suggestedCategory: SemanticCategory;
}
