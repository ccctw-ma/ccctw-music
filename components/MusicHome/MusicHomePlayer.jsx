/*
 * @Author: msc
 * @Date: 2022-05-02 17:22:30
 * @LastEditTime: 2022-06-20 22:51:17
 * @LastEditors: msc
 * @Description: 
 */


import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import { keyWordsState, curMusicState, musicListState, curMusicPlayState } from "../../store";
import { MenuUnfoldOutlined, PlayCircleOutlined, PauseCircleOutlined } from "@ant-design/icons"
import styles from "../../styles/App.module.css"


export default function MusicHomePlayer({ setIsHome, musicPlayer }) {

    const curMusic = useRecoilValue(curMusicState), setCurMusic = useSetRecoilState(curMusicState);
    const curMusicPlay = useRecoilValue(curMusicPlayState), setCurMusicPlay = useSetRecoilState(curMusicPlayState);

    const handlePlay = (bool) => {
        setCurMusicPlay(pre => {
            return {
                ...pre,
                isPlay: bool
            }
        })
    }

    return (
        <div className="w-full">
            <div className="w-full h-14 flex flex-row items-center bg-white">
                <div className="w-2/12" onClick={() => setIsHome(false)}>
                    <img
                        src={curMusic._coverUrl || "http://mms0.baidu.com/it/u=2999215938,1867739424&fm=253&app=138&f=JPEG&fmt=auto&q=75?w=500&h=500"} alt="图片"
                        className={`${styles.musicPlaySpin} ${!curMusicPlay.isPlay && styles.musicPlaySpinPause} 
                        absolute left-2 bottom-2 block w-14 h-14 object-center rounded-full`} />
                </div>

                <div className="w-8/12 h-full flex flex-row justify-start items-center">
                    <div className="ml-2 max-w-[70%] text-base font-semibold truncate">
                        {curMusic._name}
                    </div>
                    -
                    <div className="ml-2 mt-[2px] max-w-[30%] text-sm font-normal truncate">
                        {curMusic._singerName}
                    </div>

                </div>

                <div className="w-2/12 flex flex-row justify-center items-center">
                    <div>
                        {!curMusicPlay.isPlay && <PlayCircleOutlined className="text-xl  mr-1" onClick={() => handlePlay(true)} />}
                        {curMusicPlay.isPlay && <PauseCircleOutlined className="text-xl mr-1" onClick={() => handlePlay(false)} />}
                    </div>
                    <div>
                        <MenuUnfoldOutlined className="text-xl ml-1" />
                    </div>
                </div>

            </div>

        </div>
    )
}