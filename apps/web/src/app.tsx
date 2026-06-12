import type { LyricLine, Song } from "@ccctw-music/core";
import type { MusicSource, SearchResult } from "@ccctw-music/core";
import { createMusicApiClient } from "@ccctw-music/api-client";
import { useQuery } from "@tanstack/react-query";
import {
  Clock3,
  Download,
  Heart,
  Home,
  Library,
  ListMusic,
  Loader2,
  Mic2,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Repeat2,
  Search,
  Shuffle,
  SkipBack,
  SkipForward,
  Trash2,
  Volume2,
} from "lucide-react";
import { useMemo, useRef, useState, type FormEvent, type SyntheticEvent } from "react";
import { Badge, Button, Card, Input, Slider } from "./components/ui";
import { resolveDirectPlayableUrl, searchDirectMusic } from "./lib/direct-music-search";
import { songKey, usePlayerStore } from "./stores/player-store";

const apiClient = createMusicApiClient({
  baseUrl: import.meta.env.PUBLIC_API_BASE_URL ?? "/api",
});

const SOURCES = ["migu", "netease", "qq"] as const;
const STUDIO_MIX_ID = "studio-mix";

function bestScore(result: SearchResult) {
  return result.songs[0]?.quality?.score ?? 0;
}

function isLikelyResolvable(song: Song) {
  return Boolean(song.playableUrl) || song.source === "netease";
}

function resultPlaybackPriority(result: SearchResult) {
  return result.songs.some(isLikelyResolvable) ? 100 : 0;
}

function songPlaybackPriority(song: Song) {
  return isLikelyResolvable(song) ? 100 : 0;
}

function coverCount(result: SearchResult) {
  return result.songs.filter((song) => song.coverUrl).length;
}

async function searchWithBrowserFirst(keyword: string) {
  const direct = await searchDirectMusic({ keyword, sources: [...SOURCES] });
  const directSources = new Set(direct.results.map((result) => result.source));
  const serverSources = SOURCES.filter((source) => {
    const directResult = direct.results.find((result) => result.source === source);
    const needsMetadataEnrichment = source === "netease" && directResult?.songs.some((song) => !song.coverUrl);
    return (
      direct.failedSources.includes(source) ||
      !directResult ||
      directResult.songs.length === 0 ||
      needsMetadataEnrichment
    );
  });

  if (serverSources.length === 0) {
    return direct.results;
  }

  const serverResults = await apiClient.search({ keyword, sources: serverSources as MusicSource[] }).catch(() => []);
  const serverBySource = new Map(serverResults.map((result) => [result.source, result]));
  const merged = direct.results
    .filter((result) => result.songs.length > 0)
    .map((result) => {
      const enriched = serverBySource.get(result.source);
      return enriched && coverCount(enriched) > coverCount(result) ? enriched : result;
    });
  merged.push(...serverResults.filter((result) => !directSources.has(result.source) && result.songs.length > 0));

  return merged.sort(
    (left, right) => resultPlaybackPriority(right) - resultPlaybackPriority(left) || bestScore(right) - bestScore(left),
  );
}

function sourceName(source?: string) {
  const names: Record<string, string> = {
    migu: "MiGu",
    netease: "NetEase",
    qq: "QQ",
  };
  return source ? (names[source] ?? source) : "Source";
}

function songQuality(song?: Song) {
  return (
    song?.quality ?? {
      sourceLabel: sourceName(song?.source),
      official: Boolean(song?.source && SOURCES.includes(song.source as (typeof SOURCES)[number])),
      free: Boolean(song?.playableUrl),
      playable: Boolean(song?.playableUrl),
      quality: "unknown" as const,
      score: 0,
      badges: [sourceName(song?.source)],
    }
  );
}

function artists(song?: Song) {
  return song?.artists.map((artist) => artist.name).join(" / ") || "选择一首歌";
}

function formatTime(seconds = 0) {
  const safe = Number.isFinite(seconds) ? seconds : 0;
  const minute = Math.floor(safe / 60);
  const second = Math.floor(safe % 60);
  return `${minute}:${String(second).padStart(2, "0")}`;
}

function coverProps(size: number) {
  return {
    alt: "",
    role: "presentation" as const,
    width: size,
    height: size,
  };
}

function escapeSvgText(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&apos;",
    };
    return entities[char];
  });
}

