import { create } from "zustand";

import type { IconName } from "@/components/ui";

/**
 * Imperative dialog API. Call these from anywhere (components, hooks, handlers);
 * <DialogHost /> in the root layout renders whatever is queued.
 */

export type DialogTone = "default" | "danger" | "success";

export interface DialogAction {
  label: string;
  value: string;
  style?: "primary" | "secondary" | "danger" | "ghost";
}

interface BaseRequest {
  id: number;
}

export interface MessageRequest extends BaseRequest {
  kind: "message";
  title: string;
  message?: string;
  icon?: IconName;
  tone: DialogTone;
  actions: DialogAction[];
  resolve: (value: string | null) => void;
}

export interface DateRequest extends BaseRequest {
  kind: "date";
  title: string;
  subtitle?: string;
  confirmLabel: string;
  /** Timestamp to start on (when editing an existing date). */
  initial: number | null;
  resolve: (value: number | null) => void;
}

export type DialogRequest = MessageRequest | DateRequest;

interface DialogState {
  queue: DialogRequest[];
  push: (request: DialogRequest) => void;
  /** Removes the request that is currently showing. */
  shift: () => void;
}

export const useDialogStore = create<DialogState>((set) => ({
  queue: [],
  push: (request) => set((s) => ({ queue: [...s.queue, request] })),
  shift: () => set((s) => ({ queue: s.queue.slice(1) })),
}));

let nextId = 1;

/** Generic message dialog. Resolves with the tapped action's `value`, or null if dismissed. */
export function showDialog(options: {
  title: string;
  message?: string;
  icon?: IconName;
  tone?: DialogTone;
  actions: DialogAction[];
}): Promise<string | null> {
  return new Promise((resolve) => {
    useDialogStore.getState().push({
      id: nextId++,
      kind: "message",
      title: options.title,
      message: options.message,
      icon: options.icon,
      tone: options.tone ?? "default",
      actions: options.actions,
      resolve,
    });
  });
}

/** Two-button confirmation. Resolves true only if the user confirms. */
export async function confirm(options: {
  title: string;
  message?: string;
  icon?: IconName;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}): Promise<boolean> {
  const value = await showDialog({
    title: options.title,
    message: options.message,
    icon:
      options.icon ??
      (options.destructive ? "trash-outline" : "help-circle-outline"),
    tone: options.destructive ? "danger" : "default",
    actions: [
      {
        label: options.cancelLabel ?? "Cancel",
        value: "cancel",
        style: "secondary",
      },
      {
        label: options.confirmLabel ?? "Confirm",
        value: "confirm",
        style: options.destructive ? "danger" : "primary",
      },
    ],
  });
  return value === "confirm";
}

/** Single-button notice (replacement for a plain Alert.alert). */
export async function notify(options: {
  title: string;
  message?: string;
  tone?: DialogTone;
  icon?: IconName;
  buttonLabel?: string;
}): Promise<void> {
  const tone = options.tone ?? "default";
  await showDialog({
    title: options.title,
    message: options.message,
    tone,
    icon:
      options.icon ??
      (tone === "danger"
        ? "alert-circle-outline"
        : tone === "success"
          ? "checkmark-circle-outline"
          : "information-circle-outline"),
    actions: [
      { label: options.buttonLabel ?? "OK", value: "ok", style: "primary" },
    ],
  });
}

/**
 * Themed date picker sheet for choosing when something was watched.
 * Resolves with a timestamp (ms), or null if cancelled.
 */
export function pickWatchedDate(
  options: {
    title?: string;
    subtitle?: string;
    confirmLabel?: string;
    initial?: number | null;
  } = {},
): Promise<number | null> {
  return new Promise((resolve) => {
    useDialogStore.getState().push({
      id: nextId++,
      kind: "date",
      title: options.title ?? "When did you watch it?",
      subtitle: options.subtitle,
      confirmLabel: options.confirmLabel ?? "Mark as watched",
      initial: options.initial ?? null,
      resolve,
    });
  });
}
