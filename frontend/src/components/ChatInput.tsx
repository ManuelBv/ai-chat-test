import { FolderOpen, Paperclip, SendHorizontal } from "lucide-react";
import {
	type KeyboardEvent,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface ChatInputProps {
	onSend: (content: string) => void;
	onUpload: (files: File | File[]) => void;
	disabled: boolean;
}

export function ChatInput({ onSend, onUpload, disabled }: ChatInputProps) {
	const [value, setValue] = useState("");
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const folderInputRef = useRef<HTMLInputElement>(null);

	const handleSend = useCallback(() => {
		const trimmed = value.trim();
		if (!trimmed || disabled) return;
		onSend(trimmed);
		setValue("");
		if (textareaRef.current) {
			textareaRef.current.style.height = "auto";
		}
	}, [value, disabled, onSend]);

	const handleKeyDown = useCallback(
		(e: KeyboardEvent<HTMLTextAreaElement>) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				handleSend();
			}
		},
		[handleSend],
	);

	useEffect(() => {
		if (folderInputRef.current) {
			folderInputRef.current.setAttribute("webkitdirectory", "");
		}
	}, []);

	const handleInput = useCallback(() => {
		const textarea = textareaRef.current;
		if (!textarea) return;
		textarea.style.height = "auto";
		textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
	}, []);

	const handleFileChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const files = e.target.files;
			if (!files || files.length === 0) return;
			if (files.length === 1) {
				onUpload(files[0] as File);
			} else {
				onUpload(Array.from(files));
			}
			if (fileInputRef.current) fileInputRef.current.value = "";
			if (folderInputRef.current) folderInputRef.current.value = "";
		},
		[onUpload],
	);

	return (
		<div className="border-t border-neutral-200 bg-white p-3">
			<div className="flex items-end gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2">
				<Tooltip>
					<TooltipTrigger asChild>
						<div>
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8 flex-shrink-0"
								onClick={() => fileInputRef.current?.click()}
							>
								<Paperclip className="h-4 w-4 text-neutral-500" />
							</Button>
						</div>
					</TooltipTrigger>
					<TooltipContent>Upload documents</TooltipContent>
				</Tooltip>

				<Tooltip>
					<TooltipTrigger asChild>
						<div>
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8 flex-shrink-0"
								onClick={() => folderInputRef.current?.click()}
							>
								<FolderOpen className="h-4 w-4 text-neutral-500" />
							</Button>
						</div>
					</TooltipTrigger>
					<TooltipContent>Upload folder</TooltipContent>
				</Tooltip>

				<input
					ref={fileInputRef}
					type="file"
					accept=".pdf"
					multiple
					className="hidden"
					onChange={handleFileChange}
				/>

				<input
					ref={folderInputRef}
					type="file"
					accept=".pdf"
					className="hidden"
					onChange={handleFileChange}
				/>

				<textarea
					ref={textareaRef}
					value={value}
					onChange={(e) => setValue(e.target.value)}
					onInput={handleInput}
					onKeyDown={handleKeyDown}
					placeholder="Ask a question about your documents..."
					rows={1}
					className="max-h-[200px] min-h-[36px] flex-1 resize-none bg-transparent py-1.5 text-sm text-neutral-800 placeholder-neutral-400 outline-none"
					disabled={disabled}
				/>

				<Button
					variant="ghost"
					size="icon"
					className="h-8 w-8 flex-shrink-0"
					disabled={!value.trim() || disabled}
					onClick={handleSend}
				>
					<SendHorizontal
						className={`h-4 w-4 ${
							value.trim() && !disabled
								? "text-neutral-900"
								: "text-neutral-300"
						}`}
					/>
				</Button>
			</div>
		</div>
	);
}
