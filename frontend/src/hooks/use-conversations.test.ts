import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Conversation } from "../types";
import { useConversations } from "./use-conversations";

// Mock the API module
vi.mock("../lib/api", () => ({
	fetchConversations: vi.fn(),
	createConversation: vi.fn(),
	deleteConversation: vi.fn(),
}));

import * as api from "../lib/api";

const mockFetch = vi.mocked(api.fetchConversations);
const mockDelete = vi.mocked(api.deleteConversation);

function makeConversation(id: string): Conversation {
	return {
		id,
		title: `Conversation ${id}`,
		created_at: "2026-03-29T00:00:00Z",
		updated_at: "2026-03-29T00:00:00Z",
		has_document: false,
	};
}

describe("useConversations", () => {
	beforeEach(() => {
		mockFetch.mockResolvedValue([
			makeConversation("a"),
			makeConversation("b"),
			makeConversation("c"),
		]);
		mockDelete.mockResolvedValue(undefined);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("loads conversations on mount", async () => {
		const { result } = renderHook(() => useConversations());

		await waitFor(() => expect(result.current.loading).toBe(false));
		expect(result.current.conversations).toHaveLength(3);
	});

	it("selects next conversation after deleting selected (middle)", async () => {
		const { result } = renderHook(() => useConversations());
		await waitFor(() => expect(result.current.loading).toBe(false));

		// Select "b" (middle)
		act(() => result.current.select("b"));
		expect(result.current.selectedId).toBe("b");

		// Delete "b" — should select "c" (same index position)
		await act(() => result.current.remove("b"));
		expect(result.current.selectedId).toBe("c");
		expect(result.current.conversations).toHaveLength(2);
	});

	it("selects previous conversation after deleting last in list", async () => {
		const { result } = renderHook(() => useConversations());
		await waitFor(() => expect(result.current.loading).toBe(false));

		// Select "c" (last)
		act(() => result.current.select("c"));

		// Delete "c" — should select "b" (now last)
		await act(() => result.current.remove("c"));
		expect(result.current.selectedId).toBe("b");
	});

	it("selects first conversation after deleting first", async () => {
		const { result } = renderHook(() => useConversations());
		await waitFor(() => expect(result.current.loading).toBe(false));

		act(() => result.current.select("a"));

		// Delete "a" — should select "b" (new first)
		await act(() => result.current.remove("a"));
		expect(result.current.selectedId).toBe("b");
	});

	it("sets null when deleting the only conversation", async () => {
		mockFetch.mockResolvedValue([makeConversation("only")]);
		const { result } = renderHook(() => useConversations());
		await waitFor(() => expect(result.current.loading).toBe(false));

		act(() => result.current.select("only"));
		await act(() => result.current.remove("only"));
		expect(result.current.selectedId).toBeNull();
		expect(result.current.conversations).toHaveLength(0);
	});

	it("does not change selection when deleting a non-selected conversation", async () => {
		const { result } = renderHook(() => useConversations());
		await waitFor(() => expect(result.current.loading).toBe(false));

		act(() => result.current.select("a"));

		// Delete "c" — selection should stay on "a"
		await act(() => result.current.remove("c"));
		expect(result.current.selectedId).toBe("a");
		expect(result.current.conversations).toHaveLength(2);
	});
});
