export interface Conversation {
	id: string;
	title: string;
	created_at: string;
	updated_at: string;
	has_document: boolean;
}

export type FeedbackReason =
	| "not_in_document"
	| "citation_wrong"
	| "too_vague"
	| "not_what_i_asked"
	| "other";

export interface Message {
	id: string;
	conversation_id: string;
	role: "user" | "assistant" | "system";
	content: string;
	sources_cited: number;
	feedback: "thumbs_up" | "thumbs_down" | null;
	feedback_reason: FeedbackReason | null;
	created_at: string;
}

export interface Document {
	id: string;
	conversation_id: string;
	filename: string;
	page_count: number;
	uploaded_at: string;
}

export interface ConversationDetail extends Conversation {
	document?: Document;
	documents: Document[];
}
