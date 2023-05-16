/**
 * @Author: msc
 * @Date: 2022-06-20 21:33:21
 * @LastEditTime: 2022-06-20 22:01:00
 * @LastEditors: msc
 * @Description:
 */

import qqMusic from "qq-music-api";

export default async function handler(req, res) {
  try {
    const query = req.query;

    const url = query.url;

    
    // console.log(req.body);
    // let data = await qqMusic.api("search", { key: "周杰伦" });
    // console.log(data);

    res.status(200).json({ data });
  } catch (e) {
    res.status(500).json({ e });
  }
}
