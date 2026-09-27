/** Existing fields come from recognition.py. Optional fields are a proposed
 * backend extension and must not be fabricated from the existing rating. */
export interface Wine {
  id: number;
  external_id: string;
  name: string;
  country: string;
  region: string;
  winery: string;
  rating: number | null;
  description: string;
  source_url: string;
  image_url?: string | null;
  grapes?: string[] | null;
  vintage?: number | null;
  style?: string | null;
  tasting_notes?: string[] | null;
  food_pairing?: string[] | null;
  roskachestvo?: {
    score: number | null;
    year?: number | null;
    source_url?: string | null;
  } | null;
}

export interface RecognitionCreated {
  task_id: string;
  status: string;
  uploaded_image_id: number;
  status_url: string;
}
export interface Candidate {
  wine: Wine;
  match_score?: number | null;
  confidence?: number | null;
  description?: string | null;
}
export interface RecognitionStatus {
  task_id: string;
  status: string;
  detected_wine_slug: string | null;
  error: string | null;
  wine: Wine | null;
  source_checked: boolean;
  source_wine_exists: boolean | null;
  fallback_message: string | null;
  similar_wines: Wine[];
  /** Future worker contract: ranked predictions, not similar_wines. */
  candidates?: Candidate[];
  match_score?: number | null;
  confidence?: number | null;
  decision?: "matched" | "ambiguous" | "unresolved";
  ocr_lines?: Array<{ text: string; confidence?: number | null }>;
  festival_eligible?: boolean | null;
}
export type RecognitionView =
  | "idle"
  | "uploading"
  | "processing"
  | "completed"
  | "failed";
export interface MissingWineSubmission {
  task_id: string | null;
  uploaded_image_id: number | null;
  name: string;
  winery: string;
  region: string;
  vintage: string;
  tried: boolean;
  rating: number | null;
  consent: boolean;
}
