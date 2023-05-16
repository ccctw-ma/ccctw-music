/*
 * @Author: msc
 * @Date: 2022-05-19 15:59:17
 * @LastEditTime: 2022-06-21 17:19:51
 * @LastEditors: msc
 * @Description: here show music cover and lyrics
 */
import React, { useState, useEffect, useRef } from 'react'
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import { keyWordsState, curMusicState, musicListState, curMusicPlayState } from "../../store";
import styles from "../../styles/App.module.css"

export default function MusicDetailCover() {

    const [isCover, setIsCover] = useState(true);
    const curMusic = useRecoilValue(curMusicState), setCurMusic = useSetRecoilState(curMusicState);
    const curMusicPlay = useRecoilValue(curMusicPlayState);
    const [lyricContent, setLyricContent] = useState(null);
    const [lyricContentLoaded, setLyricContentStatus] = useState(false);
    const [targetLyricDom, setTargetLyricDom] = useState(null);
    const [curTranslateY, setCurTranslateY] = useState(0);
    const [autoScroll, setAutoScroll] = useState(true);
    const lyricRefList = useRef([]);
    const lyricParentRef = useRef([]);
    const autoScrollTimer = useRef(null);


    const getRef = dom => {
        if (dom) {
            lyricRefList.current.push(dom)
        }
    };

    const scroll = e => {
        const offsetHeight = lyricParentRef.current.clientHeight;
        const scrollHeight = lyricParentRef.current.scrollHeight;

        let nextY = curTranslateY - e.deltaY;
        if (nextY >= offsetHeight / 2) {
            nextY = offsetHeight / 2;
        }
        if (nextY < (-scrollHeight + offsetHeight / 2)) {
            nextY = (-scrollHeight + offsetHeight / 2);
        }
        // console.log(nextY);
        setCurTranslateY(nextY);
        setAutoScroll(false);
        let timer = setTimeout(() => {
            setAutoScroll(true);
            autoScrollTimer.current = null;
        }, 2000);

        if (autoScrollTimer.current) {
            clearTimeout(autoScrollTimer.current);
        }
        autoScrollTimer.current = timer;
    }

    // 没有歌词 有歌词没对应的时间 有歌词有对应的时间
    useEffect(() => {
        //歌词组件还没有准备好
        setLyricContentStatus(false);
        setCurTranslateY(0);
        const { lyrics, lyricType } = curMusic._lyric;
        lyricRefList.current = [];
        let content = null;
        if (lyricType === 0) {
            content =
                <div className='flex flex-1 justify-center items-center text-white text-base'>
                    暂无歌词
                </div>;
        } else if (lyricType === 1) {
            content = lyrics.map(s => {
                return (
                    <p key={s.id} id={s.id} className='text-gray-400 text-base text-center w-4/5'>
                        {s.sentence}
                    </p>
                )
            })
        } else {
            content = (lyrics.map(s => {
                return (
                    <p key={s.id} id={s.id} ref={getRef} className='text-gray-400 text-base text-center w-4/5'>
                        {s.sentence}
                    </p>
                )
            }))

        }
        // lyricParentRef.current.scrollTop = 0;
        setLyricContent(content);
        setTimeout(() => {
            //歌词组件准备完毕
            setLyricContentStatus(true);
            if (lyricParentRef.current) {
                setCurTranslateY(lyricParentRef.current.offsetHeight / 2);
            }
        }, 1000);
    }, [curMusic]);


    //在音乐播放的时候且歌词有时间戳的时候 自动把当前正在播放的那段歌词居中并高亮
    useEffect(() => {
        // console.log(autoScroll);
        const currentTime = curMusicPlay.currentTime;
        const { lyrics, lyricType } = curMusic._lyric;
        // console.log("歌词跟随音乐播放时间滚动", currentTime, lyricContentLoaded, lyricType, lyricRefList);
        if (lyricContentLoaded && lyricParentRef && lyricType === 2 && lyrics.length) {
            // debugger
            let target = null;
            if (currentTime > lyrics[lyrics.length - 1].timeStamp) {
                target = lyrics[lyrics.length - 1];
            } else {
                for (let i = 0; i < lyrics.length - 1; i++) {
                    const temp = lyrics[i], next = lyrics[i + 1];
                    if (currentTime >= temp.timeStamp && currentTime < next.timeStamp) {
                        target = temp;
                        break;
                    }
                }
            }
            const lyricDoms = lyricRefList.current;
            let targetDom = null;
            lyricDoms.forEach(d => {
                if (d && d?.id === target?.id) {
                    targetDom = d;
                    return
                }
            })
            if (targetDom) {
                // console.log('-------------->', targetDom, targetDom?.id, targetLyricDom);
                if (targetLyricDom && targetDom?.id !== targetLyricDom?.id) {
                    targetLyricDom.classList.remove('text-white');
                    targetLyricDom.classList.add('text-gray-400');
                }

                if (!targetLyricDom || targetLyricDom?.id !== targetDom?.id) {
                    const targetOffset = lyricParentRef.current.offsetHeight / 2;
                    const actualOffset = targetDom.offsetTop;
                    // let currentScrollTop = lyricParentRef.current.scrollTop;
                    // let targetScrollTop = Math.max(actualOffset - targetOffset, 0);
                    // const step = 1;
                    // //平滑滚动
                    // const scroll = () => {
                    //     currentScrollTop += step;
                    //     if (currentScrollTop <= targetScrollTop) {
                    //         lyricParentRef.current.scrollTop = currentScrollTop;
                    //         setTimeout(scroll, 15);
                    //     }
                    // }
                    // setTimeout(scroll, 50);

                    // console.log(lyricParentRef);

                    console.dir(targetDom);
                    console.log(targetDom);
                    targetDom.classList.remove('text-gray-400');
                    targetDom.classList.add('text-white');
                    if (autoScroll) {
                        setCurTranslateY(-(actualOffset - targetOffset));
                    }
                    setTargetLyricDom(targetDom);
                }
            }

        }
    }, [curMusicPlay.currentTime]);

    return (
        <div className="relative grow overflow-hidden">
            {/* 歌曲封面 */}
            <div className={`absolute w-full h-full flex justify-center items-center transition-all duration-500 
                ${!isCover && 'opacity-0 -z-10'}`}
                onClick={() => { setIsCover(false) }}>
                <img className={`${styles.musicPlaySpin} ${!curMusicPlay.isPlay && styles.musicPlaySpinPause} 
                    block rounded-full w-1/2 md:w-1/4`}
                    src={curMusic._coverUrl} alt=""
                />
            </div>
            {/* 歌曲歌词 */}
            <div className={`absolute w-full h-full flex items-center transition-all duration-500 overflow-hidden ${isCover && 'opacity-0 -z-10'}`}>
                {/* <button onClick={() => console.log(lyricRefList.current)}>click me</button> */}
                <div className='w-full h-5/6 overflow-hidden'
                    onClick={() => { setIsCover(true) }}
                    onWheel={scroll}
                >
                    <div ref={lyricParentRef} className='w-full h-full flex flex-col items-center transition-all duration-500 ease-in-out'
                        style={{ transform: `translateY(${curTranslateY}px)` }}
                    >
                        {lyricContent}
                    </div>
                </div>

            </div>
        </div>
    )
}

