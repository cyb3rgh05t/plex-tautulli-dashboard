import React from "react";
import { useQuery } from "react-query";
import { useConfig } from "../../context/ConfigContext";
import { logError } from "../../utils/logger";
import * as Icons from "lucide-react";

const ActivityBadge = ({ type }) => {
  // Map activity types to their visual styles
  const styles = {
    download: {
      icon: Icons.Download,
      bg: "bg-brand-primary-500/10",
      text: "text-brand-primary-400",
      border: "border-brand-primary-500/20",
      label: "Download",
    },
    transcode: {
      icon: Icons.Play,
      bg: "bg-green-500/10",
      text: "text-green-400",
      border: "border-green-500/20",
      label: "Transcode",
    },
    stream: {
      icon: Icons.Play,
      bg: "bg-purple-500/10",
      text: "text-purple-400",
      border: "border-purple-500/20",
      label: "Stream",
    },
    pause: {
      icon: Icons.Pause,
      bg: "bg-yellow-500/10",
      text: "text-yellow-400",
      border: "border-yellow-500/20",
      label: "Paused",
    },
  };

  const style = styles[type.toLowerCase()] || styles.download;
  const Icon = style.icon;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border
        ${style.bg} ${style.text} ${style.border}`}
    >
      <Icon size={14} />
      <span className="text-xs font-medium">{style.label}</span>
    </div>
  );
};

const ProgressBar = ({ progress }) => {
  const percent = Math.min(progress, 100);

  return (
    <div className="space-y-1">
      <div className="h-2 bg-gray-800/50 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-brand-primary-500 to-brand-primary-400 
            rounded-full transition-all duration-300 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="flex justify-end">
        <span className="text-xs font-medium text-gray-400">
          {percent.toFixed(1)}%
        </span>
      </div>
    </div>
  );
};

const ActivityItem = ({ activity }) => {
  return (
    <div
      className="group bg-gray-800/30 hover:bg-gray-800/50 border border-gray-700/50 
      rounded-xl p-4 transition-all duration-200"
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 flex-1 min-w-0">
            <h3 className="text-white font-medium truncate">
              {activity.subtitle}
            </h3>
            <p className="text-gray-400 text-sm truncate">{activity.title}</p>
          </div>
          <ActivityBadge type={activity.type} />
        </div>

        <ProgressBar progress={activity.progress} />

        {activity.formatted &&
          Object.entries(activity.formatted).length > 0 && (
            <div className="pt-3 mt-3 border-t border-gray-700/50">
              <p className="text-xs font-medium text-gray-500 mb-2">
                Custom Formats
              </p>
              <div className="space-y-1.5">
                {Object.entries(activity.formatted).map(([name, value]) => (
                  <div key={name} className="flex items-start text-sm">
                    <span className="text-gray-400 font-medium min-w-[120px] mr-2">
                      {name}:
                    </span>
                    <span className="text-gray-300">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
      </div>
    </div>
  );
};

const LoadingItem = () => (
  <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/50 animate-pulse">
    <div className="space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <div className="h-5 bg-gray-700/50 rounded w-2/3" />
          <div className="h-4 bg-gray-700/50 rounded w-1/2" />
        </div>
        <div className="h-6 w-24 bg-gray-700/50 rounded-full" />
      </div>
      <div className="h-2 bg-gray-700/50 rounded-full" />
    </div>
  </div>
);

const PlexActivity = () => {
  const { config } = useConfig();

  const {
    data: activities,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery(
    ["plexActivities", config.plexToken],
    async () => {
      const response = await fetch("http://localhost:3006/api/downloads");
      const data = await response.json();
      if (data.error) throw new Error(data.message || data.error);
      return data.activities;
    },
    {
      refetchInterval: 15000,
      enabled: !!config.plexToken,
    }
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Plex Activities
          </h2>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-800/50 rounded-lg border border-gray-700/50">
              <Icons.Download size={14} className="text-brand-primary-400" />
              <span className="text-gray-400 text-sm">
                {activities?.length || 0} Active
              </span>
            </div>
            {isFetching && !isLoading && (
              <span className="text-xs text-gray-500">Refreshing...</span>
            )}
          </div>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className={`px-4 py-2 rounded-lg bg-brand-primary-500/10 text-brand-primary-400 
            border border-brand-primary-500/20 hover:bg-brand-primary-500/20 
            transition-all duration-200 flex items-center gap-2
            disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <Icons.RefreshCw
            size={16}
            className={`${isFetching ? "animate-spin" : ""}`}
          />
          {isFetching ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <>
            <LoadingItem />
            <LoadingItem />
            <LoadingItem />
          </>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
            <p className="text-red-400">Failed to load Plex activities</p>
          </div>
        ) : !activities?.length ? (
          <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-8 text-center">
            <Icons.Download size={24} className="text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400">No active downloads</p>
          </div>
        ) : (
          activities.map((activity) => (
            <ActivityItem key={activity.uuid} activity={activity} />
          ))
        )}
      </div>
    </div>
  );
};

export default PlexActivity;
