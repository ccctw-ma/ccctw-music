/*
 * @Author: msc
 * @Date: 2022-06-12 21:27:01
 * @LastEditTime: 2022-06-13 16:41:06
 * @LastEditors: msc
 * @Description: 
 */
import styles from "../../styles/App.module.css";
import Header from "./MusicHomeHeader";
import MainContent from "./MusicHomeContent";
import HomeMusicPlay from "./MusicHomePlayer";

export default function MusicHome({ setIsHome, musicPlayer }) {

    return (
        <div className="container h-screen">
            <div className="absolute top-0 left-0 w-full h-12 py-2">
                <Header />
            </div>

            <div className={`${styles.content} flex flex-col`}>
                <MainContent />
            </div>

            <div className="absolute bottom-0 left-0 h-14 w-full border-t-[1px] border-gray-200 border-solid">
                <HomeMusicPlay setIsHome={setIsHome} musicPlayer={musicPlayer} />
            </div>
        </div>
    );
}
