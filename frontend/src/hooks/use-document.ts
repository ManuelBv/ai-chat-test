import { useCallback, useEffect, useState } from "react";
import * as api from "../lib/api";
import type { Document } from "../types";

export function useDocument(conversationId: string | null) {
	const [documents, setDocuments] = useState<Document[]>([]);
	const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(
		null,
	);
	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const refresh = useCallback(async () => {
		if (!conversationId) {
			setDocuments([]);
			setSelectedDocumentId(null);
			return;
		}
		try {
			setError(null);
			const detail = await api.fetchConversation(conversationId);
			const docs = detail.documents ?? [];
			setDocuments(docs);
			// Auto-select first document if nothing selected or selection no longer valid
			setSelectedDocumentId((prev) => {
				if (prev && docs.some((d) => d.id === prev)) return prev;
				return docs[0]?.id ?? null;
			});
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load documents");
		}
	}, [conversationId]);

	useEffect(() => {
		refresh();
	}, [refresh]);

	const upload = useCallback(
		async (files: File | File[]) => {
			if (!conversationId) return null;
			const fileList = Array.isArray(files) ? files : [files];
			// Filter to PDFs only
			const pdfFiles = fileList.filter(
				(f) =>
					f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"),
			);
			if (pdfFiles.length === 0) {
				setError("No PDF files found in selection.");
				return null;
			}
			// Check for duplicates
			const existingNames = new Set(
				documents.map((d) => d.filename.toLowerCase()),
			);
			const duplicates = pdfFiles.filter((f) =>
				existingNames.has(f.name.toLowerCase()),
			);
			const newFiles = pdfFiles.filter(
				(f) => !existingNames.has(f.name.toLowerCase()),
			);
			if (newFiles.length === 0) {
				setError(
					duplicates.length === 1
						? `"${duplicates[0]?.name}" is already uploaded.`
						: `${duplicates.length} files already uploaded in this conversation.`,
				);
				return null;
			}
			try {
				setUploading(true);
				setError(null);
				let lastDoc: Document | null = null;
				const skipped: string[] = [];
				for (const file of newFiles) {
					try {
						const doc = await api.uploadDocument(conversationId, file);
						setDocuments((prev) => [...prev, doc]);
						lastDoc = doc;
					} catch {
						skipped.push(file.name);
					}
				}
				if (lastDoc) {
					setSelectedDocumentId(lastDoc.id);
				}
				if (duplicates.length > 0 || skipped.length > 0) {
					const parts: string[] = [];
					if (duplicates.length > 0) {
						parts.push(
							`${duplicates.length} duplicate${duplicates.length > 1 ? "s" : ""} skipped`,
						);
					}
					if (skipped.length > 0) {
						parts.push(`${skipped.length} failed to upload`);
					}
					setError(parts.join(", "));
				}
				return lastDoc;
			} catch (err) {
				setError(
					err instanceof Error ? err.message : "Failed to upload documents",
				);
				return null;
			} finally {
				setUploading(false);
			}
		},
		[conversationId, documents],
	);

	const removeDocument = useCallback(
		async (documentId: string) => {
			try {
				setError(null);
				await api.deleteDocument(documentId);
				setDocuments((prev) => {
					const remaining = prev.filter((d) => d.id !== documentId);
					// If we deleted the selected doc, select the first remaining
					if (documentId === selectedDocumentId) {
						setSelectedDocumentId(remaining[0]?.id ?? null);
					}
					return remaining;
				});
			} catch (err) {
				setError(
					err instanceof Error ? err.message : "Failed to delete document",
				);
			}
		},
		[selectedDocumentId],
	);

	const selectedDocument =
		documents.find((d) => d.id === selectedDocumentId) ?? null;

	return {
		documents,
		selectedDocument,
		selectedDocumentId,
		setSelectedDocumentId,
		uploading,
		error,
		upload,
		removeDocument,
		refresh,
	};
}
