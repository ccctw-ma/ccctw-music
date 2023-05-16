// /*
//  * @Author: msc
//  * @Date: 2022-05-02 16:33:11
//  * @LastEditTime: 2022-05-02 16:33:11
//  * @LastEditors: msc
//  * @Description: 
//  */

// autoplay	设置或返回是否在加载完成后随即播放音频
// buffered	返回表示音频已缓冲部分的 TimeRanges 对象
// controller	返回表示音频当前媒体控制器的 MediaController 对象
// controls	设置或返回音频是否显示控件（比如播放/暂停等）
// crossOrigin	设置或返回音频的 CORS 设置
// currentSrc	回当前音频的 URL
// currentTime	设置或返回音频中的当前播放位置（以秒计）
// defaultMuted	设置或返回音频默认是否静音
// defaultPlaybackRate	设置或返回音频的默认播放速度
// duration	返回当前音频的长度（以秒计）
// ended	返回音频的播放是否已结束
// error	返回表示音频错误状态的 MediaError 对象
// loop	设置或返回音频是否应在结束时重新播放
// mediaGroup	设置或返回音频所属的组合（用于连接多个音频元素）
// muted	设置或返回音频是否静音
// networkState	返回音频的当前网络状态
// paused	设置或返回音频是否暂停
// playbackRate	设置或返回音频播放的速度
// played	返回表示音频已播放部分的 TimeRanges 对象
// preload	设置或返回音频是否应该在页面加载后进行加载
// readyState	返回音频当前的就绪状态
// seekable	返回表示音频可寻址部分的 TimeRanges 对象
// seeking	返回用户是否正在音频中进行查找
// src	设置或返回音频元素的当前来源
// textTracks	返回表示可用文本轨道的 TextTrackList 对象
// volume	设置或返回音频的音量
// addTextTrack()	在音频中添加一个新的文本轨道
// canPlayType()	检查浏览器是否可以播放指定的音频类型
// fastSeek()	在音频播放器中指定播放时间。
// getStartDate()	返回一个新的Date对象，表示当前时间轴偏移量
// load()	重新加载音频元素
// play()	开始播放音频
// pause()	暂停当前播放的音频

import React, { useState, useEffect, useRef } from "react";
import { Row, Col, Slider, Button, Typography, Image, Popover } from "antd";
import {
    StepBackwardOutlined,
    StepForwardOutlined,
    CaretRightFilled,
    PauseOutlined,
    SoundOutlined,
    HeartOutlined,
    HeartFilled,
    MoreOutlined,
    MessageOutlined,
    DownloadOutlined,
    UserOutlined
} from "@ant-design/icons";
import {
    OneLoopIcon,
    LoopIcon,
    RandomLoopIcon,
    OrderLoopIcon,
    VolumeOpenIcon,
    VolumeCloseIcon,
} from "../customizeIcons";
import { timeFormatter } from "../../util/time";
import { useRecoilValue, useSetRecoilState } from "recoil";
import { keyWordsState, curMusicState, musicListState, curMusicPlayState } from "../../store";


