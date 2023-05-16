/*
 * @Author: msc
 * @Date: 2022-05-23 10:05:24
 * @LastEditTime: 2022-06-13 23:53:08
 * @LastEditors: msc
 * @Description: 
 */
import React, { useRef, useState, useEffect } from 'react'

export default function HeaderSongName({ songName, singerName }) {

    const songNameDom1 = useRef(null);
    const songNameDom2 = useRef(null);
    const [songNameOverflow, setsongNameOverflow] = useState(false);
    const keyFrame1 = useRef();
    const keyFrame2 = useRef();


    // 判断歌曲名称是否溢出
    // useEffect(() => {
    //     console.log("srcollwidth", songNameDom1.current.scrollWidth);
    //     console.log("offsetwidth", songNameDom1.current.offsetWidth);
    //     if (songNameDom1.current.scrollWidth > songNameDom1.current.offsetWidth) {
    //         console.log("the width of this song'name is overflow");
    //         setsongNameOverflow(true);
    //     }else{
    //         setsongNameOverflow(false);
    //     }
    // }, [songName])

    //如果发生里溢出，对歌名进行处理生成动画
    useEffect(() => {
        //是溢出的状态
        console.log("进入歌名是否溢出useEffect");
        console.log("srcollwidth", songNameDom1.current.scrollWidth);
        console.log("offsetwidth", songNameDom1.current.offsetWidth);
        let overflow;
        if (songNameDom1.current.scrollWidth > songNameDom1.current.offsetWidth) {
            console.log("the width of this song'name is overflow");
            overflow = true;
        }else{
            overflow = false;
        }
        // console.log(overflow);
        setsongNameOverflow(overflow);
        if (overflow) {
            const sheet = document.styleSheets[0];
            // 清空原来有的添加的动画帧
            while(true){
                let frameName = sheet.cssRules[0].name;
                // console.log(frameName);
                if(frameName === 'songNameMove1' || frameName === 'songNameMove2'){
                    // console.log(sheet.cssRules[0].cssText);
                    sheet.deleteRule(0);   
                }else{
                    break;
                }
            }
            const actualLength = songNameDom1.current.scrollWidth;
            const songNameAvailbleWidth = document.body.clientWidth / 2;
            const appendLength = Math.max(actualLength / 15, 50);
            const translateLength = actualLength + appendLength;

            // console.log("offsetWidth", songNameDom1.current.offsetWidth);
            // console.log("scrollWidth", songNameDom1.current.scrollWidth);
            // console.log("translateLength", translateLength);
            const translateKeyFrames1 = "@keyframes songNameMove1" +
                "{" +
                `0% {
                        transform: translateX(0px);
                    }
                    100%{
                        transform: translateX(${-translateLength}px);
                    }`
                + "}";
            const translateKeyFrames2 = "@keyframes songNameMove2" +
                "{" +
                `0% {
                    transform : translateX(${translateLength}px);
                }
                100%{
                    transform : translateX(${-translateLength}px);
                }`
                + "}"
            if ("insertRule" in document.styleSheets[0]) {
                sheet.insertRule(translateKeyFrames1);
                sheet.insertRule(translateKeyFrames2);
            } else if ("addRule" in document.styleSheets[0]) {
                sheet.addRule(translateKeyFrames1);
                sheet.addRule(translateKeyFrames2);
            }

            // 这一步的原因是让dom1 和 dom2 保持一样的位置， 这样在translate的时候就能保持一致
            songNameDom2.current.style.left = `${- songNameAvailbleWidth}px`;
            songNameDom1.current.style.animation = "8s linear 0s 1 normal none songNameMove1, 16s linear 8s infinite normal none songNameMove2";
            songNameDom2.current.style.animation = "16s linear 0s infinite normal none songNameMove2";
        }else{
            songNameDom1.current.style.animation = null;
            songNameDom2.current.style.animation = null;
        }
    }, [songName]);


    return (
        <>
            <div className={`flex flex-row text-lg font-bold rounded-lg align-bottom overflow-hidden`}>
                <span className={`block w-full whitespace-nowrap ${!songNameOverflow && 'flex flex-row justify-center items-center'}`}
                    ref={songNameDom1}>
                    {songName || "abcdefghijklmnopqrstuvwxyz1234567890+-"}
                </span>
                <span className={`${!songNameOverflow && 'hidden'} relative w-full whitespace-nowrap`}
                    ref={songNameDom2}>
                    {songName || "abcdefghijklmnopqrstuvwxyz1234567890+-"}
                </span>
            </div>
            <div className='flex flex-row justify-center items-center text-sm font-light'>
                {singerName || "周杰倫"}
            </div>

        </>


    )
}
