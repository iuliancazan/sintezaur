export interface TezaurListItem {
  id: string;
  slug: string;
  brand: string;
  model: string;
  category: string;
  formFactor: string | null;
  yearReleased: number | null;
  yearDiscontinued: number | null;
  ownersPublicCount: number;
  avgRating: string | null;
  reviewCount: number;
  thumb: string | null;
  type: string | null;
}

export interface TezaurListResponse {
  items: TezaurListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface TezaurDetail {
  gear: {
    id: string;
    slug: string;
    brand: string;
    model: string;
    category: string;
    formFactor: string | null;
    familyId: string | null;
    yearReleased: number | null;
    yearDiscontinued: number | null;
    msrpAtLaunchEur: string | null;
    ownersPublicCount: number;
    avgRating: string | null;
    reviewCount: number;
    latestFirmwareVersion: string | null;
    firmwareNotesUrl: string | null;
    published: boolean;
    specs: Record<string, unknown>;
  };
  family: { id: string; slug: string; name: string } | null;
  siblings: { id: string; slug: string; brand: string; model: string; yearReleased: number | null }[];
  images: { id: string; sourceId: string; variant: string; path: string; width: number; height: number; position: number; caption: string | null }[];
  videos: { id: string; provider: string; externalId: string; title: string | null }[];
  links: { id: string; kind: string; url: string; label: string | null; vendor: string | null }[];
  description: { body: unknown; bodyHtml: string } | null;
  relationships: {
    parent: { id: string; slug: string; brand: string; model: string; type: string }[];
    child: { id: string; slug: string; brand: string; model: string; type: string }[];
  };
}