export default function MusicDetailPlayer({ musicPlayer, setShowComment }) {

    const curMusic = useRecoilValue(curMusicState), setCurMusic = useSetRecoilState(curMusicState);
    const curMusicPlay = useRecoilValue(curMusicPlayState), setCurMusicPlay = useSetRecoilState(curMusicPlayState);
    const [volume, setVolume] = useState(100);
    // 0 -> 单曲循环 1->歌单循环 2-> 顺序播放 3-> 随机播放
    const [order, setOrder] = useState(0);
    const [love, setLove] = useState(false);

    //不同播放顺序对应的图标
    const orderIconMap = {
        0: <OneLoopIcon />,
        1: <LoopIcon />,
        2: <OrderLoopIcon />,
        3: <RandomLoopIcon />,
    };


    const volumeContent = (
        <Slider
            vertical
            defaultValue={100}
            value={volume}
            max={100}
            onChange={(value) => {
                musicPlayer.current.volume = value / 100;
                setVolume(value);
            }}
            style={{ height: "150px" }}
        />
    );



    const handleCurrentTimeChange = (value) => {
        console.log(value);
        musicPlayer.current.currentTime = value;
    };

    //播放与暂停
    const handlePlay = () => {
        setCurMusicPlay(pre => {
            return {
                ...pre,
                isPlay: !curMusicPlay.isPlay
            }
        });
    };

    //播放上一首
    const playPrevious = () => { };
    //播放下一首
    const playNext = () => { };

    return (
        <div className="flex flex-col w-full ">
            <div className="w-full flex flex-row text-white justify-center items-center space-x-4 ">
                <Button
                    type="text"
                    shape="circle"
                    icon={love ? <HeartFilled /> : <HeartOutlined />}
                    style={{ color: love ? "red" : "white" }}
                    size={"large"}
                    onClick={() => {
                        setLove(!love)
                    }}
                />
                <Button
                    type="text"
                    shape="circle"
                    icon={<UserOutlined />}
                    style={{ color: "white" }}
                    size="large"
                    onClick={() => {
                        console.log("正在开发中");
                    }}
                />
                <Button
                    type="text"
                    shape="circle"
                    icon={<DownloadOutlined />}
                    style={{ color: "white" }}
                    size={"large"}
                    onClick={() => {
                        console.log("正在开发中");
                    }}
                />


                <Button
                    type="text"
                    shape="circle"
                    icon={<MessageOutlined />}
                    style={{ color: "white" }}
                    size={"large"}
                    onClick={() => {
                        setShowComment(true);
                    }}
                />

                <Button
                    type="text"
                    shape="circle"
                    icon={<MoreOutlined />}
                    style={{ color: "white" }}
                    size={"large"}
                    onClick={() => {
                        console.log("正在开发中");
                    }}
                />

            </div>
            <div className="flex flex-row justify-around items-center space-x-4 px-4 mb-1">
                <div className="block text-white text-xs">
                    {timeFormatter(curMusicPlay.currentTime)}
                </div>

                <div className="flex-1">
                    <Slider
                        defaultValue={0}
                        value={curMusicPlay.currentTime}
                        max={~~curMusicPlay.duration}
                        tipFormatter={timeFormatter}
                        onChange={handleCurrentTimeChange}
                        style={{ width: "100%" }}
                    />
                </div>


                <div className="block text-white text-xs">
                    {timeFormatter(curMusicPlay.duration)}
                </div>
            </div>
            <div className="flex flex-row items-center justify-center mb-4 space-x-4">

                <Button
                    type="text"
                    shape="circle"
                    icon={orderIconMap[order]}
                    style={{ color: "white" }}
                    size={"large"}
                    onClick={() => {
                        setOrder((order + 1) % 4);
                    }}
                />

                <Button
                    type="text"
                    shape="circle"
                    style={{ color: "white" }}
                    icon={<StepBackwardOutlined />}
                    size={"large"}
                    onClick={playPrevious}
                />
                <Button
                    type="ghost"
                    shape="circle"
                    icon={curMusicPlay.isPlay ? <PauseOutlined /> : <CaretRightFilled />}
                    style={{ color: "white" }}
                    size={"large"}
                    onClick={handlePlay}
                />
                <Button
                    type="text"
                    shape="circle"
                    style={{ color: "white" }}
                    icon={<StepForwardOutlined />}
                    size={"large"}
                    onClick={playNext}
                />

                <Popover placement="top" content={volumeContent}>
                    <Button
                        type="text"
                        style={{ color: "white" }}
                        shape="circle"
                        icon={volume === 0 ? <VolumeCloseIcon /> : <VolumeOpenIcon />}
                        size={"large"}
                        onClick={() => {
                            musicPlayer.current.volume = volume === 0 ? 1 : 0;
                            setVolume(volume === 0 ? 100 : 0);
                        }}
                    />
                </Popover>
            </div>
        </div>
    );
}

