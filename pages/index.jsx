import React, { useState, useRef, useEffect } from "react";
import MusicHome from "../components/MusicHome/MusicHome";
import MusicDetail from "../components/MusicDetail/MusicDetail";
import { useRecoilValue, useSetRecoilState } from "recoil";
import { curMusicState, curMusicPlayState } from "../store";

export default function Home() {

  const [isHome, setIsHome] = useState(true);
  const musicPlayer = useRef(null);

  const curMusic = useRecoilValue(curMusicState);
  const curMusicPlay = useRecoilValue(curMusicPlayState), setCurMusicPlay = useSetRecoilState(curMusicPlayState);
  // 页面切换操作
  const [mainView, setMainView] = useState(null);

  //主要显示界面
  const mainContent = (
    <div className="relative container h-screen overflow-hidden lg:max-w-screen-lg lg:mx-auto">
      <div className={`absolute top-0 left-0 container h-screen transition-all duration-500 overflow-hidden 
      ${!isHome && 'opacity-0 -z-10'}`}>
        <MusicHome setIsHome={setIsHome} musicPlayer={musicPlayer} />
      </div>
      <div className={`absolute top-0 left-0 container h-screen transition-all duration-500 overflow-hidden 
      ${isHome && 'opacity-0 -z-10'}`}>
        <MusicDetail setIsHome={setIsHome} musicPlayer={musicPlayer} />
      </div>
    </div>
  )

  // 页面初试化
  useEffect(() => {
    console.log("Hello, welcome to my react music app");
    console.log("This is the music player of my app", musicPlayer);
    console.log("The initial status of curMuic and curMusicPlay", curMusic, curMusicPlay);
    // musicPlayer.current.focus();
    // musicPlayer.current.play();
    musicPlayer.current.ontimeupdate = (e) => {

      setCurMusicPlay(pre => {
        return {
          ...pre,
          currentTime: musicPlayer.current.currentTime,
          duration: musicPlayer.current.duration
        }
      })
    }

    setMainView(mainContent);
  }, []);

  useEffect(() => {
    console.log('切换显示界面', isHome);
    console.log(musicPlayer);
    setMainView(mainContent)
  }, [isHome]);

  useEffect(() => {
    console.log('当前选中的音乐', curMusic);

    //切歌原来的歌曲先暂停， 然后等音乐播放需要的组件都加载好后再开始播放
    musicPlayer.current.pause();
    // 切歌是默认播放
    let play = true;
    //没有播放链接

    if (!curMusic._musicUrl) {
      play = false;
    } else {
      play = true;
    }
    setTimeout(() => {
      setCurMusicPlay(pre => {
        return {
          ...pre,
          isPlay: play
        }
      })
      console.log("切歌完后的音乐播放器状态", musicPlayer);
    }, 200);
  }, [curMusic])

  //全局的控制音乐播放器的状态
  useEffect(() => {
    // console.log(curMusicPlay);
    // console.log(musicPlayer);
    //判断是否播放
    if (curMusicPlay.isPlay) {
      musicPlayer.current.play();
    } else {
      musicPlayer.current.pause();
    }
  }, [curMusicPlay]);



  return (
    <>
      <audio
        ref={musicPlayer}
        src={curMusic._musicUrl ?? null}
        id="musicPlayer"
        controls
        autoPlay={true}
        className="hidden"
      ></audio>
      {mainView}
    </>
  );
}

