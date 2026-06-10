import { useQuery } from "@tanstack/react-query";
import {
  Disc3,
  Heart,
  ListMusic,
  Loader2,
  Pause,
  Play,
  Search,
  SkipBack,
  SkipForward,
  Volume2,
  Waves,
} from "lucide-react";
import { useMemo, useRef, useState, type FormEvent } from "react";
import type { Song } from "@ccctw-music/core";
import { createMusicApiClient } from "@ccctw-music/api-client";
import { usePlayerStore } from "./stores/player-store";

const apiClient = createMusicApiClient({
  baseUrl: import.meta.env.PUBLIC_API_BASE_URL ?? "/api",
});

export function App() {
  const [keyword, setKeyword] = useState("周杰伦");
  const [submittedKeyword, setSubmittedKeyword] = useState("周杰伦");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [loadingSongId, setLoadingSongId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { current, isPlaying, play, pause, setCurrent } = usePlayerStore();

  const searchQuery = useQuery({
    queryKey: ["search", submittedKeyword],
    queryFn: () => apiClient.search({ keyword: submittedKeyword, sources: ["migu", "netease", "qq"] }),
    enabled: submittedKeyword.trim().length > 0,
  });

  const songs = useMemo(() => searchQuery.data?.flatMap((result) => result.songs) ?? [], [searchQuery.data]);
  const featuredSongs = useMemo(() => songs.slice(0, 6), [songs]);
  const currentArtists = current?.artists.map((artist) => artist.name).join(" / ") || "选择一首歌";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittedKeyword(keyword.trim());
  }

  async function handleSelectSong(song: Song) {
    setCurrent(song);
    setPlaybackError(null);
    setLoadingSongId(`${song.source}:${song.id}`);

    try {
      const playable = song.playableUrl
        ? { source: song.source, url: song.playableUrl }
        : await apiClient.playableUrl(song.source, song.id);

      if (!playable.url) {
        pause();
        setAudioUrl(null);
        setPlaybackError("当前音源暂时无法播放，换一首试试。");
        return;
      }

      setAudioUrl(playable.url);
      if (audioRef.current) {
        audioRef.current.src = playable.url;
        await audioRef.current.play();
      }
      play();
    } catch {
      pause();
      setPlaybackError("播放加载失败，可能是音源失效或网络不可用。");
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
      await handleSelectSong(current);
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

  function sourceName(source?: string) {
    const names: Record<string, string> = {
      migu: "MiGu",
      netease: "NetEase",
      qq: "QQ",
    };
    return source ? (names[source] ?? source) : "Source";
  }

  return (
    <main className="music-app">
      <div className="aurora aurora-a" />
      <div className="aurora aurora-b" />

      <audio
        ref={audioRef}
        data-testid="audio-player"
        src={audioUrl ?? undefined}
        onEnded={pause}
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
          <Waves size={22} />
        </a>
        <nav className="rail-nav" aria-label="音乐导航">
          <a className="active" href="#discover" aria-label="发现音乐">
            <Disc3 size={19} />
          </a>
          <a href="#queue" aria-label="播放队列">
            <ListMusic size={19} />
          </a>
          <a href="#favorites" aria-label="收藏">
            <Heart size={19} />
          </a>
        </nav>
      </aside>

      <section className="studio-shell">
        <header className="top-bar">
          <div>
            <span className="brand-text">CCCTW Music</span>
            <h1>今天想听什么？</h1>
          </div>
          <form className="search-box" onSubmit={handleSubmit}>
            <Search size={18} />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索歌曲、歌手或专辑"
              aria-label="搜索歌曲、歌手或专辑"
            />
            <button type="submit" disabled={searchQuery.isFetching}>
              {searchQuery.isFetching ? "搜索中" : "搜索"}
            </button>
          </form>
        </header>

        <section className="listen-layout">
          <div className="main-stack">
            <section className="now-card" id="discover">
              <div className="cover-orbit">
                <img src={current?.coverUrl || featuredSongs[0]?.coverUrl || "/favicon.svg"} alt="" />
              </div>
              <div className="now-copy">
                <span className="section-kicker">Now Playing</span>
                <h2>{current?.name ?? featuredSongs[0]?.name ?? "从搜索结果里选择一首歌"}</h2>
                <p>{current ? currentArtists : "搜索歌曲或歌手，点击结果后会直接请求音源并启动播放器。"}</p>
                {playbackError ? <strong className="playback-error">{playbackError}</strong> : null}
                <div className="quick-actions">
                  <button
                    className="primary-play"
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
                    {loadingSongId ? "加载中" : isPlaying ? "暂停" : "播放"}
                  </button>
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
            </section>

            <section className="result-panel">
              <div className="panel-header">
                <div>
                  <span className="section-kicker">Search</span>
                  <h2>搜索结果</h2>
                </div>
                <span>{searchQuery.isFetching ? "同步中" : `${songs.length} 首`}</span>
              </div>

              <div className="song-list" id="queue">
                {songs.map((song, index) => {
                  const songKey = `${song.source}:${song.id}`;
                  const selected = current?.id === song.id && current.source === song.source;

                  return (
                    <button
                      className={`song-row${selected ? " active" : ""}`}
                      key={songKey}
                      onClick={() => {
                        void handleSelectSong(song);
                      }}
                    >
                      <span className="song-index">{String(index + 1).padStart(2, "0")}</span>
                      <span className="song-cover-wrap">
                        <img src={song.coverUrl || "/favicon.svg"} alt="" />
                      </span>
                      <span className="song-meta">
                        <strong>{song.name}</strong>
                        <small>
                          {song.artists.map((artist) => artist.name).join(" / ") || "未知歌手"} ·{" "}
                          {sourceName(song.source)}
                        </small>
                      </span>
                      <span className="row-play-icon" aria-hidden="true">
                        {loadingSongId === songKey ? <Loader2 size={16} className="spin" /> : <Play size={16} />}
                      </span>
                    </button>
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
            </section>
          </div>

          <aside className="player-panel" id="favorites">
            <div className="player-cover">
              <img className="cover" src={current?.coverUrl || "/favicon.svg"} alt="" />
              <span className={isPlaying ? "pulse-dot active" : "pulse-dot"} />
            </div>
            <span className="section-kicker">{sourceName(current?.source)}</span>
            <h2>{current?.name ?? "未播放"}</h2>
            <p>{currentArtists}</p>
            <div className="progress-shell" aria-hidden="true">
              <span className={isPlaying ? "playing" : ""} />
            </div>
            <div className="transport">
              <button type="button" aria-label="上一首" disabled={!current}>
                <SkipBack size={18} />
              </button>
              <button
                className="play-button"
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
                <span>{loadingSongId ? "加载中" : isPlaying ? "暂停" : "播放"}</span>
              </button>
              <button type="button" aria-label="下一首" disabled={!current}>
                <SkipForward size={18} />
              </button>
            </div>
            <div className="volume-line">
              <Volume2 size={16} />
              <span />
            </div>
          </aside>
        </section>
      </section>

      <footer className="mini-player" aria-label="底部播放器">
        <img src={current?.coverUrl || "/favicon.svg"} alt="" />
        <div>
          <strong>{current?.name ?? "选择歌曲"}</strong>
          <span>{currentArtists}</span>
        </div>
        <button type="button" onClick={handleTogglePlayback} disabled={!current || Boolean(loadingSongId)}>
          {isPlaying ? <Pause size={18} /> : <Play size={18} />}
          <span>{isPlaying ? "暂停" : "播放"}</span>
        </button>
      </footer>
    </main>
  );
}