function fallbackCoverUrl(song?: Song, size = 512) {
  const title = song?.name?.trim() || "CCCTW";
  const artist = escapeSvgText(artists(song));
  const initials = escapeSvgText(Array.from(title).slice(0, 2).join(""));
  const hue = Array.from(`${song?.source ?? ""}:${song?.id ?? title}`).reduce(
    (total, char) => total + char.charCodeAt(0),
    0,
  );
  const primary = `hsl(${hue % 360} 92% 54%)`;
  const secondary = `hsl(${(hue + 46) % 360} 88% 38%)`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
<defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="${primary}"/><stop offset="1" stop-color="${secondary}"/></linearGradient></defs>
<rect width="100%" height="100%" fill="url(#g)"/>
<circle cx="${size * 0.7}" cy="${size * 0.28}" r="${size * 0.28}" fill="rgba(255,255,255,0.18)"/>
<circle cx="${size * 0.25}" cy="${size * 0.78}" r="${size * 0.22}" fill="rgba(2,6,23,0.18)"/>
<text x="50%" y="48%" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="Inter,Arial,sans-serif" font-size="${size * 0.24}" font-weight="800">${initials}</text>
<text x="50%" y="69%" dominant-baseline="middle" text-anchor="middle" fill="rgba(255,255,255,0.76)" font-family="Inter,Arial,sans-serif" font-size="${size * 0.06}" font-weight="600">${artist}</text>
</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function coverImageProps(song: Song | undefined, size: number) {
  const fallback = fallbackCoverUrl(song, size);
  return {
    ...coverProps(size),
    src: song?.coverUrl || fallback,
    onError: (event: SyntheticEvent<HTMLImageElement>) => {
      if (event.currentTarget.src !== fallback) {
        event.currentTarget.src = fallback;
      }
    },
  };
}

function playbackErrorMessage(error: unknown) {
  if (error instanceof Error && "status" in error && error.message) {
    return error.message;
  }

  return "播放加载失败，可能是音源失效或网络不可用。";
}

function activeLyricId(lines: LyricLine[], currentTime: number) {
  let active = lines.find((line) => line.timeStamp !== undefined)?.id;
  for (const line of lines) {
    if (line.timeStamp === undefined) {
      continue;
    }
    if (line.timeStamp <= currentTime) {
      active = line.id;
    }
  }
  return active;
}

export function App() {
  const [keyword, setKeyword] = useState("周杰伦");
  const [submittedKeyword, setSubmittedKeyword] = useState("周杰伦");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [loadingSongId, setLoadingSongId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const {
    current,
    queue,
    recentlyPlayed,
    favorites,
    playlists,
    isPlaying,
    duration,
    currentTime,
    volume,
    play,
    pause,
    loadQueue,
    removeFromQueue,
    playNext,
    playPrevious,
    toggleFavorite,
    isFavorite,
    addToPlaylist,
    setProgress,
    setVolume,
  } = usePlayerStore();

  const searchQuery = useQuery({
    queryKey: ["search", submittedKeyword],
    queryFn: () => searchWithBrowserFirst(submittedKeyword),
    enabled: submittedKeyword.trim().length > 0,
  });

  const songs = useMemo(
    () =>
      [...(searchQuery.data?.flatMap((result) => result.songs) ?? [])].sort(
        (left, right) =>
          songPlaybackPriority(right) - songPlaybackPriority(left) ||
          (right.quality?.score ?? 0) - (left.quality?.score ?? 0),
      ),
    [searchQuery.data],
  );
  const featuredSongs = useMemo(() => songs.slice(0, 6), [songs]);
  const currentArtists = artists(current);
  const currentKey = current ? songKey(current) : undefined;
  const currentPlaylist = playlists.find((playlist) => playlist.id === STUDIO_MIX_ID);

  const lyricQuery = useQuery({
    queryKey: ["lyric", current?.source, current?.id],
    queryFn: () => apiClient.lyric(current!.source, current!.id),
    enabled: Boolean(current && !current.lyric),
    retry: false,
  });

  const lyric = current?.lyric ?? lyricQuery.data;
  const lyricLines = lyric?.lines ?? [];
  const activeLine = activeLyricId(lyricLines, currentTime);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittedKeyword(keyword.trim());
  }

  async function loadAndPlay(url: string) {
    if (!audioRef.current) {
      return;
    }
    setAudioUrl(url);
    audioRef.current.src = url;
    await audioRef.current.play();
  }

  async function startSong(song: Song, nextQueue = songs.length ? songs : [song]) {
    const fallbackQueue = [song, ...nextQueue.filter((candidate) => songKey(candidate) !== songKey(song))];
    setPlaybackError(null);
    setLoadingSongId(songKey(song));

    try {
      let playableSong = song;
      let playableUrl: string | null = null;
      for (const candidate of fallbackQueue.slice(0, 8)) {
        setLoadingSongId(songKey(candidate));
        playableSong = candidate;

        if (candidate.playableUrl) {
          try {
            loadQueue(nextQueue, playableSong);
            await loadAndPlay(candidate.playableUrl);
            playableUrl = candidate.playableUrl;
            break;
          } catch {
            playableUrl = null;
          }
        }

        if (!playableUrl) {
          const directPlayableUrl = await resolveDirectPlayableUrl(candidate).catch(() => null);
          if (directPlayableUrl) {
            try {
              loadQueue(nextQueue, playableSong);
              await loadAndPlay(directPlayableUrl);
              playableUrl = directPlayableUrl;
              break;
            } catch {
              playableUrl = null;
            }
          }
        }

        if (!playableUrl) {
          const cloudflarePlayable = await apiClient.playableUrl(candidate.source, candidate.id).catch(() => null);
          playableUrl = cloudflarePlayable?.url ?? null;
        }

        if (!playableUrl) {
          continue;
        }

        try {
          loadQueue(nextQueue, playableSong);
          await loadAndPlay(playableUrl);
          break;
        } catch {
          playableUrl = null;
        }
      }

      if (!playableUrl) {
        pause();
        setAudioUrl(null);
        setPlaybackError("当前搜索结果暂时没有可播放音源，已尝试前端直连和服务端兜底。");
        return;
      }

      play();
    } catch (error) {
      pause();
      setPlaybackError(playbackErrorMessage(error));
    } finally {
      setLoadingSongId(null);
    }
  }

  async function handleTogglePlayback() {
    if (!current || !audioRef.current) {
      return;
    }

    setPlaybackError(null);
    if (isPlaying) {
      audioRef.current.pause();
      pause();
      return;
    }

    if (!audioRef.current.src && !audioUrl) {
      await startSong(current, queue.length ? queue : [current]);
      return;
    }

    try {
      await audioRef.current.play();
      play();
    } catch {
      pause();
      setPlaybackError("播放器启动失败，请重新选择歌曲。");
    }
  }

  async function handleSkip(direction: "next" | "previous") {
    if (direction === "next") {
      playNext();
    } else {
      playPrevious();
    }
    const selected = usePlayerStore.getState().current;
    if (selected) {
      await startSong(selected, usePlayerStore.getState().queue);
    }
  }

  function handleAudioTimeUpdate() {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    setProgress(audio.currentTime, audio.duration || duration);
  }

  function handleVolume(value: number) {
    setVolume(value);
    if (audioRef.current) {
      audioRef.current.volume = value;
    }
  }

  function handleSeek(value: number) {
    if (!duration || !audioRef.current) {
      return;
    }
    const nextTime = Math.min(duration, Math.max(0, value));
    audioRef.current.currentTime = nextTime;
    setProgress(nextTime, duration);
  }

  function renderSongActions(song: Song) {
    const favorite = isFavorite(song);
    return (
      <span className="song-actions">
        <Button
          className={favorite ? "icon-action active" : "icon-action"}
          variant="icon"
          shadcnName={`favorite-${songKey(song)}`}
          type="button"
          aria-label={`${favorite ? "取消收藏" : "收藏"} ${song.name}`}
          onClick={(event) => {
            event.stopPropagation();
            toggleFavorite(song);
          }}
        >
          <Heart size={15} />
        </Button>
        <Button
          className="icon-action"
          variant="icon"
          shadcnName={`studio-mix-${songKey(song)}`}
          type="button"
          aria-label={`加入 Studio Mix ${song.name}`}
          onClick={(event) => {
            event.stopPropagation();
            addToPlaylist(STUDIO_MIX_ID, song);
          }}
        >
          <Plus size={15} />
        </Button>
      </span>
    );
  }

  function renderQualityBadges(song: Song) {
    const quality = songQuality(song);
    return (
      <span className="quality-badges" aria-label={`${song.name} 来源与音质`}>
        {quality.badges.slice(0, 3).map((badge) => (
          <span key={`${songKey(song)}-${badge}`}>{badge}</span>
        ))}
      </span>
    );
  }

  const displaySong = current ?? featuredSongs[0];
  const progressPercent = duration ? Math.min(100, (currentTime / duration) * 100) : isPlaying ? 12 : 0;
  const progressValue = duration ? Math.min(currentTime, duration) : 0;
  const heroSong = displaySong;

  return (
    <main className="music-app" data-testid="ui-style-root">
      <div className="aurora aurora-a" />
      <div className="aurora aurora-b" />

      <audio
        ref={audioRef}
        data-testid="audio-player"
        src={audioUrl ?? undefined}
        onTimeUpdate={handleAudioTimeUpdate}
        onLoadedMetadata={handleAudioTimeUpdate}
        onEnded={() => {
          pause();
          void handleSkip("next");
        }}
        onError={() => {
          if (audioUrl) {
            pause();
            setPlaybackError("音频资源无法读取，已停止播放。");
          }
        }}
      >
        <track kind="captions" />
      </audio>

      <aside className="side-rail" aria-label="主导航">
        <a className="brand-mark" href="/" aria-label="CCCTW Music 首页">
          <img src="/brand/ccctw-music-mark.svg" alt="" aria-hidden="true" />
          <strong>CCCTW Music</strong>
        </a>
        <nav className="rail-nav" aria-label="音乐导航">
          <a className="active" href="#discover" aria-label="发现音乐">
            <Home size={18} />
            <span>推荐</span>
          </a>
          <a href="#library" aria-label="音乐库">
            <Library size={18} />
            <span>我的音乐</span>
          </a>
          <a href="#queue" aria-label="播放队列">
            <ListMusic size={18} />
            <span>播放列表</span>
          </a>
          <a href="#favorites" aria-label="收藏">
            <Heart size={18} />
            <span>收藏</span>
          </a>
        </nav>
        <section className="sidebar-section" aria-label="我的">
          <span>我的</span>
          <a className="sidebar-pill active" href="#favorites">
            <Heart size={15} />
            <strong>我喜欢的音乐</strong>
            <small>{favorites.length}</small>
          </a>
          <a className="sidebar-pill" href="#library">
            <Clock3 size={15} />
            <strong>最近播放</strong>
            <small>{recentlyPlayed.length}</small>
          </a>
        </section>
      </aside>

      <section className="studio-shell">
        <header className="top-bar">
          <div>
            <span className="brand-text">CCCTW Music</span>
            <h1>今天想听什么？</h1>
            <p>搜索、收藏、排队、跟唱，把每一次播放组织成你的午夜音乐工作台。</p>
          </div>
          <form className="search-box" role="search" aria-label="音乐搜索" onSubmit={handleSubmit}>
            <Search size={18} />
            <Input
              shadcnName="music-search"
              type="search"
              name="keyword"
              autoComplete="off"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索歌曲、歌手或专辑…"
              aria-label="搜索歌曲、歌手或专辑"
            />
            <Button
              variant="primary"
              shadcnName="search-submit"
              type="submit"
              disabled={searchQuery.isFetching}
              aria-live="polite"
            >
              {searchQuery.isFetching ? (
                <>
                  <Loader2 size={15} className="spin" />
                  搜索中…
                </>
              ) : (
                "搜索"
              )}
            </Button>
          </form>
        </header>

        <section className="listen-layout">
          <div className="main-stack">
            <Card
              className={isPlaying ? "now-card playing" : "now-card"}
              shadcnName="now-playing"
              id="discover"
              aria-label="Now Playing"
            >
              <div className="cover-orbit">
                <img {...coverImageProps(displaySong, 270)} />
              </div>
              <div className="now-copy">
                <span className="section-kicker">Now Playing</span>
                <h1>我喜欢的音乐</h1>
                <h2>{heroSong?.name ?? "从搜索结果里选择一首歌"}</h2>
                <p>
                  {heroSong
                    ? `${artists(heroSong)} · ${songQuality(heroSong).sourceLabel} · ${songQuality(heroSong).badges.slice(0, 2).join(" / ")}`
                    : "搜索歌曲或歌手，点击结果后会直接请求音源并启动播放器。"}
                </p>
                {playbackError ? <strong className="playback-error">{playbackError}</strong> : null}
                <div className="quick-actions">
                  <Button
                    className="primary-play"
                    variant="primary"
                    shadcnName="primary-play"
                    type="button"
                    onClick={handleTogglePlayback}
                    disabled={!current || Boolean(loadingSongId)}
                  >
                    {loadingSongId ? (
                      <Loader2 size={18} className="spin" />
                    ) : isPlaying ? (
                      <Pause size={18} />
                    ) : (
                      <Play size={18} />
                    )}
                    {loadingSongId ? "加载中…" : isPlaying ? "暂停" : "播放"}
                  </Button>
                  {current ? renderSongActions(current) : null}
                  <Button className="secondary-action" variant="ghost" shadcnName="download" type="button">
                    <Download size={16} />
                    下载
                  </Button>
                  <span>
                    {current ? songQuality(current).badges.slice(0, 2).join(" / ") : `${songs.length} 首结果`}
                  </span>
                </div>
              </div>
              <div className="wave-stack" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
            </Card>

            <Card className="result-panel" shadcnName="search-results" aria-label="Search">
              <div className="panel-header">
                <div>
                  <span className="section-kicker">Search</span>
                  <h2>搜索结果</h2>
                </div>
                <span>{searchQuery.isFetching ? "同步中…" : `${songs.length} 首`}</span>
              </div>
              {searchQuery.isError ? <strong className="playback-error">搜索暂时不可用，请稍后再试。</strong> : null}

              <div className="song-table-head" role="row">
                <span>#</span>
                <span>标题</span>
                <span>专辑</span>
                <span>喜欢</span>
                <span>时长</span>
              </div>
              <div className="song-list" role="table" aria-label="歌曲列表">
                {songs.map((song, index) => {
                  const key = songKey(song);
                  const selected = currentKey === key;

                  return (
                    <div
                      className={`song-row${selected ? " active" : ""}`}
                      key={key}
                      role="row"
                      aria-label={`${song.name} ${artists(song)}`}
                    >
                      <Button
                        className="song-main-action"
                        variant="row"
                        shadcnName={`play-${key}`}
                        type="button"
                        onClick={() => void startSong(song, songs)}
                      >
                        <span className="song-index">{String(index + 1).padStart(2, "0")}</span>
                        <span className="song-cover-wrap">
                          <img loading="lazy" {...coverImageProps(song, 40)} />
                        </span>
                        <span className="song-meta">
                          <strong>{song.name}</strong>
                          <small>
                            {artists(song)} · {songQuality(song).sourceLabel}
                          </small>
                          {renderQualityBadges(song)}
                        </span>
                        <span className="row-play-icon" aria-hidden="true">
                          {loadingSongId === key ? <Loader2 size={16} className="spin" /> : <Play size={16} />}
                        </span>
                        <span className="sr-only">播放 {song.name}</span>
                      </Button>
                      <span className="song-album">{song.album?.name ?? "未知专辑"}</span>
                      {renderSongActions(song)}
                      <span className="song-duration">{formatTime(song.duration)}</span>
                    </div>
                  );
                })}
                {!searchQuery.isFetching && songs.length === 0 ? (
                  <div className="empty-state">
                    <Search size={26} />
                    <strong>没找到结果</strong>
                    <p>换个歌名、歌手或专辑再试一次。</p>
                  </div>
                ) : null}
              </div>
            </Card>
          </div>

          <aside className="right-stack">
            <Card className="player-panel" shadcnName="player" aria-label="Player">
              <div className="player-cover">
                <img className="cover" {...coverImageProps(displaySong, 420)} />
                <span className={isPlaying ? "pulse-dot active" : "pulse-dot"} />
              </div>
              <span className="section-kicker">{songQuality(current).sourceLabel}</span>
              <h2>{current?.name ?? "未播放"}</h2>
              <p>{currentArtists}</p>
              <div className="progress-control">
                <Slider
                  className="progress-slider"
                  shadcnName="player-progress"
                  aria-label={`播放进度 ${formatTime(currentTime)} / ${formatTime(duration)}`}
                  min="0"
                  max={duration || 0}
                  step="1"
                  value={progressValue}
                  disabled={!current || !duration}
                  onChange={(event) => handleSeek(Number(event.currentTarget.value))}
                />
                <div className="progress-shell" aria-hidden="true">
                  <span style={{ width: `${duration ? Math.min(100, (currentTime / duration) * 100) : 0}%` }} />
                </div>
              </div>
              <div className="transport">
                <Button
                  variant="icon"
                  shadcnName="previous"
                  type="button"
                  aria-label="上一首"
                  disabled={!current}
                  onClick={() => void handleSkip("previous")}
                >
                  <SkipBack size={18} />
                </Button>
                <Button
                  className="play-button"
                  variant="primary"
                  shadcnName="player-play"
                  type="button"
                  onClick={handleTogglePlayback}
                  disabled={!current || Boolean(loadingSongId)}
                >
                  {loadingSongId ? (
                    <Loader2 size={20} className="spin" />
                  ) : isPlaying ? (
                    <Pause size={20} />
                  ) : (
                    <Play size={20} />
                  )}
                  <span>{loadingSongId ? "加载中…" : isPlaying ? "暂停" : "播放"}</span>
                </Button>
                <Button
                  variant="icon"
                  shadcnName="next"
                  type="button"
                  aria-label="下一首"
                  disabled={!current}
                  onClick={() => void handleSkip("next")}
                >
                  <SkipForward size={18} />
                </Button>
              </div>
              <label className="volume-line">
                <Volume2 size={16} />
                <Slider
                  shadcnName="volume"
                  aria-label="音量"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={(event) => handleVolume(Number(event.currentTarget.value))}
                />
              </label>
            </Card>

            <Card className="library-panel" shadcnName="library" id="library" aria-label="Library">
              <div className="panel-header compact">
                <h2>Library</h2>
                <span>{recentlyPlayed.length} 最近播放</span>
              </div>
              <div className="stat-grid">
                <Badge shadcnName="favorites-count">
                  <strong>{favorites.length}</strong> Favorites
                </Badge>
                <Badge shadcnName="playlists-count">
                  <strong>{playlists.length}</strong> Playlists
                </Badge>
                <Badge shadcnName="queue-count">
                  <strong>{queue.length}</strong> Queue
                </Badge>
              </div>
              <div className="mini-list">
                {recentlyPlayed.slice(0, 3).map((song) => (
                  <Button
                    key={`recent-${songKey(song)}`}
                    variant="ghost"
                    shadcnName={`recent-${songKey(song)}`}
                    type="button"
                    onClick={() => void startSong(song, queue.length ? queue : [song])}
                  >
                    {song.name}
                  </Button>
                ))}
                {recentlyPlayed.length === 0 ? <p>播放过的歌曲会停靠在这里。</p> : null}
              </div>
            </Card>

            <Card className="queue-panel" shadcnName="queue" id="queue" aria-label="Queue">
              <div className="panel-header compact">
                <h2>Queue</h2>
                <span>{queue.length} 首</span>
              </div>
              <ol className="queue-list">
                {queue.map((song) => (
                  <li className={currentKey === songKey(song) ? "active" : ""} key={`queue-${songKey(song)}`}>
                    <Button
                      variant="ghost"
                      shadcnName={`queue-play-${songKey(song)}`}
                      type="button"
                      onClick={() => void startSong(song, queue)}
                    >
                      <strong>{song.name}</strong>
                      <small>{artists(song)}</small>
                    </Button>
                    <Button
                      variant="icon"
                      shadcnName={`queue-remove-${songKey(song)}`}
                      type="button"
                      aria-label={`移出队列 ${song.name}`}
                      disabled={currentKey === songKey(song)}
                      onClick={() => removeFromQueue(songKey(song))}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </li>
                ))}
              </ol>
            </Card>

            <Card className="favorites-panel" shadcnName="favorites" id="favorites" aria-label="Favorites">
              <div className="panel-header compact">
                <h2>Favorites</h2>
                <span>{favorites.length} 首</span>
              </div>
              <div className="mini-list">
                {favorites.map((song) => (
                  <Button
                    key={`fav-${songKey(song)}`}
                    variant="ghost"
                    shadcnName={`favorite-play-${songKey(song)}`}
                    type="button"
                    onClick={() => void startSong(song, favorites)}
                  >
                    {song.name}
                  </Button>
                ))}
                {favorites.length === 0 ? <p>点击爱心收藏你的第一首歌。</p> : null}
              </div>
            </Card>

            <Card className="playlist-panel" shadcnName="studio-mix" aria-label="Studio Mix">
              <div className="panel-header compact">
                <h2>Studio Mix</h2>
                <span>{currentPlaylist?.songs.length ?? 0} 首</span>
              </div>
              <div className="mini-list">
                {currentPlaylist?.songs.map((song) => (
                  <Button
                    key={`mix-${songKey(song)}`}
                    variant="ghost"
                    shadcnName={`mix-play-${songKey(song)}`}
                    type="button"
                    onClick={() => void startSong(song, currentPlaylist.songs)}
                  >
                    {song.name}
                  </Button>
                )) ?? <p>把歌曲加入 Studio Mix，建立你的第一张歌单。</p>}
              </div>
            </Card>

            <Card className="lyrics-panel" shadcnName="lyrics" aria-label="Lyrics">
              <div className="panel-header compact">
                <h2>Lyrics</h2>
                <span>
                  {lyricQuery.isFetching ? "同步中…" : lyricLines.length ? `${lyricLines.length} 行` : "待播放"}
                </span>
              </div>
              {lyricQuery.isError ? <strong className="playback-error">歌词暂时加载失败。</strong> : null}
              <ol className="lyric-list">
                {lyricLines.map((line) => (
                  <li className={line.id === activeLine ? "active" : ""} key={line.id}>
                    {line.sentence || "♪"}
                  </li>
                ))}
              </ol>
              {!lyricQuery.isFetching && !lyricQuery.isError && lyricLines.length === 0 ? (
                <p>暂无歌词，先选择一首歌。</p>
              ) : null}
            </Card>
          </aside>
        </section>
      </section>

      <Card as="footer" className="mini-player" shadcnName="mini-player" aria-label="底部播放器">
        <div className="bar-song">
          <img {...coverImageProps(displaySong, 56)} />
          <div>
            <strong>{current?.name ?? "选择歌曲"}</strong>
            <span>{currentArtists}</span>
          </div>
          <Button
            className={current && isFavorite(current) ? "bar-like active" : "bar-like"}
            type="button"
            variant="icon"
            shadcnName="mini-like"
            aria-label={current ? `${isFavorite(current) ? "取消收藏" : "收藏"} ${current.name}` : "收藏当前歌曲"}
            disabled={!current}
            onClick={() => current && toggleFavorite(current)}
          >
            <Heart size={18} />
          </Button>
        </div>
        <div className="bar-center">
          <div className="bar-controls">
            <Shuffle size={17} />
            <Button
              variant="icon"
              shadcnName="mini-prev"
              type="button"
              aria-label="底部切上一曲"
              disabled={!current}
              onClick={() => void handleSkip("previous")}
            >
              <SkipBack size={20} />
            </Button>
            <Button
              className="mini-play-round"
              type="button"
              variant="primary"
              shadcnName="mini-player-play"
              aria-label={`迷你播放器${isPlaying ? "暂停" : "播放"}`}
              onClick={handleTogglePlayback}
              disabled={!current || Boolean(loadingSongId)}
            >
              {isPlaying ? <Pause size={19} /> : <Play size={19} />}
            </Button>
            <Button
              variant="icon"
              shadcnName="mini-next"
              type="button"
              aria-label="底部切下一曲"
              disabled={!current}
              onClick={() => void handleSkip("next")}
            >
              <SkipForward size={20} />
            </Button>
            <Repeat2 size={17} />
          </div>
          <div className="bar-progress">
            <span>{formatTime(currentTime)}</span>
            <div className="progress-control">
              <Slider
                className="progress-slider"
                shadcnName="mini-progress"
                aria-label={`底部播放进度 ${formatTime(currentTime)} / ${formatTime(duration)}`}
                min="0"
                max={duration || 0}
                step="1"
                value={progressValue}
                disabled={!current || !duration}
                onChange={(event) => handleSeek(Number(event.currentTarget.value))}
              />
              <div className="progress-shell" aria-hidden="true">
                <span style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
        <div className="bar-tools">
          <Mic2 size={18} />
          <ListMusic size={18} />
          <Volume2 size={18} />
          <MoreHorizontal size={18} />
        </div>
      </Card>
    </main>
  );
}
