"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { TrackMeta } from "@/lib/music-queries";
import { bumpPlayCount } from "@/lib/music-actions";

export type Repeat = "off" | "all" | "one";

/* ── Модель воспроизведения (очередь + порядок + курсор) ── */

type PB = {
  queue: TrackMeta[];
  /** Перестановка индексов очереди — порядок обхода (для перемешивания). */
  order: number[];
  /** Позиция в order; текущий индекс очереди = order[cursor]. */
  cursor: number;
  shuffle: boolean;
  repeat: Repeat;
};

type Action =
  | { type: "PLAY"; list: TrackMeta[]; start: number; shuffle?: boolean }
  | { type: "NEXT" }
  | { type: "PREV" }
  | { type: "JUMP"; index: number }
  | { type: "TOGGLE_SHUFFLE" }
  | { type: "CYCLE_REPEAT" }
  | { type: "REMOVE"; id: string }
  | { type: "CLEAR" }
  | { type: "RESTORE"; state: Partial<PB> };

const identity = (n: number) => Array.from({ length: n }, (_, i) => i);

function shuffleInPlace<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Порядок с треком `front` в самом начале, остальное — вперемешку. */
function shuffledFront(n: number, front: number): number[] {
  const rest = identity(n).filter((i) => i !== front);
  shuffleInPlace(rest);
  return [front, ...rest];
}

const INITIAL: PB = {
  queue: [],
  order: [],
  cursor: 0,
  shuffle: false,
  repeat: "off",
};

function reducer(s: PB, a: Action): PB {
  switch (a.type) {
    case "PLAY": {
      if (a.list.length === 0) return s;
      const start = Math.max(0, Math.min(a.start, a.list.length - 1));
      const shuffle = a.shuffle ?? s.shuffle;
      const order = shuffle
        ? shuffledFront(a.list.length, start)
        : identity(a.list.length);
      const cursor = shuffle ? 0 : start;
      return { ...s, shuffle, queue: a.list, order, cursor };
    }
    case "NEXT": {
      if (s.order.length === 0) return s;
      const atEnd = s.cursor + 1 >= s.order.length;
      const cursor = atEnd
        ? s.repeat === "all"
          ? 0
          : s.cursor
        : s.cursor + 1;
      return { ...s, cursor };
    }
    case "PREV": {
      if (s.order.length === 0) return s;
      const cursor =
        s.cursor - 1 < 0
          ? s.repeat === "all"
            ? s.order.length - 1
            : 0
          : s.cursor - 1;
      return { ...s, cursor };
    }
    case "JUMP": {
      const pos = s.order.indexOf(a.index);
      return pos >= 0 ? { ...s, cursor: pos } : s;
    }
    case "TOGGLE_SHUFFLE": {
      const shuffle = !s.shuffle;
      if (s.queue.length === 0) return { ...s, shuffle };
      const curQ = s.order[s.cursor] ?? 0;
      const order = shuffle
        ? shuffledFront(s.queue.length, curQ)
        : identity(s.queue.length);
      const cursor = shuffle ? 0 : curQ;
      return { ...s, shuffle, order, cursor };
    }
    case "CYCLE_REPEAT": {
      const map: Record<Repeat, Repeat> = { off: "all", all: "one", one: "off" };
      return { ...s, repeat: map[s.repeat] };
    }
    case "REMOVE": {
      const removeIdx = s.queue.findIndex((t) => t.id === a.id);
      if (removeIdx < 0) return s;
      const curQ = s.order[s.cursor] ?? 0;
      const newQueue = s.queue.filter((t) => t.id !== a.id);
      if (newQueue.length === 0)
        return { ...s, queue: [], order: [], cursor: 0 };
      const newCurQ =
        curQ === removeIdx
          ? Math.min(curQ, newQueue.length - 1)
          : curQ > removeIdx
            ? curQ - 1
            : curQ;
      const order = s.shuffle
        ? shuffledFront(newQueue.length, newCurQ)
        : identity(newQueue.length);
      const cursor = s.shuffle ? 0 : newCurQ;
      return { ...s, queue: newQueue, order, cursor };
    }
    case "CLEAR":
      return { ...s, queue: [], order: [], cursor: 0 };
    case "RESTORE":
      return { ...s, ...a.state };
    default:
      return s;
  }
}

