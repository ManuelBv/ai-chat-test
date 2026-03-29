import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import type { Message } from "../types";
import { MessageBubble } from "./MessageBubble";

// Mock the streamdown component to avoid canvas/DOM complexity
vi.mock("streamdown", () => ({
	Streamdown: ({ children }: { children: string }) => <div>{children}</div>,
}));
vi.mock("streamdown/styles.css", () => ({}));

// Mock the API module
vi.mock("../lib/api", () => ({
	submitFeedback: vi.fn(),
}));

import * as api from "../lib/api";

const mockSubmitFeedback = vi.mocked(api.submitFeedback);

function makeMessage(overrides: Partial<Message> = {}): Message {
	return {
		id: "msg-1",
		conversation_id: "conv-1",
		role: "assistant",
		content: "Here is the answer based on section 4.2",
		sources_cited: 1,
		feedback: null,
		feedback_reason: null,
		created_at: "2026-03-29T00:00:00Z",
		...overrides,
	};
}

describe("MessageBubble", () => {
	it("renders user message as right-aligned bubble", () => {
		render(
			<MessageBubble message={makeMessage({ role: "user", content: "Hi" })} />,
		);
		expect(screen.getByText("Hi")).toBeInTheDocument();
	});

	it("renders assistant message with feedback buttons", () => {
		render(<MessageBubble message={makeMessage()} />);
		expect(screen.getByTitle("Helpful")).toBeInTheDocument();
		expect(screen.getByTitle("Not helpful")).toBeInTheDocument();
	});

	it("shows sources cited count", () => {
		render(<MessageBubble message={makeMessage({ sources_cited: 3 })} />);
		expect(screen.getByText("3 sources cited")).toBeInTheDocument();
	});

	it("shows singular source when count is 1", () => {
		render(<MessageBubble message={makeMessage({ sources_cited: 1 })} />);
		expect(screen.getByText("1 source cited")).toBeInTheDocument();
	});

	it("highlights thumbs up when feedback is thumbs_up", () => {
		render(<MessageBubble message={makeMessage({ feedback: "thumbs_up" })} />);
		const btn = screen.getByTitle("Helpful");
		expect(btn.className).toContain("bg-green-100");
	});

	it("highlights thumbs down when feedback is thumbs_down", () => {
		render(
			<MessageBubble message={makeMessage({ feedback: "thumbs_down" })} />,
		);
		const btn = screen.getByTitle("Not helpful");
		expect(btn.className).toContain("bg-red-100");
	});

	it("shows feedback reason label when reason is set", () => {
		render(
			<MessageBubble
				message={makeMessage({
					feedback: "thumbs_down",
					feedback_reason: "citation_wrong",
				})}
			/>,
		);
		expect(
			screen.getByText("Citation is wrong or missing"),
		).toBeInTheDocument();
	});

	it("shows reason dropdown after clicking thumbs down", async () => {
		mockSubmitFeedback.mockResolvedValue(
			makeMessage({ feedback: "thumbs_down" }),
		);

		// Stateful wrapper so onFeedbackChange updates the rendered message prop
		function Wrapper() {
			const [msg, setMsg] = useState(makeMessage());
			return <MessageBubble message={msg} onFeedbackChange={setMsg} />;
		}

		render(<Wrapper />);

		fireEvent.click(screen.getByTitle("Not helpful"));
		expect(await screen.findByText("What went wrong?")).toBeInTheDocument();
		expect(
			screen.getByText("Answer isn't in the document"),
		).toBeInTheDocument();
		expect(screen.getByText("Answer is too vague")).toBeInTheDocument();
		expect(screen.getByText("Not what I asked")).toBeInTheDocument();
		expect(screen.getByText("Other")).toBeInTheDocument();
	});

	it("does not show feedback buttons for user messages", () => {
		render(
			<MessageBubble
				message={makeMessage({ role: "user", content: "Hello" })}
			/>,
		);
		expect(screen.queryByTitle("Helpful")).not.toBeInTheDocument();
		expect(screen.queryByTitle("Not helpful")).not.toBeInTheDocument();
	});
});
