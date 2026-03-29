import {
	BookOpen,
	CheckCircle2,
	FileText,
	MessageSquare,
	Search,
	Upload,
} from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "./ui/button";

const STEPS = [
	{
		icon: BookOpen,
		title: "Welcome to Orbital Document Q&A",
		description: "welcome",
		action: null,
	},
	{
		icon: Upload,
		title: "Upload a document",
		description:
			"Every conversation starts with a document. Upload a PDF and the system will extract and index its contents. You can upload multiple documents to compare them side by side.",
		action: "load_sample" as const,
	},
	{
		icon: Search,
		title: "Explore the document viewer",
		description:
			"The right panel shows your uploaded document. Use the page controls to navigate, switch between documents using the tabs, and verify the AI's citations directly against the source.",
		action: null,
	},
	{
		icon: MessageSquare,
		title: "Ask questions",
		description:
			'Type a question in the chat — for example: "What are the break clause terms?" or "Summarize the rent review provisions." The AI will respond with answers grounded in your document, citing specific sections.',
		action: null,
	},
	{
		icon: CheckCircle2,
		title: "You're all set",
		description:
			"Start uploading your own documents and asking questions. Use the thumbs up/down buttons on AI responses to give feedback — it helps us improve. You can replay this guide anytime from the sidebar.",
		action: null,
	},
] as const;

interface OnboardingProps {
	onComplete: () => void;
	onLoadSample: () => Promise<void>;
}

export function Onboarding({ onComplete, onLoadSample }: OnboardingProps) {
	const [step, setStep] = useState(0);
	const [loadingSample, setLoadingSample] = useState(false);
	const [sampleLoaded, setSampleLoaded] = useState(false);

	const current = STEPS[step];
	const isLast = step === STEPS.length - 1;
	const Icon = current?.icon ?? BookOpen;

	const handleNext = useCallback(async () => {
		if (current?.action === "load_sample" && !sampleLoaded) {
			setLoadingSample(true);
			try {
				await onLoadSample();
				setSampleLoaded(true);
			} finally {
				setLoadingSample(false);
			}
		}
		if (isLast) {
			onComplete();
		} else {
			setStep((s) => s + 1);
		}
	}, [isLast, sampleLoaded, current?.action, onComplete, onLoadSample]);

	const handleSkip = useCallback(() => {
		onComplete();
	}, [onComplete]);

	if (!current) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
			<div className="mx-4 w-full max-w-lg rounded-2xl bg-white p-8 shadow-2xl">
				{/* Progress dots */}
				<div className="mb-6 flex justify-center gap-2">
					{STEPS.map((_, i) => (
						<div
							key={`step-${STEPS[i]?.title}`}
							className={`h-2 w-2 rounded-full transition-colors ${
								i === step
									? "bg-blue-600"
									: i < step
										? "bg-blue-300"
										: "bg-neutral-200"
							}`}
						/>
					))}
				</div>

				{/* Icon */}
				<div className="mb-4 flex justify-center">
					<div
						className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
							isLast ? "bg-green-100" : "bg-blue-100"
						}`}
					>
						<Icon
							className={`h-7 w-7 ${isLast ? "text-green-600" : "text-blue-600"}`}
						/>
					</div>
				</div>

				{/* Content */}
				<h2 className="mb-3 text-center text-lg font-semibold text-neutral-800">
					{current.title}
				</h2>
				{current.description === "welcome" ? (
					<div className="mb-8 space-y-4 text-center text-sm leading-relaxed">
						<p className="text-neutral-500">
							This tool helps commercial real estate lawyers review legal
							documents faster by answering questions with specific citations.
						</p>
						<p className="rounded-lg bg-amber-50 px-4 py-3 font-semibold text-amber-800">
							This is not a general legal assistant. It only works with
							documents you upload.
						</p>
						<p className="text-neutral-500">
							Upload your PDFs — leases, title reports, contracts — and the AI
							will analyse them and answer questions based solely on their
							content.
						</p>
					</div>
				) : (
					<p className="mb-8 text-center text-sm leading-relaxed text-neutral-500">
						{current.description}
					</p>
				)}

				{/* Sample document indicator */}
				{current.action === "load_sample" && sampleLoaded && (
					<div className="mb-4 flex items-center justify-center gap-2 rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700">
						<FileText className="h-4 w-4" />
						Sample document loaded
					</div>
				)}

				{/* Actions */}
				<div className="flex items-center justify-between">
					<button
						type="button"
						onClick={handleSkip}
						className="text-sm text-neutral-400 hover:text-neutral-600"
					>
						Skip guide
					</button>

					<Button
						onClick={handleNext}
						disabled={loadingSample}
						className="bg-blue-600 px-6 text-white hover:bg-blue-700"
					>
						{loadingSample
							? "Loading sample..."
							: isLast
								? "Get started"
								: current.action === "load_sample" && !sampleLoaded
									? "Load sample document"
									: "Next"}
					</Button>
				</div>

				{/* Step counter */}
				<p className="mt-4 text-center text-xs text-neutral-800">
					Step {step + 1} of {STEPS.length}
				</p>
			</div>
		</div>
	);
}
