/*
 * @Author: msc
 * @Date: 2022-05-02 16:32:17
 * @LastEditTime: 2022-06-23 10:35:18
 * @LastEditors: msc
 * @Description: 界面的header
 */

import React, { useState, useEffect } from "react";
import { useRecoilState, useSetRecoilState } from "recoil"
import { keyWordsState, musicListState } from "../../store"
import { SearchOutlined, UnorderedListOutlined } from "@ant-design/icons";
import API from "../../util/request";
import { musicFormatter } from "../../util/music";

export default function MusicHomeHeader() {

  const [searchStr, setSearchStr] = useState("许嵩");
  const setkeyWords = useSetRecoilState(keyWordsState);
  const setMusicList = useSetRecoilState(musicListState);


  const handleSearchMusics = () => {
    if (searchStr.length !== 0) {
      console.log(searchStr);
      setkeyWords(searchStr);
    }
  };


  return (
    <div className="w-full h-full p-1">

      <div className="grid grid-cols-8 gap-1">

        <div className="flex justify-center items-center">
          <UnorderedListOutlined style={{ fontSize: "1.2rem" }} />
        </div>
        <div className="col-span-6">
          <input
            className="w-full h-8 rounded-lg border border-solid border-slate-400 pl-2"
            type="text"
            placeholder="许嵩"
            onChange={(e) => {
              setSearchStr(e.target.value)
            }}
            onKeyDown={e => {
              if (e.code === "Enter") {
                handleSearchMusics();
              }
            }}
          />
        </div>

        <div className="flex justify-center items-center">
          <SearchOutlined style={{ fontSize: "1.2rem" }} onClick={handleSearchMusics} />
        </div>
      </div>
    </div>
  );
}