/* ── Контекст ── */

interface PlayerValue {
  queue: TrackMeta[];
  current: TrackMeta | null;
  /** Индекс текущего трека в очереди (не в order). */
  currentIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: Repeat;
  expanded: boolean;
  loading: boolean;
  playTracks: (list: TrackMeta[], startIndex?: number) => void;
  playShuffled: (list: TrackMeta[]) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  jumpTo: (queueIndex: number) => void;
  seek: (t: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  setExpanded: (v: boolean) => void;
  clear: () => void;
  removeTrack: (id: string) => void;
  isCurrent: (id: string) => boolean;
}

const Ctx = createContext<PlayerValue | null>(null);

export function usePlayer(): PlayerValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePlayer использован вне PlayerProvider");
  return v;
}

const STORE_KEY = "parviz-player";

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [pb, dispatch] = useReducer(reducer, INITIAL);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [muted, setMuted] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  const current = useMemo(
    () => pb.queue[pb.order[pb.cursor]] ?? null,
    [pb.queue, pb.order, pb.cursor],
  );
  const currentIndex = pb.order[pb.cursor] ?? -1;

  // Свежие значения для императивных обработчиков (без устаревших замыканий).
  const pbRef = useRef(pb);
  const isPlayingRef = useRef(isPlaying);
  const currentRef = useRef(current);
  const wantPlayRef = useRef(false);
  const restoredTimeRef = useRef<number | null>(null);
  const countedRef = useRef<string | null>(null);

  useEffect(() => {
    pbRef.current = pb;
    isPlayingRef.current = isPlaying;
    currentRef.current = current;
  });

  /* ── Восстановление из localStorage (один раз) ── */
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw) as {
        volume?: number;
        muted?: boolean;
        shuffle?: boolean;
        repeat?: Repeat;
        queue?: TrackMeta[];
        order?: number[];
        cursor?: number;
        time?: number;
      };
      if (typeof s.volume === "number") setVolumeState(s.volume);
      if (typeof s.muted === "boolean") setMuted(s.muted);
      const rest: Partial<PB> = {};
      if (typeof s.shuffle === "boolean") rest.shuffle = s.shuffle;
      if (s.repeat) rest.repeat = s.repeat;
      if (Array.isArray(s.queue) && s.queue.length && Array.isArray(s.order)) {
        rest.queue = s.queue;
        rest.order = s.order;
        rest.cursor =
          typeof s.cursor === "number" &&
          s.cursor >= 0 &&
          s.cursor < s.order.length
            ? s.cursor
            : 0;
        restoredTimeRef.current = typeof s.time === "number" ? s.time : null;
      }
      if (Object.keys(rest).length) dispatch({ type: "RESTORE", state: rest });
    } catch {}
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  /* ── Сохранение состояния (кроме частых timeupdate) ── */
  const persist = useCallback(
    (time?: number) => {
      try {
        const s = pbRef.current;
        localStorage.setItem(
          STORE_KEY,
          JSON.stringify({
            volume,
            muted,
            shuffle: s.shuffle,
            repeat: s.repeat,
            queue: s.queue.slice(0, 500),
            order: s.order,
            cursor: s.cursor,
            time: time ?? audioRef.current?.currentTime ?? 0,
          }),
        );
      } catch {}
    },
    [volume, muted],
  );

  const persistRef = useRef(persist);
  useEffect(() => {
    persistRef.current = persist;
  }, [persist]);

  useEffect(() => {
    persist();
  }, [pb, volume, muted, persist]);

  /* ── Загрузка текущего трека при его смене ── */
  useEffect(() => {
    /* Сброс экрана и запуск воспроизведения — синхронизация с <audio>. */
    /* eslint-disable react-hooks/set-state-in-effect */
    const audio = audioRef.current;
    if (!audio) return;
    if (!current) {
      audio.removeAttribute("src");
      audio.load();
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      return;
    }
    const url = `/api/tracks/${current.id}/audio`;
    audio.src = url;
    audio.load();
    setDuration(current.duration ?? 0);
    setCurrentTime(0);
    countedRef.current = null;

    // Восстановление позиции после перезагрузки страницы.
    if (restoredTimeRef.current != null) {
      const t = restoredTimeRef.current;
      restoredTimeRef.current = null;
      const onCanPlay = () => {
        try {
          if (t > 0 && t < (audio.duration || Infinity)) audio.currentTime = t;
        } catch {}
        audio.removeEventListener("loadedmetadata", onCanPlay);
      };
      audio.addEventListener("loadedmetadata", onCanPlay);
    }

    if (wantPlayRef.current) {
      setLoading(true);
      audio.play().catch(() => setLoading(false));
    }
    /* eslint-enable react-hooks/set-state-in-effect */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  /* ── Громкость ── */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
    audio.muted = muted;
  }, [volume, muted]);

  /* ── Управление (стабильные ссылки для обработчиков/MediaSession) ── */
  const next = useCallback(() => {
    wantPlayRef.current = true;
    dispatch({ type: "NEXT" });
  }, []);

  const prev = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    wantPlayRef.current = true;
    dispatch({ type: "PREV" });
  }, []);

  const controlsRef = useRef({ next, prev });
  useEffect(() => {
    controlsRef.current = { next, prev };
  }, [next, prev]);

  /* ── Слушатели аудио (один раз) ── */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime = () => {
      setCurrentTime(audio.currentTime);
      // Засчитываем прослушивание после 60% трека (один раз на трек).
      const cur = currentRef.current;
      const dur = audio.duration;
      if (
        cur &&
        countedRef.current !== cur.id &&
        dur > 0 &&
        audio.currentTime / dur > 0.6
      ) {
        countedRef.current = cur.id;
        void bumpPlayCount(cur.id).catch(() => {});
      }
      if ("mediaSession" in navigator && dur > 0) {
        try {
          navigator.mediaSession.setPositionState({
            duration: dur,
            position: Math.min(audio.currentTime, dur),
            playbackRate: audio.playbackRate || 1,
          });
        } catch {}
      }
    };
    const onDuration = () => {
      if (Number.isFinite(audio.duration)) setDuration(audio.duration);
    };
    const onPlay = () => {
      setIsPlaying(true);
      setLoading(false);
      if ("mediaSession" in navigator)
        navigator.mediaSession.playbackState = "playing";
    };
    const onPause = () => {
      setIsPlaying(false);
      if ("mediaSession" in navigator)
        navigator.mediaSession.playbackState = "paused";
      persistRef.current(audio.currentTime);
    };
    const onWaiting = () => setLoading(true);
    const onPlaying = () => setLoading(false);
    const onEnded = () => {
      const s = pbRef.current;
      if (s.repeat === "one") {
        audio.currentTime = 0;
        audio.play().catch(() => {});
        return;
      }
      const atEnd = s.cursor + 1 >= s.order.length;
      if (atEnd && s.repeat !== "all") {
        setIsPlaying(false);
        setCurrentTime(0);
        return;
      }
      controlsRef.current.next();
    };
    const onError = () => {
      setLoading(false);
      // Битый/отсутствующий файл — пропускаем дальше, но не зацикливаемся.
      const s = pbRef.current;
      if (s.order.length > 1) controlsRef.current.next();
      else setIsPlaying(false);
    };

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("durationchange", onDuration);
    audio.addEventListener("loadedmetadata", onDuration);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("durationchange", onDuration);
      audio.removeEventListener("loadedmetadata", onDuration);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
    // Обработчики читают свежее состояние из ref-ов — вешаем один раз.
  }, []);

  /* ── Сохранять позицию при уходе со страницы ── */
  useEffect(() => {
    const onHide = () => persistRef.current(audioRef.current?.currentTime);
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, []);

  /* ── MediaSession: метаданные и кнопки блокировки экрана ── */
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    if (!current) {
      navigator.mediaSession.metadata = null;
      return;
    }
    const artwork = current.coverImageId
      ? [
          {
            src: `/api/images/${current.coverImageId}`,
            sizes: "512x512",
            type: "image/jpeg",
          },
        ]
      : [
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
        ];
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: current.title || "Без названия",
        artist: current.artist || "",
        album: current.album || "",
        artwork,
      });
    } catch {}
  }, [current]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    const set = (
      action: MediaSessionAction,
      handler: MediaSessionActionHandler | null,
    ) => {
      try {
        ms.setActionHandler(action, handler);
      } catch {}
    };
    set("play", () => audioRef.current?.play().catch(() => {}));
    set("pause", () => audioRef.current?.pause());
    set("previoustrack", () => controlsRef.current.prev());
    set("nexttrack", () => controlsRef.current.next());
    set("seekbackward", (d) => {
      const a = audioRef.current;
      if (a) a.currentTime = Math.max(0, a.currentTime - (d.seekOffset || 10));
    });
    set("seekforward", (d) => {
      const a = audioRef.current;
      if (a)
        a.currentTime = Math.min(
          a.duration || Infinity,
          a.currentTime + (d.seekOffset || 10),
        );
    });
    set("seekto", (d) => {
      const a = audioRef.current;
      if (a && typeof d.seekTime === "number") a.currentTime = d.seekTime;
    });
    return () => {
      (
        [
          "play",
          "pause",
          "previoustrack",
          "nexttrack",
          "seekbackward",
          "seekforward",
          "seekto",
        ] as MediaSessionAction[]
      ).forEach((x) => set(x, null));
    };
  }, []);

  /* ── Публичные методы ── */
  const playTracks = useCallback((list: TrackMeta[], startIndex = 0) => {
    if (!list.length) return;
    wantPlayRef.current = true;
    dispatch({ type: "PLAY", list, start: startIndex });
  }, []);

  const playShuffled = useCallback((list: TrackMeta[]) => {
    if (!list.length) return;
    wantPlayRef.current = true;
    dispatch({
      type: "PLAY",
      list,
      start: Math.floor(Math.random() * list.length),
      shuffle: true,
    });
  }, []);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentRef.current) return;
    if (audio.paused) {
      wantPlayRef.current = true;
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, []);

  const jumpTo = useCallback((queueIndex: number) => {
    wantPlayRef.current = true;
    dispatch({ type: "JUMP", index: queueIndex });
  }, []);

  const seek = useCallback((t: number) => {
    const audio = audioRef.current;
    if (audio && Number.isFinite(t)) {
      audio.currentTime = Math.max(0, t);
      setCurrentTime(audio.currentTime);
    }
  }, []);

  const setVolume = useCallback((v: number) => {
    const nv = Math.max(0, Math.min(1, v));
    setVolumeState(nv);
    if (nv > 0) setMuted(false);
  }, []);

  const toggleMute = useCallback(() => setMuted((m) => !m), []);
  const toggleShuffle = useCallback(() => dispatch({ type: "TOGGLE_SHUFFLE" }), []);
  const cycleRepeat = useCallback(() => dispatch({ type: "CYCLE_REPEAT" }), []);
  const clear = useCallback(() => {
    wantPlayRef.current = false;
    const a = audioRef.current;
    if (a) a.pause();
    dispatch({ type: "CLEAR" });
    setExpanded(false);
  }, []);
  const removeTrack = useCallback((id: string) => {
    wantPlayRef.current = isPlayingRef.current;
    dispatch({ type: "REMOVE", id });
  }, []);
  const isCurrent = useCallback(
    (id: string) => currentRef.current?.id === id,
    [],
  );

  const value = useMemo<PlayerValue>(
    () => ({
      queue: pb.queue,
      current,
      currentIndex,
      isPlaying,
      currentTime,
      duration,
      volume,
      muted,
      shuffle: pb.shuffle,
      repeat: pb.repeat,
      expanded,
      loading,
      playTracks,
      playShuffled,
      toggle,
      next,
      prev,
      jumpTo,
      seek,
      setVolume,
      toggleMute,
      toggleShuffle,
      cycleRepeat,
      setExpanded,
      clear,
      removeTrack,
      isCurrent,
    }),
    [
      pb.queue,
      pb.shuffle,
      pb.repeat,
      current,
      currentIndex,
      isPlaying,
      currentTime,
      duration,
      volume,
      muted,
      expanded,
      loading,
      playTracks,
      playShuffled,
      toggle,
      next,
      prev,
      jumpTo,
      seek,
      setVolume,
      toggleMute,
      toggleShuffle,
      cycleRepeat,
      clear,
      removeTrack,
      isCurrent,
    ],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      {/* Единственный аудио-элемент на всё приложение — переживает переходы. */}
      <audio ref={audioRef} preload="metadata" className="hidden" />
    </Ctx.Provider>
  );
}
