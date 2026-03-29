import { ChevronLeft, ChevronRight, FileText, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Document as PDFDocument, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { getDocumentUrl } from "../lib/api";
import type { Document } from "../types";
import { Button } from "./ui/button";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
	"pdfjs-dist/build/pdf.worker.min.mjs",
	import.meta.url,
).toString();

const MIN_WIDTH = 280;
const MAX_WIDTH = 700;
const DEFAULT_WIDTH = 400;

interface DocumentViewerProps {
	documents: Document[];
	selectedDocument: Document | null;
	selectedDocumentId: string | null;
	onSelectDocument: (id: string) => void;
	onDeleteDocument: (id: string) => void;
}

export function DocumentViewer({
	documents,
	selectedDocument,
	selectedDocumentId,
	onSelectDocument,
	onDeleteDocument,
}: DocumentViewerProps) {
	const [numPages, setNumPages] = useState<number>(0);
	const [pageMap, setPageMap] = useState<Record<string, number>>({});
	const [pdfLoading, setPdfLoading] = useState(true);
	const [pdfError, setPdfError] = useState<string | null>(null);
	const [width, setWidth] = useState(DEFAULT_WIDTH);
	const [dragging, setDragging] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	const currentPage = (selectedDocumentId && pageMap[selectedDocumentId]) || 1;
	const setCurrentPage = useCallback(
		(updater: number | ((prev: number) => number)) => {
			if (!selectedDocumentId) return;
			setPageMap((prev) => {
				const current = prev[selectedDocumentId] || 1;
				const next = typeof updater === "function" ? updater(current) : updater;
				return { ...prev, [selectedDocumentId]: next };
			});
		},
		[selectedDocumentId],
	);

	// Reset loading state when switching documents
	// biome-ignore lint/correctness/useExhaustiveDependencies: selectedDocumentId is an intentional trigger
	useEffect(() => {
		setPdfLoading(true);
		setPdfError(null);
	}, [selectedDocumentId]);

	const handleMouseDown = useCallback(
		(e: React.MouseEvent) => {
			e.preventDefault();
			setDragging(true);

			const startX = e.clientX;
			const startWidth = width;

			const handleMouseMove = (moveEvent: MouseEvent) => {
				const delta = startX - moveEvent.clientX;
				const newWidth = Math.min(
					MAX_WIDTH,
					Math.max(MIN_WIDTH, startWidth + delta),
				);
				setWidth(newWidth);
			};

			const handleMouseUp = () => {
				setDragging(false);
				window.removeEventListener("mousemove", handleMouseMove);
				window.removeEventListener("mouseup", handleMouseUp);
			};

			window.addEventListener("mousemove", handleMouseMove);
			window.addEventListener("mouseup", handleMouseUp);
		},
		[width],
	);

	const pdfPageWidth = width - 48;

	if (documents.length === 0) {
		return (
			<div
				style={{ width }}
				className="flex h-full flex-shrink-0 flex-col items-center justify-center border-l border-neutral-200 bg-neutral-50"
			>
				<FileText className="mb-3 h-10 w-10 text-neutral-300" />
				<p className="text-sm text-neutral-400">No documents uploaded</p>
			</div>
		);
	}

	const pdfUrl = selectedDocument ? getDocumentUrl(selectedDocument.id) : null;

	return (
		<div
			ref={containerRef}
			style={{ width }}
			className="relative flex h-full flex-shrink-0 flex-col border-l border-neutral-200 bg-white"
		>
			{/* Resize handle */}
			<div
				className={`absolute top-0 left-0 z-10 h-full w-1.5 cursor-col-resize transition-colors hover:bg-neutral-300 ${
					dragging ? "bg-neutral-400" : ""
				}`}
				onMouseDown={handleMouseDown}
			/>

			{/* Document tabs */}
			{documents.length > 1 && (
				<div className="flex gap-0 overflow-x-auto border-b border-neutral-200 bg-neutral-50 scrollbar-thin">
					{documents.map((doc) => (
						<div
							key={doc.id}
							className={`flex min-w-0 max-w-[180px] items-center border-r border-neutral-200 transition-colors ${
								doc.id === selectedDocumentId
									? "bg-blue-600 text-white"
									: "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700"
							}`}
						>
							<button
								type="button"
								onClick={() => onSelectDocument(doc.id)}
								className="flex min-w-0 flex-1 items-center gap-1.5 px-3 py-2"
							>
								<FileText className="h-3.5 w-3.5 flex-shrink-0" />
								<span className="truncate text-xs font-medium">
									{doc.filename}
								</span>
							</button>
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									if (
										window.confirm(
											`Remove "${doc.filename}" from this conversation?`,
										)
									) {
										onDeleteDocument(doc.id);
									}
								}}
								className={`mr-1 flex-shrink-0 rounded p-0.5 transition-colors ${
									doc.id === selectedDocumentId
										? "hover:bg-blue-500"
										: "hover:bg-neutral-200"
								}`}
							>
								<X className="h-3 w-3" />
							</button>
						</div>
					))}
				</div>
			)}

			{/* Header */}
			{selectedDocument && (
				<div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
					<div className="min-w-0">
						<p className="truncate text-sm font-medium text-neutral-800">
							{selectedDocument.filename}
						</p>
						<p className="text-xs text-neutral-400">
							{selectedDocument.page_count} page
							{selectedDocument.page_count !== 1 ? "s" : ""}
						</p>
					</div>
					{documents.length === 1 && (
						<button
							type="button"
							onClick={() => {
								if (
									window.confirm(
										`Remove "${selectedDocument.filename}" from this conversation?`,
									)
								) {
									onDeleteDocument(selectedDocument.id);
								}
							}}
							className="flex-shrink-0 rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
						>
							<X className="h-4 w-4" />
						</button>
					)}
				</div>
			)}

			{/* PDF content */}
			<div className="flex-1 overflow-y-auto p-4">
				{pdfError && (
					<div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
						{pdfError}
					</div>
				)}

				{pdfUrl && (
					<PDFDocument
						key={selectedDocumentId}
						file={pdfUrl}
						onLoadSuccess={({ numPages: pages }) => {
							setNumPages(pages);
							setPdfLoading(false);
							setPdfError(null);
						}}
						onLoadError={(error) => {
							setPdfError(`Failed to load PDF: ${error.message}`);
							setPdfLoading(false);
						}}
						loading={
							<div className="flex items-center justify-center py-12">
								<Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
							</div>
						}
					>
						{!pdfLoading && !pdfError && (
							<Page
								pageNumber={currentPage}
								width={pdfPageWidth}
								loading={
									<div className="flex items-center justify-center py-12">
										<Loader2 className="h-5 w-5 animate-spin text-neutral-300" />
									</div>
								}
							/>
						)}
					</PDFDocument>
				)}
			</div>

			{/* Page navigation */}
			{numPages > 0 && (
				<div className="flex items-center justify-center gap-3 border-t border-blue-100 bg-blue-50 px-4 py-2.5">
					<Button
						variant="ghost"
						size="icon"
						className="h-7 w-7 text-blue-600 hover:bg-blue-100"
						disabled={currentPage <= 1}
						onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
					>
						<ChevronLeft className="h-4 w-4" />
					</Button>
					<span className="text-xs font-medium text-blue-700">
						Page {currentPage} of {numPages}
					</span>
					<Button
						variant="ghost"
						size="icon"
						className="h-7 w-7 text-blue-600 hover:bg-blue-100"
						disabled={currentPage >= numPages}
						onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
					>
						<ChevronRight className="h-4 w-4" />
					</Button>
				</div>
			)}
		</div>
	);
}
