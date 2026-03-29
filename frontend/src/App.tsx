import { useCallback, useEffect, useState } from "react";
import { ChatSidebar } from "./components/ChatSidebar";
import { ChatWindow } from "./components/ChatWindow";
import { DocumentViewer } from "./components/DocumentViewer";
import { Onboarding } from "./components/Onboarding";
import { TooltipProvider } from "./components/ui/tooltip";
import { useConversations } from "./hooks/use-conversations";
import { useDocument } from "./hooks/use-document";
import { useMessages } from "./hooks/use-messages";
import * as api from "./lib/api";

const ONBOARDING_KEY = "orbital_onboarding_complete";

export default function App() {
	const [showOnboarding, setShowOnboarding] = useState(false);

	// Check onboarding status on mount
	useEffect(() => {
		if (!localStorage.getItem(ONBOARDING_KEY)) {
			setShowOnboarding(true);
		}
	}, []);

	const {
		conversations,
		selectedId,
		loading: conversationsLoading,
		create,
		select,
		remove,
		refresh: refreshConversations,
	} = useConversations();

	const {
		messages,
		loading: messagesLoading,
		error: messagesError,
		streaming,
		streamingContent,
		send,
		updateMessage,
	} = useMessages(selectedId);

	const {
		documents,
		selectedDocument,
		selectedDocumentId,
		setSelectedDocumentId,
		upload,
		removeDocument,
		error: documentError,
		refresh: refreshDocuments,
	} = useDocument(selectedId);

	const handleSend = useCallback(
		async (content: string) => {
			await send(content);
			refreshConversations();
		},
		[send, refreshConversations],
	);

	const handleUpload = useCallback(
		async (files: File | File[]) => {
			const doc = await upload(files);
			if (doc) {
				refreshDocuments();
				refreshConversations();
			}
		},
		[upload, refreshDocuments, refreshConversations],
	);

	const handleCreate = useCallback(async () => {
		await create();
	}, [create]);

	const handleOnboardingComplete = useCallback(() => {
		localStorage.setItem(ONBOARDING_KEY, "true");
		setShowOnboarding(false);
	}, []);

	const handleLoadSample = useCallback(async () => {
		// Create a new conversation and load the sample document into it
		const conv = await api.createConversation();
		await api.loadSampleDocument(conv.id);
		refreshConversations();
		select(conv.id);
		refreshDocuments();
	}, [refreshConversations, select, refreshDocuments]);

	const handleStartOnboarding = useCallback(() => {
		setShowOnboarding(true);
	}, []);

	return (
		<TooltipProvider delayDuration={200}>
			<div className="flex h-screen bg-neutral-50">
				<ChatSidebar
					conversations={conversations}
					selectedId={selectedId}
					loading={conversationsLoading}
					onSelect={select}
					onCreate={handleCreate}
					onDelete={remove}
					onStartOnboarding={handleStartOnboarding}
				/>

				<ChatWindow
					messages={messages}
					loading={messagesLoading}
					error={messagesError}
					documentError={documentError}
					streaming={streaming}
					streamingContent={streamingContent}
					documents={documents}
					conversationId={selectedId}
					onSend={handleSend}
					onUpload={handleUpload}
					onMessageUpdate={updateMessage}
				/>

				<DocumentViewer
					documents={documents}
					selectedDocument={selectedDocument}
					selectedDocumentId={selectedDocumentId}
					onSelectDocument={setSelectedDocumentId}
					onDeleteDocument={removeDocument}
				/>

				{showOnboarding && (
					<Onboarding
						onComplete={handleOnboardingComplete}
						onLoadSample={handleLoadSample}
					/>
				)}
			</div>
		</TooltipProvider>
	);
}
