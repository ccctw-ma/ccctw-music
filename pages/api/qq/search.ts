/**
 * @Author: msc
 * @Date: 2022-06-20 17:39:24
 * @LastEditTime: 2022-06-20 21:56:49
 * @LastEditors: msc
 * @Description:
 */

import qqRequest from "../../../util/qqRequest";
import qqMusic from "qq-music-api";

export default async function handler(req, res) {
  try {
    const query = req.query;
    const pageNo = query.pageNo || 1;
    const pageSize = 50;
    const key = query.key;
    const t = 0; // 单曲
    let total = 0;
    if (!key) {
      throw "不能没有关键词";
    }
    console.log(key);
    const result = await qqMusic.api("/search", { key, pageNo, pageSize, t });
    // console.log(result);
    res.status(200).json({ result });
  } catch (e) {
    console.log(e);
    res.status(500).json({ e });
  }
}
