"use client";

import type { SyntheticEvent } from "react";
import {
  MouseSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DraggableSyntheticListeners,
} from "@dnd-kit/core";

/* Dragging cards on the Week calendar and the Board (dnd-kit): the card
   lifts and follows the pointer, and lands on its new day or column the
   moment it's dropped, before the save comes back. */

/**
 * Mouse: a drag starts after a few pixels, so a click still opens the card.
 * Touch: press and hold, so a swipe still scrolls the page.
 */
export function useCardSensors() {
  return useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
  );
}

/** The day or column under the pointer; in a gap between two, the one the card overlaps most. */
export const underPointer: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  return hits.length ? hits : rectIntersection(args);
};

/**
 * The card's drag listeners, minus presses that belong to something else:
 * a field, or a dialog opened from the card (it portals out of the card,
 * but React still bubbles its events through it).
 */
export function dragHandlers(listeners: DraggableSyntheticListeners) {
  if (!listeners) return {};
  return Object.fromEntries(
    Object.entries(listeners).map(([name, handler]) => [
      name,
      (event: SyntheticEvent<HTMLElement>) => {
        const target = event.target as Element;
        if (!event.currentTarget.contains(target)) return;
        if (target.closest("input, textarea, select, [role=combobox], [contenteditable=true]")) return;
        handler(event);
      },
    ]),
  );
}

/** What a screen reader hears while a card is dragged: its title and where it is, not ids. */
export function cardAnnouncements(
  title: (id: string | number) => string | undefined,
  place: (id: string | number) => string | undefined,
): Announcements {
  const name = (id: string | number) => title(id) ?? "Card";
  return {
    onDragStart: ({ active }) => `Picked up ${name(active.id)}.`,
    onDragOver: ({ active, over }) => (over ? `${name(active.id)} is over ${place(over.id) ?? over.id}.` : undefined),
    onDragEnd: ({ active, over }) =>
      over ? `${name(active.id)} dropped on ${place(over.id) ?? over.id}.` : `${name(active.id)} dropped. It stays where it was.`,
    onDragCancel: ({ active }) => `Moving ${name(active.id)} was cancelled.`,
  };
}
