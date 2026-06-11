/**
 * @Author: msc
 * @Date: 2022-06-20 22:03:24
 * @LastEditTime: 2022-06-20 22:05:38
 * @LastEditors: msc
 * @Description:
 */
import qqMusic from "qq-music-api";

export default async function handler(req, res) {
  try {
    const id = req.query.id;
    if (!id) {
      throw "id呢";
    }
    const result = await qqMusic.api("/song/urls", { id: id });
    res.status(200).json(result);
  } catch (e) {
    res.status(500).json(e);
  }
}
