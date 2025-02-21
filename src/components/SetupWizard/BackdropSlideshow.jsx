import React, { useState, useEffect } from "react";

const BackdropSlideshow = () => {
  const [backdrops, setBackdrops] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const TMDB_API_KEY = "e7d2628727fa893ec3692d18f8a4aec2";
  const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/original";

  useEffect(() => {
    const fetchBackdrops = async () => {
      try {
        // Fetch both movies and TV shows
        const [moviesResponse, tvResponse] = await Promise.all([
          fetch(
            `https://api.themoviedb.org/3/movie/now_playing?api_key=${TMDB_API_KEY}&page=1`
          ),
          fetch(
            `https://api.themoviedb.org/3/tv/airing_today?api_key=${TMDB_API_KEY}&page=1`
          ),
        ]);

        const moviesData = await moviesResponse.json();
        const tvData = await tvResponse.json();

        // Combine and filter results
        const allBackdrops = [
          ...moviesData.results.map((item) => ({
            backdrop_path: item.backdrop_path,
            title: item.title,
            type: "movie",
          })),
          ...tvData.results.map((item) => ({
            backdrop_path: item.backdrop_path,
            title: item.name,
            type: "tv",
          })),
        ].filter((item) => item.backdrop_path);

        // Shuffle array
        const shuffledBackdrops = allBackdrops.sort(() => Math.random() - 0.5);
        setBackdrops(shuffledBackdrops);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching backdrops:", error);
        setLoading(false);
      }
    };

    fetchBackdrops();
  }, []);

  useEffect(() => {
    if (backdrops.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % backdrops.length);
    }, 15000); // Change backdrop every 15 seconds

    return () => clearInterval(interval);
  }, [backdrops.length]);

  if (loading || backdrops.length === 0) {
    return (
      <div className="fixed inset-0 bg-gray-900 bg-[radial-gradient(at_0%_0%,rgba(0,112,243,0.1)_0px,transparent_50%),radial-gradient(at_98%_100%,rgba(82,0,243,0.1)_0px,transparent_50%)]" />
    );
  }

  const currentBackdrop = backdrops[currentIndex];
  const nextIndex = (currentIndex + 1) % backdrops.length;
  const nextBackdrop = backdrops[nextIndex];

  return (
    <div className="fixed inset-0 bg-gray-900 overflow-hidden">
      {/* Current Backdrop */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-all duration-3000 ease-in-out transform scale-105"
        style={{
          backgroundImage: `url(${TMDB_IMAGE_BASE}${currentBackdrop.backdrop_path})`,
          opacity: 1,
          animation: "zoomEffect 20s ease-in-out infinite alternate",
        }}
      >
        <div className="absolute inset-0 bg-black/60" />
      </div>

      {/* Preload next image */}
      {nextBackdrop && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-0"
          style={{
            backgroundImage: `url(${TMDB_IMAGE_BASE}${nextBackdrop.backdrop_path})`,
          }}
        />
      )}

      {/* Background Overlay */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 0% 0%, rgba(0,112,243,0.05) 0%, transparent 50%), radial-gradient(circle at 100% 100%, rgba(82,0,243,0.05) 0%, transparent 50%)",
        }}
      />

      <style jsx>{`
        @keyframes zoomEffect {
          from {
            transform: scale(1.05);
          }
          to {
            transform: scale(1.15);
          }
        }
      `}</style>
    </div>
  );
};

export default BackdropSlideshow;
