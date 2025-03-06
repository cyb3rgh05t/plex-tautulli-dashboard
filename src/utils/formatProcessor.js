import { logDebug, logError } from "./logger";

export const processTemplate = (template, data) => {
  try {
    if (!template) return "";

    let result = template;
    const variables = template.match(/\{([^}]+)\}/g) || [];

    variables.forEach((variable) => {
      const key = variable.slice(1, -1); // Remove { and }
      if (data.hasOwnProperty(key)) {
        result = result.replace(variable, data[key] !== null ? data[key] : "");
      } else {
        logDebug(`Template variable not found in data: ${key}`);
      }
    });

    return result;
  } catch (error) {
    logError("Error processing template:", error);
    return template || "";
  }
};

export const formatDownloadsData = (activities, formats) => {
  try {
    if (!Array.isArray(activities)) {
      logError("Activities is not an array:", typeof activities);
      return [];
    }

    if (!Array.isArray(formats)) {
      logError("Formats is not an array:", typeof formats);
      return activities;
    }

    return activities.map((activity) => {
      const baseData = {
        uuid: activity.uuid,
        title: activity.title,
        subtitle: activity.subtitle,
        progress: activity.progress,
        type: activity.type,
      };

      const formattedData = {};
      formats.forEach((format) => {
        try {
          formattedData[format.name] = processTemplate(
            format.template,
            baseData
          );
        } catch (formatError) {
          logError(`Error applying format ${format.name}:`, formatError);
          formattedData[format.name] = "";
        }
      });

      return {
        ...baseData,
        formatted: formattedData,
      };
    });
  } catch (error) {
    logError("Error formatting downloads data:", error);
    return activities || [];
  }
};
