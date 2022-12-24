import Head from "next/head";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { trpc } from "../utils/trpc";
import { toast, Toaster } from "react-hot-toast";
import { useDebouncer } from "../utils/debouncerHook";
import { Show } from "../../typings";
import Spinner from "../components/Spinner";
import ReactPlayer from "react-player";

const Home = () => {
  const [text, setText] = useState("");
  const [isDrama, setIsDrama] = useState(false);
  const [url, setUrl] = useState("");
  const [shows, setShows] = useState<Show[]>([]);
  const [episodes, setEpisodes] = useState<Show[]>([]);
  const [hasWindow, setHasWindow] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const postsPerPage = 100;
  const title = useRef("");

  const headers = {
    origin: "https://gogohd.net/",
    referer: "https://gogohd.net/",
  };

  // pagination related
  const lastPostIndex = currentPage * postsPerPage;
  const firstPostIndex = lastPostIndex - postsPerPage;
  const totalPage = useRef(0);

  // trpc queries
  const searchQuery = trpc.fetcher.search.useMutation({ retry: 3 });
  const episodesQuery = trpc.fetcher.episodes.useMutation({ retry: 3 });
  const episodeQuery = trpc.fetcher.episode.useMutation({ retry: 3 });

  const debounceText = useDebouncer(text);
  useEffect(() => {
    if (debounceText === "") {
      return;
    }
    searchQuery.reset();
    episodesQuery.reset();
    episodeQuery.reset();
    setEpisodes([]);
    setShows([]);
    const fetchShows = async () => {
      try {
        const videos = await searchQuery.mutateAsync({
          text: debounceText,
          type: isDrama ? "drama" : "anime",
        });
        setShows(videos.data);
      } catch {
        toast.error("Error");
      }
    };
    fetchShows();
  }, [debounceText]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setHasWindow(true);
    }
  }, []);
  return (
    <>
      <Toaster position="bottom-center" />
      <Head>
        <title>T3 Watch</title>
        <meta name="description" content="Generated by create-t3-app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="mx-auto min-h-screen max-w-sm space-y-4 p-6 md:max-w-2xl lg:max-w-4xl">
        <p className="text-5xl font-bold">
          <span className="text-indigo-600">T3</span> Watch
        </p>

        {/* searchbar */}
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full border-b-2 border-indigo-600 bg-transparent py-1 placeholder-slate-400 outline-none"
          type="text"
          placeholder="Search Drama"
        />

        {/* checkbox */}
        <div className="flex gap-8">
          <button
            onClick={() => setIsDrama(false)}
            className={`${
              !isDrama &&
              "underline decoration-indigo-600 decoration-2 underline-offset-4"
            }`}
          >
            Anime
          </button>
          <button
            onClick={() => setIsDrama(true)}
            className={`${
              isDrama &&
              "underline decoration-indigo-600 decoration-2 underline-offset-4"
            }`}
          >
            Korean Drama
          </button>
        </div>

        {/* video player */}
        {episodeQuery.isLoading && <Spinner />}
        {episodeQuery.isError && <p>Error</p>}
        {hasWindow && url && (
          <section className="space-y-2">
            <p className="text-lg">{title.current}</p>
            <ReactPlayer
              config={{
                file: {
                  attributes: {
                    headers: isDrama ? {} : headers,
                  },
                },
              }}
              width="100%"
              height="auto"
              controls
              url={url}
            />
          </section>
        )}

        {/* episodes */}
        {episodesQuery.isLoading && <Spinner />}
        {episodesQuery.isError && <p>Error</p>}
        {episodeQuery.isSuccess && episodes.length === 0 && (
          <p>No episode out yet.</p>
        )}
        {episodes.length !== 0 && (
          <section className="episode-grid">
            {episodes.slice(firstPostIndex, lastPostIndex).map((episode, i) => (
              <button
                key={i}
                className="rounded-md bg-slate-800 p-2 text-xs transition-transform duration-200 ease-out hover:scale-110"
                onClick={async () => {
                  try {
                    const url = await episodeQuery.mutateAsync({
                      path: episode.path,
                      type: isDrama ? "drama" : "anime",
                    });
                    title.current = isDrama
                      ? episode.name
                      : title.current +
                        " Episode " +
                        episode.name.split(" ").at(-1);
                    setUrl(url.data ?? "");
                  } catch {
                    toast.error("Error");
                  }
                }}
              >
                EP {episode.name.split(" ").at(-1)}
              </button>
            ))}
          </section>
        )}

        {/* pagination */}
        {episodes.length !== 0 && totalPage.current > 1 && (
          <section className="flex justify-center gap-4">
            {Array.from({ length: totalPage.current }).map((_, i) => (
              <button
                key={i}
                className="h-6 w-6 rounded-md bg-slate-800"
                onClick={() => setCurrentPage(i + 1)}
              >
                {i + 1}
              </button>
            ))}
          </section>
        )}

        {/* shows */}
        {searchQuery.isLoading && <Spinner />}
        {searchQuery.isError && <p>Error</p>}
        {searchQuery.isSuccess && shows.length === 0 && <p>No shows found.</p>}
        {shows.length !== 0 && (
          <section className="video-grid">
            {shows.map((show, i) => (
              <div
                key={i}
                className="cursor-pointer space-y-2 transition-transform duration-200 ease-out hover:scale-105"
                onClick={async () => {
                  try {
                    const videos = await episodesQuery.mutateAsync({
                      path: show.path,
                      type: isDrama ? "drama" : "anime",
                    });
                    title.current = show.name;
                    totalPage.current = Math.ceil(
                      videos.data.length / postsPerPage
                    );
                    setEpisodes(videos.data);
                  } catch {
                    toast.error("Error");
                  }
                }}
              >
                {show.img && (
                  <Image
                    className="h-36 w-full object-cover"
                    src={show.img}
                    width={400}
                    height={800}
                    alt="banner"
                  />
                )}
                <p className="text-xs">{show.name}</p>
              </div>
            ))}
          </section>
        )}
      </main>
    </>
  );
};

export default Home;
