import { useQuery } from "@tanstack/react-query";
import { Disc3, Headphones, Pause, Play, Radio, Search, Sparkles, Waves } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import type { Song } from "@ccctw-music/core";
import { createMusicApiClient } from "@ccctw-music/api-client";
import { usePlayerStore } from "./stores/player-store";

const apiClient = createMusicApiClient({
  baseUrl: import.meta.env.PUBLIC_API_BASE_URL ?? "/api",
});

export function App() {
  const [keyword, setKeyword] = useState("周杰伦");
  const [submittedKeyword, setSubmittedKeyword] = useState("周杰伦");
  const { current, isPlaying, play, pause, setCurrent } = usePlayerStore();

  const searchQuery = useQuery({
    queryKey: ["search", submittedKeyword],
    queryFn: () => apiClient.search({ keyword: submittedKeyword, sources: ["migu", "netease", "qq"] }),
    enabled: submittedKeyword.trim().length > 0,
  });

  const songs = useMemo(() => searchQuery.data?.flatMap((result) => result.songs) ?? [], [searchQuery.data]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittedKeyword(keyword.trim());
  }

  function handleSelectSong(song: Song) {
    setCurrent(song);
    play();
  }

  return (
    <main className="app-shell">
      <div className="aurora aurora-a" />
      <div className="aurora aurora-b" />

      <section className="hero-panel">
        <div className="hero-copy">
          <span className="brand-pill">
            <Waves size={16} />
            CCCTW Music
          </span>
          <p className="eyebrow">Blue Wave Streaming</p>
          <h1>跨 Web、桌面、移动与鸿蒙的统一音乐体验</h1>
          <p className="subtitle">聚合多平台搜索、歌词与播放队列，用一套蓝色沉浸式界面覆盖所有终端。</p>

          <div className="hero-stats" aria-label="产品能力">
            <span>
              <strong>3+</strong>
              音源聚合
            </span>
            <span>
              <strong>5</strong>
              端共享架构
            </span>
            <span>
              <strong>90%+</strong>
              质量门禁
            </span>
          </div>
        </div>

        <div className="hero-action-card">
          <div className="equalizer" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
          <p>现在开始探索</p>
          <form className="search-box" onSubmit={handleSubmit}>
            <Search size={18} />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索歌曲、歌手或专辑"
              aria-label="搜索歌曲、歌手或专辑"
            />
            <button type="submit">搜索</button>
          </form>
          <div className="source-chips" aria-label="音乐来源">
            <span>MiGu</span>
            <span>NetEase</span>
            <span>QQ Music</span>
          </div>
        </div>
      </section>

      <section className="content-grid">
        <div className="song-list-panel">
          <div className="panel-header">
            <div>
              <p className="section-label">
                <Radio size={14} />
                Discovery
              </p>
              <h2>搜索结果</h2>
            </div>
            <span>{searchQuery.isFetching ? "搜索中..." : `${songs.length} 首`}</span>
          </div>

          <div className="song-list">
            {songs.map((song) => (
              <button className="song-row" key={`${song.source}:${song.id}`} onClick={() => handleSelectSong(song)}>
                <span className="song-cover-wrap">
                  <img src={song.coverUrl || "/favicon.svg"} alt="" />
                </span>
                <span className="song-meta">
                  <strong>{song.name}</strong>
                  <small>
                    {song.artists.map((artist) => artist.name).join(" / ") || "未知歌手"} · {song.source}
                  </small>
                </span>
                <span className="row-play-icon" aria-hidden="true">
                  <Play size={16} />
                </span>
              </button>
            ))}
            {!searchQuery.isFetching && songs.length === 0 ? (
              <div className="empty-state">
                <Sparkles size={26} />
                <strong>暂无搜索结果</strong>
                <p>换个关键词试试，或者搜索歌手、专辑名称。</p>
              </div>
            ) : null}
          </div>
        </div>

        <aside className="player-panel">
          <div className="cover-stage">
            <div className="vinyl-ring" />
            <img className="cover" src={current?.coverUrl || "/favicon.svg"} alt="" />
          </div>
          <p className="eyebrow player-source">
            <Headphones size={14} />
            {current?.source ?? "未选择来源"}
          </p>
          <h2>{current?.name ?? "选择一首歌开始播放"}</h2>
          <p>{current?.artists.map((artist) => artist.name).join(" / ") ?? "统一播放器状态会在这里展示"}</p>
          <div className="progress-shell" aria-hidden="true">
            <span />
          </div>
          <button className="play-button" type="button" onClick={isPlaying ? pause : play} disabled={!current}>
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            {isPlaying ? "暂停" : "播放"}
          </button>
          <div className="player-footer">
            <Disc3 size={16} />
            <span>Blue Wave Player</span>
          </div>
        </aside>
      </section>
    </main>
  );
}
