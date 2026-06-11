import type { LyricLine, Song } from "@ccctw-music/core";
import { createMusicApiClient } from "@ccctw-music/api-client";
import { useQuery } from "@tanstack/react-query";
import {
  Clock3,
  Compass,
  Disc3,
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
  Radio,
  Repeat2,
  Search,
  Shuffle,
  SkipBack,
  SkipForward,
  Trash2,
  Volume2,
} from "lucide-react";
import { useMemo, useRef, useState, type FormEvent } from "react";
import { Badge, Button, Card, Input, Slider } from "./components/ui";
import { songKey, usePlayerStore } from "./stores/player-store";

const apiClient = createMusicApiClient({
  baseUrl: import.meta.env.PUBLIC_API_BASE_URL ?? "/api",
});

const SOURCES = ["migu", "netease", "qq"] as const;
const BROWSE_LANES = ["新歌速递", "华语夜航", "城市电子", "复古浪漫"];
const STUDIO_MIX_ID = "studio-mix";

function sourceName(source?: string) {
  const names: Record<string, string> = {
    migu: "MiGu",
    netease: "NetEase",
    qq: "QQ",
  };
  return source ? (names[source] ?? source) : "Source";
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
    enqueue,
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
    queryFn: () => apiClient.search({ keyword: submittedKeyword, sources: [...SOURCES] }),
    enabled: submittedKeyword.trim().length > 0,
  });

  const songs = useMemo(() => searchQuery.data?.flatMap((result) => result.songs) ?? [], [searchQuery.data]);
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

  const browseLanes = useMemo(
    () =>
      BROWSE_LANES.map((name, index) => ({
        name,
        songs: songs.slice(index, index + 4).length ? songs.slice(index, index + 4) : featuredSongs,
      })),
    [featuredSongs, songs],
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittedKeyword(keyword.trim());
  }

  async function startSong(song: Song, nextQueue = songs.length ? songs : [song]) {
    const fallbackQueue = [song, ...nextQueue.filter((candidate) => songKey(candidate) !== songKey(song))];
    setPlaybackError(null);
    setLoadingSongId(songKey(song));

    try {
      let playableSong = song;
      let playable = { source: song.source, url: song.playableUrl ?? null };
      for (const candidate of fallbackQueue.slice(0, 8)) {
        setLoadingSongId(songKey(candidate));
        playableSong = candidate;
        playable = candidate.playableUrl
          ? { source: candidate.source, url: candidate.playableUrl }
          : await apiClient.playableUrl(candidate.source, candidate.id);
        if (playable.url) {
          break;
        }
      }

      if (!playable.url) {
        pause();
        setAudioUrl(null);
        setPlaybackError("当前搜索结果暂时没有可播放音源，换个关键词试试。");
        return;
      }

      loadQueue(nextQueue, playableSong);
      setAudioUrl(playable.url);
      if (audioRef.current) {
        audioRef.current.src = playable.url;
        await audioRef.current.play();
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

  const currentCover = current?.coverUrl || featuredSongs[0]?.coverUrl || "/favicon.svg";
  const progressPercent = duration ? Math.min(100, (currentTime / duration) * 100) : isPlaying ? 12 : 0;
  const heroSong = current ?? featuredSongs[0];

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
          <Disc3 size={21} />
          <strong>网易云音乐</strong>
        </a>
        <nav className="rail-nav" aria-label="音乐导航">
          <a className="active" href="#discover" aria-label="发现音乐">
            <Home size={18} />
            <span>推荐</span>
          </a>
          <a href="#featured" aria-label="精选音乐">
            <Compass size={18} />
            <span>精选</span>
          </a>
          <a href="#radio" aria-label="播客">
            <Radio size={18} />
            <span>播客</span>
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
                <img src={currentCover} {...coverProps(270)} />
              </div>
              <div className="now-copy">
                <span className="section-kicker">Now Playing</span>
                <h1>我喜欢的音乐</h1>
                <h2>{heroSong?.name ?? "从搜索结果里选择一首歌"}</h2>
                <p>
                  {heroSong
                    ? `${artists(heroSong)} · ${sourceName(heroSong.source)}`
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
                  <span>{current ? sourceName(current.source) : `${songs.length} 首结果`}</span>
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

            <section className="browse-panel" aria-label="Browse">
              {browseLanes.map((lane) => (
                <Card as="article" className="browse-lane" shadcnName={`browse-${lane.name}`} key={lane.name}>
                  <div className="panel-header compact">
                    <h2>{lane.name}</h2>
                    <span>{lane.songs.length || "待发现"}</span>
                  </div>
                  <div className="browse-cards">
                    {lane.songs.map((song) => (
                      <Button
                        key={`${lane.name}-${songKey(song)}`}
                        variant="ghost"
                        shadcnName={`browse-${lane.name}-${songKey(song)}`}
                        type="button"
                        onClick={() => void startSong(song, songs)}
                      >
                        <img src={song.coverUrl || "/favicon.svg"} loading="lazy" {...coverProps(220)} />
                        <strong>{song.name}</strong>
                        <small>{artists(song)}</small>
                      </Button>
                    ))}
                    {!searchQuery.isFetching && lane.songs.length === 0 ? (
                      <p>这一栏暂时安静，换个关键词唤醒它。</p>
                    ) : null}
                  </div>
                </Card>
              ))}
            </section>

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
                          <img src={song.coverUrl || "/favicon.svg"} loading="lazy" {...coverProps(40)} />
                        </span>
                        <span className="song-meta">
                          <strong>{song.name}</strong>
                          <small>
                            {artists(song)} · {sourceName(song.source)}
                          </small>
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
                <img className="cover" src={current?.coverUrl || currentCover} {...coverProps(420)} />
                <span className={isPlaying ? "pulse-dot active" : "pulse-dot"} />
              </div>
              <span className="section-kicker">{sourceName(current?.source)}</span>
              <h2>{current?.name ?? "未播放"}</h2>
              <p>{currentArtists}</p>
              <div className="progress-shell" aria-label={`${formatTime(currentTime)} / ${formatTime(duration)}`}>
                <span
                  style={{ width: `${duration ? Math.min(100, (currentTime / duration) * 100) : isPlaying ? 48 : 0}%` }}
                />
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
          <img src={current?.coverUrl || currentCover} {...coverProps(56)} />
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
            <div className="progress-shell">
              <span style={{ width: `${progressPercent}%` }} />
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
