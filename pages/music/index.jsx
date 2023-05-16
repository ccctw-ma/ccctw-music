/*
 * @Author: msc
 * @Date: 2022-05-02 18:03:47
 * @LastEditTime: 2022-06-12 21:35:11
 * @LastEditors: msc
 * @Description: 主要的音乐显示界面
 */

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { constSelector, useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import MusicHeader from "../../components/MusicDetail/MusicDetailHeader";
import MusicDetail from "../../components/MusicDetail/MusicDetail/MusicDetail";
import MusicPlay from "../../components/MusicDetail/MusicDetailPlayer";
import { curMusicState } from "../../store";



export default function Music() {

    const curMusic = useRecoilValue(curMusicState), setCurMusic = useSetRecoilState(curMusicState);
    return (
        <div className="block w-screen h-screen">
            <div className="absolute top-0 left-0 w-full h-full z-10 flex flex-auto flex-col">
                {/* music header */}
                <MusicHeader />
                {/* music cover */}
                <MusicDetail />
                {/* music control */}
                <MusicPlay />
            </div>
            <div className="absolute top-0 left-0 w-screen h-screen bg-cover bg-top  z-0 blur-[4px] brightness-[.5] saturate-50 "
                style={{ backgroundImage: `url(${curMusic._coverUrl || 'https://mcontent.migu.cn/newlv2/new/album/20210513/8592/s_yaLskeLyyeLOsIJf.jpg'})` }} >
            </div>
        </div >
    )
}