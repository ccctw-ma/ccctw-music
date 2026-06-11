/**
 * @Author: msc
 * @Date: 2022-06-21 14:21:14
 * @LastEditTime: 2022-06-22 16:25:43
 * @LastEditors: msc
 * @Description:
 */

import { timeStampFormatter } from "./time";

export const commnetFormatter = (comments, type) => {
  //   debugger;
  // console.log(comments, type);
  if (!comments || comments.length === 0) return [];
  let res = [];
  if (type === "netease") {
    res = comments.map((c) => {
      let o = {};
      o._commentId = c.commentId;
      o._content = c.content;
      o._praiseCount = c.likedCount;
      o._timeStamp = c.time;
      o._time = timeStampFormatter(c.time);
      o._avatarUrl = c.user?.avatarUrl;
      o._nickName = c.user?.nickname;
      return {
        ...o,
        raw: c,
      };
    });
  } else if (type === "qq") {
    res = comments.map((c) => {
      let o = {};
      o._commentId = c.commentid;
      o._content = c.rootcommentcontent;
      o._praiseCount = c.praisenum;
      o._timeStamp = c.time * 1000;
      o._time = timeStampFormatter(c.time * 1000);
      o._avatarUrl = c.avatarurl;
      o._nickName = c.nick;
      return {
        ...o,
        raw: c,
      };
    });
  } else if (type === "migu") {
  } else {
  }
  return res;
};
