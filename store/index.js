/**
 * @Author: msc
 * @Date: 2022-05-02 22:37:21
 * @LastEditTime: 2022-06-20 22:49:44
 * @LastEditors: msc
 * @Description: 状态管理集
 */

import { atom } from "recoil";

export const curMusicState = atom({
  key: "curMusic",
  default: {
    _from: "netease",
    _id: "1474411443",
    _name: "", // 歌曲名 *
    _singerName: "", // 歌手 *
    _album: "", //专辑
    _time: "", // 歌曲时间              带*表示必须需要的
    _lyricsUrl: "", // 歌词地址
    _lyric: { lyrics: [], lyricType: 0 }, // 歌词
    _musicUrl:
      "https://freetyst.nf.migu.cn/public%2Fproduct20%2F2018%2F10%2F11%2F2015%E5%B9%B411%E6%9C%8812%E6%97%A515%E7%82%B957%E5%88%86%E5%86%85%E5%AE%B9%E5%87%86%E5%85%A5SONY999%E9%A6%96%2F%E5%85%A8%E6%9B%B2%E8%AF%95%E5%90%AC%2FMp3_64_22_16%2F6005970GF5H.mp3?Key=ecf09a9f2571cd91&Tim=1655028443873&channelid=01&msisdn=eed296f3374f4a589813cb654150fd0f", // 播放链接 *
    _coverUrl:
      "http://mms0.baidu.com/it/u=2999215938,1867739424&fm=253&app=138&f=JPEG&fmt=auto&q=75?w=500&h=500", // 封面
    raw: {},
  },
});

export const curMusicPlayState = atom({
  key: "curMusicPlay",
  default: {
    isPlay: false, //是否正在播放
    duration: 0, // 当前音乐的总时长
    currentTime: 0, //音乐当前的播放进度
    // musicPlayer: null,
  },
});

export const musicListState = atom({
  key: "musicList",
  default: {
    netease: {
      total: 0,
      songs: [],
    },
    qq: {
      total: 0,
      songs: [],
    },
    bilibili: {
      total: 0,
      songs: [],
    },
    migu: {
      total: 0,
      songs: [],
    },
    other: {
      total: 0,
      songs: [],
    },
  },
});

export const keyWordsState = atom({
  key: "keyWords",
  default: "",
});
