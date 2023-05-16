/**
 * @Author: msc
 * @Date: 2022-06-20 21:58:21
 * @LastEditTime: 2022-06-20 22:03:10
 * @LastEditors: msc
 * @Description:
 */

import qqMusic from "qq-music-api";

export default async function handler(req, res) {
  try {
    const query = req.query;
    const aid = query.aid;
    const result = await qqMusic.api("/album", { albummid: aid });
    res.status(200).json(result);
  } catch (e) {
    res.status(500).json(e);
  }
}
