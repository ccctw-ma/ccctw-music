/*
 * @Author: msc
 * @Date: 2022-06-19 17:15:48
 * @LastEditTime: 2022-06-22 16:25:59
 * @LastEditors: msc
 * @Description: 
 */

import React, { useEffect, useState, useRef } from 'react';
import { useRecoilValue } from 'recoil';
import { curMusicState } from '../../store';
import API from "../../util/request";
import { ArrowLeftOutlined, LikeOutlined } from "@ant-design/icons";
import { timeStampFormatter } from '../../util/time';
import { commnetFormatter } from '../../util/comment';

export default function MusicDetailComment({ setShowComment }) {


    const curMusic = useRecoilValue(curMusicState);
    const [pageNo, setPageNo] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [commentList, setcommentList] = useState([]);
    const commentListRef = useRef(null);
    const [loaded, setLoaded] = useState(false);
    const [maxPageNo, setMaxPageNO] = useState(1);
    const commentIdSet = useRef(null);
    // console.log(curMusic);

    // 评论初试化
    useEffect(() => {
        (async () => {
            if (curMusic._from === "netease") {
                const commentData = await API.GET(`/api/${curMusic._from}/comment?id=${curMusic._id}&pageNo=${pageNo}`);
                // console.log("初始化评论", commentData);
                if (commentData.status === 200) {
                    const commentBody = commentData.body.data;
                    const comments = commnetFormatter(commentBody?.comments || [], curMusic._from);
                    console.log(comments);
                    setcommentList(comments);
                    commentIdSet.current = new Set();
                    comments.forEach(c => {
                        commentIdSet.current.add(c.commentId);
                    })
                    setTotalCount(commentBody?.totalCount);
                    setMaxPageNO(Math.ceil(commentBody?.totalCount / 20));
                    setLoaded(true);
                }
            } else if (curMusic._from === "qq") {

                const commentData = await API.GET(`/api/${curMusic._from}/comments?id=${curMusic._id}&pageNo=${pageNo}&type=0`);
                if (commentData.status === 200) {

                    const commentBody = commentData.body.comment;
                    const hotCommentBody = commentData.body.hotComment;
                    setTotalCount(commentBody?.commenttotal);
                    // console.log(commentBody?.commentlist);
                    const comments = commnetFormatter(hotCommentBody?.commentlist || [], curMusic._from);
                    // console.log(comments);
                    setcommentList(comments);
                    setMaxPageNO(Math.ceil(commentBody?.commenttotal / 20));
                    setLoaded(true);
                }
            } else if (curMusic._from === "migu") {
                // 咪咕音乐默认是没有评论的，所以就不显示评论
                setcommentList([]);
                setTotalCount(0);
                setMaxPageNO(0);
            } else {

            }
        })();
    }, [curMusic])

    //评论滑到底的时候加载新的评论 
    useEffect(() => {
        (async () => {
            if (pageNo > 1) {
                if (curMusic._from === 'netease') {
                    const appendCommentData = await API.GET(`/api/${curMusic._from}/comment?id=${curMusic._id}&pageNo=${pageNo}`);
                    console.log("----------------------->append data");
                    console.log(pageNo);
                    // console.log(appendCommentData);
                    if (appendCommentData.status === 200) {
                        const appnedComments = appendCommentData.body?.data?.comments || [];
                        // console.log(appnedComments);
                        let availableComments = [];
                        appnedComments.forEach(c => {
                            if (!commentIdSet.current.has(c.commentId)) {
                                availableComments.push(c);
                                commentIdSet.current.add(c.commentId);
                            }

                        })
                        availableComments = commnetFormatter(availableComments, curMusic._from);
                        const newCommentList = [...commentList, ...availableComments];
                        setcommentList(newCommentList);
                    }
                    setLoaded(true);
                } else if (curMusic._from === 'qq') {
                    console.log(pageNo);
                    const appendCommentData = await API.GET(`/api/${curMusic._from}/comments?id=${curMusic._id}&pageNo=${pageNo}&type=0`);
                    if (appendCommentData.status === 200) {
                        const appnedCommentBody = appendCommentData.body.comment;
                        // console.log(appnedCommentBody);
                        const comments = commnetFormatter(appnedCommentBody?.commentlist || [], curMusic._from);
                        // console.log(comments);
                        setcommentList([...commentList, ...comments]);
                    }
                    setLoaded(true);
                }

            }
        })()
    }, [pageNo])

    const throttle = (fn, delay = 200) => {
        let canRun = true;
        return function (...args) {
            if (!canRun) return;
            canRun = false;
            setTimeout(() => {
                fn.apply(this, arguments)
                canRun = true;
            }, delay)
        }
    }
    const handleScroll = (e) => {
        // console.log(e);
        if (!loaded || commentList.length === 0) return;
        console.log("捕获到滚动事件");
        // let set = new Set();
        // commentList.forEach(c => {
        //     set.add(c);
        // })
        // console.log(commentList.length, set.size);
        // console.log(commentList);
        const dom = commentListRef.current;
        // console.log(commentListRef);
        // console.log(dom.offsetHeight);
        // console.log(dom.scrollTop);
        if (dom.offsetHeight + dom.scrollTop >= dom.scrollHeight) {
            console.log('到达底部, 获取新的评论');
            // setcommentList([...commentList, ...commentList])
            let nextPageNo = Math.min(pageNo + 1, maxPageNo);
            console.log(nextPageNo);
            setPageNo(nextPageNo);
            if (nextPageNo <= maxPageNo) {
                setLoaded(false)
            }
        }
    }

    return (
        <div className='relative flex flex-col w-full h-full px-4 pt-2'>
            <div className='flex flex-row  space-x-4'
                onClick={() => setShowComment(false)}
            >
                <ArrowLeftOutlined
                    style={{
                        color: "black",
                        fontSize: "1rem",
                        lineHeight: "1.5rem",
                        verticalAlign: "middle",
                        fontWeight: "600",
                        marginTop: "-1px"
                    }}
                />

                <span className='inline-block text-black text-base align-middle font-semibold'>
                    评论({totalCount})
                </span>

            </div>
            <div className='flex-1 flex flex-col w-full h-full overflow-scroll mt-4'
                ref={commentListRef}
                onScroll={throttle(handleScroll)}
            >
                {commentList.map(c => {
                    return (
                        <div key={c._commentId} className='relative w-full'>
                            <div className='flex flex-row w-full'>
                                <img src={c._avatarUrl || ""} alt="头像"
                                    className='block w-10 h-10 rounded-full object-cover object-center'
                                />
                                <div className='flex flex-row w-full h-10 pl-3 justify-between items-center'>
                                    <div className='flex flex-col'>
                                        <span className='text-base text-gray-600 font-bold'>
                                            {c._nickName || "已注销"}
                                        </span>
                                        <span className='text-xs'>
                                            {c._time}
                                        </span>
                                    </div>
                                    <div className='flex justify-center items-center'>
                                        <div className='text-black mr-1'>
                                            {c._praiseCount}
                                        </div>
                                        <LikeOutlined
                                            style={{
                                                color: "black",
                                                fontSize: "1rem"
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className='flex flex-row w-full justify-start items-center mt-4 mb-4 text-sm text-black font-[500] leading-6'>
                                {c._content}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )


}
