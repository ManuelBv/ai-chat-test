import { motion } from "framer-motion";
import { Bot, ThumbsDown, ThumbsUp } from "lucide-react";
import { useCallback, useState } from "react";
import { Streamdown } from "streamdown";
import "streamdown/styles.css";
import * as api from "../lib/api";
import type { FeedbackReason, Message } from "../types";

const FEEDBACK_REASONS: { value: FeedbackReason; label: string }[] = [
	{ value: "not_in_document", label: "Answer isn't in the document" },
	{ value: "citation_wrong", label: "Citation is wrong or missing" },
	{ value: "too_vague", label: "Answer is too vague" },
	{ value: "not_what_i_asked", label: "Not what I asked" },
	{ value: "other", label: "Other" },
];

interface MessageBubbleProps {
	message: Message;
	onFeedbackChange?: (message: Message) => void;
}

export function MessageBubble({
	message,
	onFeedbackChange,
}: MessageBubbleProps) {
	const [showReasons, setShowReasons] = useState(false);
	const [saving, setSaving] = useState(false);

	const handleFeedback = useCallback(
		async (value: "thumbs_up" | "thumbs_down") => {
			if (saving) return;
			// Toggle off if same value clicked
			const newValue = message.feedback === value ? null : value;
			if (newValue === "thumbs_down") {
				setShowReasons(true);
				// Optimistic update without reason yet
				setSaving(true);
				try {
					const updated = await api.submitFeedback(message.id, "thumbs_down");
					onFeedbackChange?.(updated);
				} finally {
					setSaving(false);
				}
				return;
			}
			setShowReasons(false);
			setSaving(true);
			try {
				const updated = await api.submitFeedback(message.id, newValue);
				onFeedbackChange?.(updated);
			} finally {
				setSaving(false);
			}
		},
		[message.id, message.feedback, saving, onFeedbackChange],
	);

	const handleReason = useCallback(
		async (reason: FeedbackReason) => {
			if (saving) return;
			setSaving(true);
			try {
				const updated = await api.submitFeedback(
					message.id,
					"thumbs_down",
					reason,
				);
				onFeedbackChange?.(updated);
				setShowReasons(false);
			} finally {
				setSaving(false);
			}
		},
		[message.id, saving, onFeedbackChange],
	);

	if (message.role === "system") {
		return (
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.2 }}
				className="flex justify-center py-2"
			>
				<p className="text-xs text-neutral-400">{message.content}</p>
			</motion.div>
		);
	}

	if (message.role === "user") {
		return (
			<motion.div
				initial={{ opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.2 }}
				className="flex justify-end py-1.5"
			>
				<div className="max-w-[75%] rounded-2xl rounded-br-md bg-neutral-100 px-4 py-2.5">
					<p className="whitespace-pre-wrap text-sm text-neutral-800">
						{message.content}
					</p>
				</div>
			</motion.div>
		);
	}

	// Assistant message
	return (
		<motion.div
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.2 }}
			className="flex gap-3 py-1.5"
		>
			<div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-neutral-900">
				<Bot className="h-4 w-4 text-white" />
			</div>
			<div className="min-w-0 max-w-[80%]">
				<div className="prose">
					<Streamdown>{message.content}</Streamdown>
				</div>

				{message.sources_cited > 0 && (
					<p className="mt-1.5 text-xs text-neutral-400">
						{message.sources_cited} source
						{message.sources_cited !== 1 ? "s" : ""} cited
					</p>
				)}

				{/* Feedback buttons */}
				<div className="mt-2 flex items-center gap-1">
					<button
						type="button"
						onClick={() => handleFeedback("thumbs_up")}
						disabled={saving}
						className={`rounded p-1 transition-colors ${
							message.feedback === "thumbs_up"
								? "bg-green-100 text-green-600"
								: "text-neutral-300 hover:bg-neutral-100 hover:text-neutral-500"
						}`}
						title="Helpful"
					>
						<ThumbsUp className="h-3.5 w-3.5" />
					</button>
					<button
						type="button"
						onClick={() => handleFeedback("thumbs_down")}
						disabled={saving}
						className={`rounded p-1 transition-colors ${
							message.feedback === "thumbs_down"
								? "bg-red-100 text-red-600"
								: "text-neutral-300 hover:bg-neutral-100 hover:text-neutral-500"
						}`}
						title="Not helpful"
					>
						<ThumbsDown className="h-3.5 w-3.5" />
					</button>
					{message.feedback_reason && (
						<span className="ml-1 text-xs text-neutral-400">
							{FEEDBACK_REASONS.find((r) => r.value === message.feedback_reason)
								?.label ?? message.feedback_reason}
						</span>
					)}
				</div>

				{/* Reason dropdown */}
				{showReasons && message.feedback === "thumbs_down" && (
					<div className="mt-1.5 rounded-lg border border-neutral-200 bg-white p-2 shadow-sm">
						<p className="mb-1.5 text-xs font-medium text-neutral-500">
							What went wrong?
						</p>
						<div className="flex flex-col gap-1">
							{FEEDBACK_REASONS.map((reason) => (
								<button
									key={reason.value}
									type="button"
									onClick={() => handleReason(reason.value)}
									disabled={saving}
									className={`rounded px-2 py-1 text-left text-xs transition-colors ${
										message.feedback_reason === reason.value
											? "bg-red-50 text-red-700"
											: "text-neutral-600 hover:bg-neutral-50"
									}`}
								>
									{reason.label}
								</button>
							))}
						</div>
					</div>
				)}
			</div>
		</motion.div>
	);
}

interface StreamingBubbleProps {
	content: string;
}

export function StreamingBubble({ content }: StreamingBubbleProps) {
	return (
		<div className="flex gap-3 py-1.5">
			<div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-neutral-900">
				<Bot className="h-4 w-4 text-white" />
			</div>
			<div className="min-w-0 max-w-[80%]">
				{content ? (
					<div className="prose">
						<Streamdown mode="streaming">{content}</Streamdown>
					</div>
				) : (
					<div className="flex items-center gap-1 py-2">
						<span className="h-1.5 w-1.5 animate-pulse rounded-full bg-neutral-400" />
						<span
							className="h-1.5 w-1.5 animate-pulse rounded-full bg-neutral-400"
							style={{ animationDelay: "0.15s" }}
						/>
						<span
							className="h-1.5 w-1.5 animate-pulse rounded-full bg-neutral-400"
							style={{ animationDelay: "0.3s" }}
						/>
					</div>
				)}
				<span className="inline-block h-4 w-0.5 animate-pulse bg-neutral-400" />
			</div>
		</div>
	);
}
