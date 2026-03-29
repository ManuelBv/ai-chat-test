import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Onboarding } from "./Onboarding";

describe("Onboarding", () => {
	const defaultProps = {
		onComplete: vi.fn(),
		onLoadSample: vi.fn().mockResolvedValue(undefined),
	};

	it("renders the first step on mount", () => {
		render(<Onboarding {...defaultProps} />);
		expect(
			screen.getByText("Welcome to Orbital Document Q&A"),
		).toBeInTheDocument();
		expect(screen.getByText("Step 1 of 5")).toBeInTheDocument();
	});

	it("displays the warning that the app only works with uploaded documents", () => {
		render(<Onboarding {...defaultProps} />);
		expect(
			screen.getByText(/not a general legal assistant/i),
		).toBeInTheDocument();
	});

	it("advances to the next step on Next click", () => {
		render(<Onboarding {...defaultProps} />);
		fireEvent.click(screen.getByRole("button", { name: /next/i }));
		expect(screen.getByText("Upload a document")).toBeInTheDocument();
		expect(screen.getByText("Step 2 of 5")).toBeInTheDocument();
	});

	it("calls onComplete when Skip guide is clicked", () => {
		const onComplete = vi.fn();
		render(<Onboarding {...defaultProps} onComplete={onComplete} />);
		fireEvent.click(screen.getByText("Skip guide"));
		expect(onComplete).toHaveBeenCalledOnce();
	});

	it("calls onComplete on the last step", async () => {
		const onComplete = vi.fn();
		render(<Onboarding {...defaultProps} onComplete={onComplete} />);

		// Step 1 → 2
		fireEvent.click(screen.getByRole("button", { name: /next/i }));
		// Step 2 → 3 (loads sample — async)
		fireEvent.click(
			screen.getByRole("button", { name: /load sample document/i }),
		);
		await screen.findByText("Explore the document viewer");
		// Step 3 → 4
		fireEvent.click(screen.getByRole("button", { name: /next/i }));
		// Step 4 → 5
		fireEvent.click(screen.getByRole("button", { name: /next/i }));
		// Step 5 → complete
		fireEvent.click(screen.getByRole("button", { name: /get started/i }));
		expect(onComplete).toHaveBeenCalledOnce();
	});

	it("shows 5 progress dots", () => {
		const { container } = render(<Onboarding {...defaultProps} />);
		const dots = container.querySelectorAll(".rounded-full.h-2.w-2");
		expect(dots).toHaveLength(5);
	});

	it("shows the load sample document button on step 2", () => {
		render(<Onboarding {...defaultProps} />);
		fireEvent.click(screen.getByRole("button", { name: /next/i }));
		expect(
			screen.getByRole("button", { name: /load sample document/i }),
		).toBeInTheDocument();
	});
});
