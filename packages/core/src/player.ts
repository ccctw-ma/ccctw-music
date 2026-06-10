import type { PlayerEvent, PlayerState, Song } from "./types";

type Listener = (event: PlayerEvent) => void;

const initialState: PlayerState = {
  queue: [],
  isPlaying: false,
  duration: 0,
  currentTime: 0,
  volume: 1,
  mode: "sequence",
};

export class PlayerStore {
  private state: PlayerState = initialState;
  private listeners = new Set<Listener>();

  getState(): PlayerState {
    return this.state;
  }

  setQueue(queue: Song[], current = queue[0]): PlayerState {
    this.state = {
      ...this.state,
      queue,
      current,
      currentTime: 0,
      duration: current?.duration ?? 0,
    };
    this.emit({ type: "loaded", state: this.state });
    return this.state;
  }

  play(): PlayerState {
    this.state = { ...this.state, isPlaying: true };
    this.emit({ type: "play", state: this.state });
    return this.state;
  }

  pause(): PlayerState {
    this.state = { ...this.state, isPlaying: false };
    this.emit({ type: "pause", state: this.state });
    return this.state;
  }

  updateProgress(currentTime: number, duration = this.state.duration): PlayerState {
    this.state = { ...this.state, currentTime, duration };
    this.emit({ type: "timeupdate", state: this.state });
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(event: PlayerEvent) {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}
