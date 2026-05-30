import { useCallback, useEffect, useState } from 'react';
import { useLocalStorage } from './useLocalStorage.js';
import { supabase } from '../lib/supabase.js';
import { rowToSession, sessionToRow } from '../lib/mappers.js';
import { makeSampleSessions } from '../utils/sampleData.js';
import { STORAGE_KEY, DEFAULT_SETTINGS, DEFAULT_BANKROLL } from '../constants.js';

// Guest/local starting state: sample data + a starter bankroll.
export function localInitialState() {
  return {
    sessions: makeSampleSessions(),
    bankroll: { ...DEFAULT_BANKROLL, current: 5000 },
    settings: { ...DEFAULT_SETTINGS },
    isSample: true,
  };
}

/**
 * One persistence API for the whole app. When a Supabase user is present the
 * data lives in Postgres (synced across devices); otherwise it lives in
 * localStorage (guest mode). The exposed shape is identical in both modes, so
 * App.jsx and every tab are storage-agnostic.
 */
export function useStore(user, { onError } = {}) {
  const cloud = Boolean(supabase && user);

  // Local cache is always available (guest mode + offline fallback).
  const [local, setLocal] = useLocalStorage(STORAGE_KEY, localInitialState);

  // Cloud-backed state.
  const [cSessions, setCSessions] = useState([]);
  const [cBankroll, setCBankroll] = useState({ ...DEFAULT_BANKROLL });
  const [cSettings, setCSettings] = useState({ ...DEFAULT_SETTINGS });
  const [loading, setLoading] = useState(false);

  const fail = useCallback(
    (error, msg) => {
      if (error) {
        // eslint-disable-next-line no-console
        console.error('[store]', msg, error);
        onError?.(msg || error.message);
        return true;
      }
      return false;
    },
    [onError]
  );

  // Load cloud data whenever the signed-in user changes.
  useEffect(() => {
    if (!cloud) return;
    let active = true;
    setLoading(true);
    (async () => {
      const [{ data: rows, error: sErr }, { data: profile, error: pErr }] = await Promise.all([
        supabase.from('sessions').select('*').order('date', { ascending: true }),
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      ]);
      if (!active) return;
      if (!fail(sErr, 'Could not load sessions')) {
        setCSessions((rows || []).map(rowToSession));
      }
      if (!fail(pErr, 'Could not load profile')) {
        if (profile) {
          setCBankroll(profile.bankroll || { ...DEFAULT_BANKROLL });
          setCSettings({ ...DEFAULT_SETTINGS, ...(profile.settings || {}) });
        } else {
          // First sign-in: create the profile row.
          const init = {
            id: user.id,
            bankroll: { ...DEFAULT_BANKROLL },
            settings: { ...DEFAULT_SETTINGS },
          };
          const { error } = await supabase.from('profiles').upsert(init);
          fail(error, 'Could not create profile');
          setCBankroll(init.bankroll);
          setCSettings(init.settings);
        }
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloud, user?.id]);

  const addSession = useCallback(
    async (session) => {
      if (cloud) {
        setCSessions((prev) => [...prev, session]); // optimistic
        const { error } = await supabase.from('sessions').insert(sessionToRow(session, user.id));
        fail(error, 'Could not save session to the cloud');
      } else {
        setLocal((prev) =>
          prev.isSample
            ? { ...prev, sessions: [session], isSample: false }
            : { ...prev, sessions: [...prev.sessions, session] }
        );
      }
    },
    [cloud, user, setLocal, fail]
  );

  const updateSession = useCallback(
    async (session, isNew = false) => {
      if (cloud) {
        setCSessions((prev) =>
          isNew ? [...prev, session] : prev.map((s) => (s.id === session.id ? session : s))
        );
        const { error } = await supabase.from('sessions').upsert(sessionToRow(session, user.id));
        fail(error, 'Could not sync session');
      } else {
        setLocal((prev) => {
          const base = prev.isSample ? [] : prev.sessions;
          const next = isNew ? [...base, session] : base.map((s) => (s.id === session.id ? session : s));
          return { ...prev, sessions: next, isSample: false };
        });
      }
    },
    [cloud, user, setLocal, fail]
  );

  const deleteSession = useCallback(
    async (id) => {
      if (cloud) {
        setCSessions((prev) => prev.filter((s) => s.id !== id));
        const { error } = await supabase.from('sessions').delete().eq('id', id);
        fail(error, 'Could not delete session');
      } else {
        setLocal((prev) => ({
          ...prev,
          sessions: prev.sessions.filter((s) => s.id !== id),
          isSample: false,
        }));
      }
    },
    [cloud, setLocal, fail]
  );

  const setBankrollCurrent = useCallback(
    async (val) => {
      if (cloud) {
        const next = { ...cBankroll, current: val };
        setCBankroll(next);
        const { error } = await supabase.from('profiles').upsert({ id: user.id, bankroll: next });
        fail(error, 'Could not save bankroll');
      } else {
        setLocal((prev) => ({ ...prev, bankroll: { ...prev.bankroll, current: val } }));
      }
    },
    [cloud, cBankroll, user, setLocal, fail]
  );

  const updateSettings = useCallback(
    async (patch) => {
      if (cloud) {
        const next = { ...cSettings, ...patch };
        setCSettings(next);
        const { error } = await supabase.from('profiles').upsert({ id: user.id, settings: next });
        fail(error, 'Could not save settings');
      } else {
        setLocal((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));
      }
    },
    [cloud, cSettings, user, setLocal, fail]
  );

  // Guest-only: reload the sample dataset.
  const loadSamples = useCallback(() => {
    if (cloud) return;
    setLocal(localInitialState());
  }, [cloud, setLocal]);

  // Push the guest's local sessions up to their cloud account (one-time migration).
  const uploadLocalSessions = useCallback(async () => {
    if (!cloud) return 0;
    const localSessions = (local.isSample ? [] : local.sessions) || [];
    if (!localSessions.length) return 0;
    const rows = localSessions.map((s) => sessionToRow(s, user.id));
    const { error } = await supabase.from('sessions').upsert(rows);
    if (fail(error, 'Could not upload local sessions')) return 0;
    setCSessions((prev) => {
      const map = new Map(prev.map((s) => [s.id, s]));
      localSessions.forEach((s) => map.set(s.id, s));
      return [...map.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
    });
    return localSessions.length;
  }, [cloud, local, user, fail]);

  const state = cloud
    ? { sessions: cSessions, bankroll: cBankroll, settings: cSettings, isSample: false }
    : local;

  const localCount = local.isSample ? 0 : local.sessions?.length || 0;

  return {
    sessions: state.sessions,
    bankroll: state.bankroll,
    settings: state.settings,
    isSample: state.isSample,
    mode: cloud ? 'cloud' : 'local',
    loading,
    localSessionCount: localCount,
    addSession,
    updateSession,
    deleteSession,
    setBankrollCurrent,
    updateSettings,
    loadSamples,
    uploadLocalSessions,
  };
}
