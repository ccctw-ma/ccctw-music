/**
 * @Author: msc
 * @Date: 2022-06-17 01:19:57
 * @LastEditTime: 2022-06-19 15:00:33
 * @LastEditors: msc
 * @Description:
 */
// 歌词

import neteaseRequest from "../../../util/neteaseRequest";

export default async function handler(req, res) {
  try {

    const query = req.query;

    const data = {
      id: query.id,
      lv: -1,
      kv: -1,
      tv: -1,
    };
    const body = await neteaseRequest("POST", `https://music.163.com/api/song/lyric`, data, {
      crypto: "api",
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    });
    if(body.status === 200){
      res.status(200).json(body.body);
    }else{
      throw body.status
    }

  } catch (e) {
    console.log(e);
    res.status(500).json({ e });
  }
}

