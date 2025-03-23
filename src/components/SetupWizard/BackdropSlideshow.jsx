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

        if (!moviesResponse.ok || !tvResponse.ok) {
          throw new Error("Failed to fetch backdrops");
        }

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

        if (allBackdrops.length === 0) {
          throw new Error("No valid backdrops found");
        }

        // Shuffle array
        const shuffledBackdrops = allBackdrops.sort(() => Math.random() - 0.5);
        setBackdrops(shuffledBackdrops);
      } catch (error) {
        logError("Error fetching backdrops:", error);
      } finally {
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

  // Default background when loading or no backdrops
  const defaultBackground = (
    <div className="fixed inset-0">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            radial-gradient(circle at 0% 0%, rgba(0, 112, 243, 0.1) 0px, transparent 50%),
            radial-gradient(circle at 100% 100%, rgba(82, 0, 243, 0.1) 0px, transparent 50%)
          `,
        }}
      />
    </div>
  );

  if (loading || backdrops.length === 0) {
    return defaultBackground;
  }

  const currentBackdrop = backdrops[currentIndex];
  const nextIndex = (currentIndex + 1) % backdrops.length;
  const nextBackdrop = backdrops[nextIndex];

  return (
    <div className="fixed inset-0 bg-gray-900 overflow-hidden">
      {/* Current Backdrop */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
        style={{
          backgroundImage: `url(${TMDB_IMAGE_BASE}${currentBackdrop.backdrop_path})`,
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
          backgroundImage: `
            radial-gradient(circle at 0% 0%, rgba(0, 112, 243, 0.05) 0px, transparent 50%),
            radial-gradient(circle at 100% 100%, rgba(82, 0, 243, 0.05) 0px, transparent 50%)
          `,
        }}
      />

      {/* Gradient overlays for better text readability */}
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/50 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/50 to-transparent" />
    </div>
  );
};

export default BackdropSlideshow;
