/*
 * @Author: msc
 * @Date: 2022-06-12 21:31:55
 * @LastEditTime: 2022-06-20 22:54:15
 * @LastEditors: msc
 * @Description: 
 */

import React, { useEffect, useRef, useState } from "react";
import { constSelector, useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import MusicHeader from "./MusicDetailHeader";
import MusicDetailCover from "./MusicDetailCover";
import MusicDetailPlayer from "./MusicDetailPlayer";
import { curMusicState } from "../../store";
import MusicDetailComment from "./MusicDetailComment";

export default function MusicDetail({ setIsHome, musicPlayer }) {

    const curMusic = useRecoilValue(curMusicState);
    const [showComment, setShowComment] = useState(false);

    const [commentContent, setCommentContent] = useState(null);


    useEffect(() => {
        if (showComment) {
            const commentContent = (<MusicDetailComment setShowComment={setShowComment} />);
            setCommentContent(commentContent);
        } else {
            setCommentContent(null);
        }
    }, [showComment])


    return (
        <div className="relative w-full h-screen">
            <div className="absolute top-0 left-0 w-full h-full z-10 flex flex-auto flex-col">
                <div className="relative w-full h-full flex flex-col">
                    {/* music header */}
                    <MusicHeader setIsHome={setIsHome} setShowComment={setShowComment} />
                    {/* music cover */}
                    <MusicDetailCover musicPlayer={musicPlayer} setShowComment={setShowComment} />
                    {/* music control */}
                    <MusicDetailPlayer musicPlayer={musicPlayer} setShowComment={setShowComment} />
                </div>
            </div>
            {/* 显示一些格外的信息 */}
            <div className={`absolute w-full h-3/4 left-0 bottom-0 bg-white z-20 rounded-t-3xl transition-all duration-500 ease-in-out shadow-xl
                ${!showComment && "translate-y-full"}`}>
                {commentContent}
            </div>
            <div className="absolute top-0 left-0 w-screen h-screen bg-cover bg-top  -z-50 blur-[4px] brightness-[.5] saturate-50 "
                style={{ backgroundImage: `url(${curMusic._coverUrl || 'http://mms0.baidu.com/it/u=2999215938,1867739424&fm=253&app=138&f=JPEG&fmt=auto&q=75?w=500&h=500'})` }} >
            </div>
        </div >
    )
}
