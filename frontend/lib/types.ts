// The shapes of the data the API returns. Keep in sync with backend/app/schemas.py.

export type User = { id: string; email: string; role: "admin" | "agent" };

export type UserListItem = User & { created_at: string };

export type Citation = { marker: string; article_id: number; article_title: string; snippet: string };

export type Draft = {
  id: string;
  body: string;
  citations: Citation[];
  grounded: boolean;
  status: "pending" | "approved" | "edited" | "rejected";
  final_body: string | null;
  model: string | null;
  latency_ms: number | null;
  created_at: string;
};

export type Message = { id: string; author_type: "customer" | "agent"; body: string; created_at: string };

export type TicketListItem = {
  id: string;
  subject: string;
  customer_email: string;
  status: "new" | "open" | "resolved";
  ai_status: "pending" | "done" | "failed";
  category: string | null;
  priority: string | null;
  sentiment: string | null;
  created_at: string;
};

export type Ticket = TicketListItem & {
  body: string;
  assignee_id: string | null;
  first_response_at: string | null;
  resolved_at: string | null;
  messages: Message[];
  drafts: Draft[];
};

export type KbArticle = { id: number; title: string; body: string; updated_at: string };

export type Summary = {
  days: number;
  tickets: { total: number; open: number };
  median_first_response_minutes: number | null;
  median_resolution_hours: number | null;
  ai: {
    drafts_reviewed: number;
    outcomes: Record<string, number>;
    acceptance_rate: number | null;
    approved_as_is_rate: number | null;
    avg_edit_ratio: number | null;
    avg_latency_ms: number | null;
    ungrounded_drafts: number;
  };
  by_category: Record<string, number>;
  by_priority: Record<string, number>;
  by_sentiment: Record<string, number>;
  open_by_agent: { agent: string; open: number }[];
};

export type TimePoint = { day: string; created: number; resolved: number };
