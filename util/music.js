/**
 * @Author: msc
 * @Date: 2022-05-03 15:54:19
 * @LastEditTime: 2022-06-21 14:32:34
 * @LastEditors: msc
 * @Description:
 */

import { useState, useEffect } from "react";
import { constSelector } from "recoil";
import API from "./request";
import { v4 as uuidv4 } from "uuid";

export const musicFormatter = (musics, type) => {
  let res = [];
  if (!musics) return [];
  if (type === "migu") {
    res = musics.map((music) => {
      let o = {};
      o._from = type;
      o._id = music.id;
      o._name = music.songName;
      o._singerName = music.singerName;
      o._album = music.albumName;
      o._time = null;
      o._lyricsUrl = music.lyrics;
      o._lyric = {
        lyrics: [],
        lyricType: 0,
      };
      o._musicUrl = music.mp3;
      o._coverUrl = music.cover;
      // 前半部分是派生出来的数据， raw是原始获取的数据先保留备用
      return { ...o, raw: music };
    });
  } else if (type === "netease") {
    res = musics.map((m) => {
      let o = {};
      o._from = type;
      o._id = m.id;
      o._name = m.name;
      o._singerName = m?.artists.map((a) => a.name).join("/");
      o._album = m.album?.name;
      o._time = m.duration / 1000;
      o._lyricsUrl = null;
      o._lyric = {
        lyrics: [],
        lyricType: 0,
      };
      o._musicUrl = null;
      o._coverUrl = null;
      return {
        ...o,
        raw: m,
      };
    });
  } else if (type === "qq") {
    res = musics.map((m) => {
      let o = {};
      o._from = type;
      o._id = m.songid;
      o._name = m.songname;
      o._singerName = m?.singer.map((a) => a.name).join("/");
      o._album = m.albumname;
      o._time = null;
      o._lyricsUrl = null;
      o._lyric = {
        lyrics: [],
        lyricType: 0,
      };
      o._musicUrl = null;
      o._coverUrl = null;
      return {
        ...o,
        raw: m,
      };
    });
  }

  return res;
};

export const fetchMusicDetail = async (music, type) => {
  let res = {};
  if (type === "migu") {
    // console.log(music, type);
    if (music?.raw.copyrightId) {
      const cid = music.raw.copyrightId;
      const data = await API.GET(`/api/${type}/lyrics?cid=${cid}`);
      if (data.status === 200) {
        let body = data.body;
        res._lyric = parseLyrics(body.lyric);
      }
    }
  } else if (type === "netease") {
    //网易云的音乐需要拿到 播放链接 封面 和 歌词
    const mid = music._id;
    if (mid) {
      // 播放链接
      const data = await API.GET(`/api/${type}/songurl?id=${mid}`);
      if (data.status === 200) {
        let arr = data.body.data;
        res._musicUrl = arr?.length ? arr[0].url : null;
      }
      //歌词
      const lyricData = await API.GET(`/api/${type}/lyrics?id=${mid}`);
      // console.log(lyricData);
      if (lyricData.status === 200) {
        let lyric = lyricData.body?.lrc?.lyric;
        res._lyric = parseLyrics(lyric);
      }
      //封面
      const aid = music.raw?.album?.id;
      if (aid) {
        const albumData = await API.GET(`/api/${type}/album?id=${aid}`);
        if (albumData.status === 200) {
          res._coverUrl = albumData.body?.album?.picUrl;
        }
      }
    }
  } else if (type === "qq") {
    //网易云的音乐需要拿到 播放链接(傻逼qq音乐, 这个不好拿) 封面 和 歌词
    const id = music._id;
    const mid = music.raw.songmid;
    if (id) {
      //播放链接
      try {
        const urlData = await API.GET(`/api/${type}/songurl?id=${mid}`);
        if (urlData.status === 200) {
          res._musicUrl = null;
        }
      } catch (e) {
        console.log(e);
      }
      //歌词
      const lyricData = await API.GET(`/api/${type}/lyric?id=${mid}`);
      if (lyricData.status === 200) {
        let lyric = lyricData.body?.lyric;
        res._lyric = parseLyrics(lyric);
      }
      //封面
      const aid = music.raw?.albummid;
      if (aid) {
        const albumData = await API.GET(`/api/${type}/album?aid=${aid}`);
        if (albumData.status === 200) {
          const album = albumData.body;
          // console.log(album);
          res._coverUrl = album?.picurl;
        }
      }
    }
  }
  return {
    ...music,
    ...res,
  };
};

export const parseLyrics = (lyrics) => {
  let res = {
    lyrics: [],
    lyricType: 0,
  };
  if (!lyrics.length) {
    return res;
  }
  let sentencs = lyrics.split(/\r\n|\n/);
  if (sentencs.length >= 2) {
    if (sentencs[0][0] !== "[") {
      res.lyricType = 1; // 有歌词但是没有时间戳
      sentencs.forEach((s) => {
        if (s.length) {
          res.lyrics.push({
            id: uuidv4(),
            sentence: s,
          });
        }
      });
    } else {
      res.lyricType = 2;
      sentencs.forEach((s) => {
        if (s.length) {
          let temp = /\[(\d+):(\d+)\.(\d+)](.*)/.exec(s);
          if (temp) {
            const minute = Number.parseInt(temp[1]);
            const second = Number.parseInt(temp[2]);
            const millisecond = Number.parseInt(temp[3]);
            // 毫秒的精度
            const length = temp[3].length;
            const sentence = temp[4];
            res.lyrics.push({
              id: uuidv4(),
              timeStamp:
                minute * 60 + second + millisecond / Math.pow(10, length),
              sentence,
            });
          }
        }
      });
    }
  }
  return res;
};

