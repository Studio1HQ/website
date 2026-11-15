/** The clients overview's two views, and the cookie that remembers each person's pick. */
export type ClientsView = "table" | "board";

export const CLIENTS_VIEW_COOKIE = "clients_view";

export const asClientsView = (value: unknown): ClientsView | null =>
  value === "table" || value === "board" ? value : null;
