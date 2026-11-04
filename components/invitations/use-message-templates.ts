'use client';

import { useState, useEffect, useCallback } from 'react';

import {
  findMessageOption,
  DEFAULT_MESSAGE_ID,
  type MessageOption,
} from '@/lib/invitation-messages';

const BODIES_KEY = 'save-the-date-message-bodies';
const DEFAULT_KEY = 'save-the-date-default-message';

/** Edited texts are stored per message, with a separate entry for the plural version. */
const bodyKey = (id: string, plural: boolean) => (plural ? `${id}#plural` : id);

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Not persisted; the choice still applies for this session.
  }
}

/** Message texts and the default choice. Edits are kept in this browser only. */
export function useMessageTemplates() {
  const [bodies, setBodies] = useState<Record<string, string>>({});
  const [defaultId, setDefaultIdState] = useState(DEFAULT_MESSAGE_ID);

  useEffect(() => {
    setBodies(readJson<Record<string, string>>(BODIES_KEY, {}));
    try {
      const saved = localStorage.getItem(DEFAULT_KEY);
      if (saved) setDefaultIdState(findMessageOption(saved).id);
    } catch {
      // Keep the built-in default.
    }
  }, []);

  /** The message text to use: the edited one if there is one, otherwise the built-in. */
  const getOption = useCallback(
    (id: string, plural = false): MessageOption => {
      const option = findMessageOption(id);
      const original = plural ? option.bodyPlural : option.body;
      return { ...option, body: bodies[bodyKey(option.id, plural)] ?? original };
    },
    [bodies]
  );

  const save = (next: Record<string, string>) => {
    setBodies(next);
    write(BODIES_KEY, JSON.stringify(next));
  };

  const setBody = (id: string, plural: boolean, body: string) =>
    save({ ...bodies, [bodyKey(id, plural)]: body });

  const resetBody = (id: string, plural: boolean) => {
    const next = { ...bodies };
    delete next[bodyKey(id, plural)];
    save(next);
  };

  const setDefaultId = (id: string) => {
    setDefaultIdState(id);
    write(DEFAULT_KEY, id);
  };

  return {
    getOption,
    setBody,
    resetBody,
    defaultId,
    setDefaultId,
    isEdited: (id: string, plural: boolean) => bodyKey(id, plural) in bodies,
  };
}
