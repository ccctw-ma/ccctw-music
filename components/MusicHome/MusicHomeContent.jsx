/*
 * @Author: msc
 * @Date: 2022-02-08 20:32:52
 * @LastEditTime: 2022-06-22 15:47:49
 * @LastEditors: msc
 * @Description: 主要显示界面
 */

import { Empty, Button, Tabs, Pagination, Spin } from "antd";
import React, { useEffect, useState } from "react";
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import { keyWordsState, curMusicState, musicListState } from "../../store";
import { timeFormatter } from "../../util/time";
import API from "../../util/request";
import { musicFormatter, fetchMusicDetail } from "../../util/music";
import {
    NetEaseIcon,
    QQMusicIcon,
    BilibiliIcon,
    MiGuMusicIcon,
    OtherIcon,
} from "../customizeIcons";

const typeMap = {
    'netease': '网易云',
    'qq': "QQ音乐",
    'migu': "咪咕音乐",
    'bilibili': "B站"
}

export default function MusicHomeContent() {
    const musicList = useRecoilValue(musicListState), setMusicList = useSetRecoilState(musicListState);
    const keyWords = useRecoilValue(keyWordsState);
    const curMusic = useRecoilValue(curMusicState), setCurMusic = useSetRecoilState(curMusicState);
    const [selectedMusic, setSelectedMusic] = useState({});
    const [type, setType] = useState("netease");
    const [page, setPage] = useState(1);
    // const [isLoading, set]
    // const [hasError, setHasError] 

    // 处理音乐点击事件
    useEffect(() => {
        console.log(musicList);
        (async () => {
            // 判空
            if (Object.keys(selectedMusic).length !== 0) {
                // console.log(selectedMusic);
                const music = await fetchMusicDetail(selectedMusic, type);

                console.log('selectedMuic', music);
                setCurMusic(pre => {
                    return {
                        ...pre,
                        ...music
                    }
                })
            }
        })();
    }, [selectedMusic]);

    //处理tab和分页页码点击事件  
    useEffect(() => {
        console.log("MusicHomeContent", type, page, keyWords);
        // let res = null;

        let fetchMusicList = () => { };
        if (keyWords.length !== 0) {
            if (type === 'netease') {
                fetchMusicList = async (type, keyWords, page) => {
                    // console.log(`/api/${type}/search?keyWords=${keyWords}&page=${page}`);
                    const data = await API.GET(`/api/${type}/search?keywords=${keyWords}&offset=${page - 1}`);
                    if (data.status === 200) {
                        let body = data.body?.body?.result;
                        console.log(body);
                        setMusicList((old) => {
                            return {
                                ...old,
                                [type]: {
                                    total: body?.songCount || 0,
                                    songs: musicFormatter(body?.songs, type)
                                }
                            }
                        })
                    } else {
                        console.log(data);
                    }
                };
            } else if (type === 'qq') {
                fetchMusicList = async (type, keyWords, page) => {
                    const data = await API.GET(`/api/${type}/search?key=${keyWords}&pageNo=${page}`);

                    if (data.status === 200) {
                        // console.log(data);
                        const body = data.body?.result;
                        console.log(body);
                        setMusicList(pre => {
                            return {
                                ...pre,
                                [type]: {
                                    total: body?.total || 0,
                                    songs: musicFormatter(body?.list, type)
                                }
                            }
                        })
                    } else {
                        console.log(data);
                    }
                };
            } else if (type === 'bilibili') {

            } else if (type === 'migu') {
                fetchMusicList = async (type, keyWords, page) => {
                    // console.log(`/api/${type}/search?keyWords=${keyWords}&page=${page}`);
                    const data = await API.GET(`/api/${type}/search?keyWords=${keyWords}&page=${page - 1}`);
                    if (data.status === 200) {
                        console.log(data);
                        setMusicList((old) => {
                            return {
                                ...old,
                                [type]: {
                                    total: data.body?.pgt,
                                    songs: musicFormatter(data.body?.musics, type)
                                }
                            }
                        })
                    } else {
                        console.log(data);
                    }
                };
            } else {

            }

            fetchMusicList(type, keyWords, page);
        }

    }, [keyWords, type, page]);



    const typeOptions = [
        {
            type: 'netease',
            icon: <NetEaseIcon />,
            name: '网易'
        },
        {
            type: 'qq',
            icon: <QQMusicIcon />,
            name: 'QQ'
        },
        {
            type: 'migu',
            icon: <MiGuMusicIcon />,
            name: '咪咕'
        },
        {
            type: 'bilibili',
            icon: <BilibiliIcon />,
            name: 'B站'
        },
        {
            type: 'other',
            icon: <OtherIcon />,
            name: '其他'
        }
    ];

    const TypeListContent = (
        <div className="m-2 grid grid-cols-5 gap-1">
            {typeOptions.map(e => {
                return (
                    <div className="w-full flex flex-row justify-center items-center"
                        onClick={() => {
                            setType(e.type)
                            setPage(1);
                        }}>
                        <div className="block mb-1 mr-1">
                            {e.icon}
                        </div>
                        <div className={`pt-[2px] text-base font-medium ${e.type === type && "text-sky-500"}`}>
                            {e.name}
                        </div>

                    </div>
                )
            })}
        </div>
    );

    const MusicListContent = (
        <div className="w-full px-2 py-1 ">
            {/* 标题栏 */}
            <div className="hidden sm:flex flex-row ">
                <h2>音乐标题</h2>
                <h2>歌手</h2>
                <h2>专辑</h2>
                <h2>时长</h2>
                <h2>来源</h2>
            </div>
            {musicList[type].songs.map((e, index) => (
                <div
                    key={e._id}
                    className="w-full my-1 flex flex-row justify-between items-center  rounded-2xl hover:bg-sky-300 transition duration-500"
                    onDoubleClick={() => {
                        setSelectedMusic(e);
                    }}
                >
                    <div className="w-1/12 text-xl pl-2">{index + 1}</div>
                    <div className="w-8/12 flex flex-col justify-start pl-2">
                        <div className="text-lg font-semibold truncate">{e._name}</div>
                        <div className="flex flex-row justify-start">
                            <div className="block mr-1 text-sm font-normal truncate">{e._singerName}</div>
                            -
                            <div className="block ml-1 text-sm font-normal truncate">{e._album}</div>
                        </div>
                    </div>

                    {/* <div className={styles.text}>{e._time}</div> */}
                    <div className="w-2/12">{typeMap[e._from]}</div>
                    <div className="w-1/12"
                        onClick={() => {
                            setSelectedMusic(e);
                        }}
                    >
                        播放
                    </div>
                </div>
            ))}
            <div className="flex my-2 justify-center items-center">
                <Pagination
                    defaultPageSize={50}
                    defaultCurrent={1}
                    total={musicList[type].total}
                    showSizeChanger={false}
                    onChange={(page) => {
                        console.log(type, "page: " + page);
                        setPage(page);
                    }}
                />
            </div>
        </div>
    );

    return (
        <div className="block w-full">
            {TypeListContent}
            {MusicListContent}
        </div>
    );
}
