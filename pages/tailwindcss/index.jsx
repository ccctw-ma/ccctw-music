/*
 * @Author: msc
 * @Date: 2022-04-15 21:07:59
 * @LastEditTime: 2022-05-02 18:05:43
 * @LastEditors: msc
 * @Description:
 */

import React from "react";
import Head from "next/head";
import Link from "next/link";
// import Layout from "../../components/layout";

export default function TailWindCss() {
  return (
    <div className="container mx-auto">
      <div className=" columns-2 hover:columns-3 md:columns-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((e) => {
          return <div key={e}>Hello + {e}</div>;
        })}
      </div>

      <div class="columns-2">
        <p>Well, let me tell you something, ...</p>
        <p class="break-after-column">Sure, go ahead, laugh...</p>
        <p>Maybe we can live without...</p>
        <p>Look. If you think this is...</p>
      </div>
      <br />
      <h1 className="font-bold">box decoration break</h1>

      <span class="box-decoration-slice bg-gradient-to-r from-indigo-600 to-pink-500 text-white px-2 ...">
        Hello
        <br />
        World
      </span>
      <br />
      <span class="box-decoration-clone bg-gradient-to-r from-indigo-600 to-pink-500 text-white px-2 ...">
        Hello
        <br />
        World
      </span>
      <br />

      <h1 className="font-bold">Box Sizing</h1>

      <br />

      <div className="box-border hover:box-content h-32 w-32 p-4 border-4 bg-blue-400"></div>

      <div className=" visible">
        When controlling the flow of text, using the CSS property
        <span className="inline">display: inline</span>
        will cause the text inside the element to wrap normally. While using the
        property <span class="inline-block">display: inline-block</span>
        will wrap the element to prevent the text inside from extending beyond
        its parent. Lastly, using the property{" "}
        <span className="block">display: block</span>
        will put the element on its own line and fill its parent.
      </div>

      <div className="flex flex-row">
        <div className="basis-1/4 hover:basis-1/2">01</div>
        <div className="basis-1/4">02</div>
        <div className="basis-1/2 ">03</div>
      </div>

      <div className=" grid grid-cols-4 gap-4 hover:grid-cols-3">
        {
            Array.from({length:10}).map((_,index)=>{
                return (
                    <div key={index}>
                        Hello {index + 1}
                    </div>
                )
            })
        }
      </div>
    </div>
  );
}
