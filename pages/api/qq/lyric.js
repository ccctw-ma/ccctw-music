/**
 * @Author: msc
 * @Date: 2022-06-20 22:15:44
 * @LastEditTime: 2022-06-20 22:18:02
 * @LastEditors: msc
 * @Description:
 */

import qqMusic from "qq-music-api";

export default async function handler(req, res) {
  try {
    const id = req.query.id;
    if (!id) {
      throw "no id";
    }
    const result = await qqMusic.api("/lyric", { songmid: id });
    res.status(200).json(result);
  } catch (e) {
    res.status(500).json(e);
  }
}
