export const processTemplate = (template, data) => {
  let result = template;
  const variables = template.match(/\{([^}]+)\}/g) || [];

  variables.forEach((variable) => {
    const key = variable.slice(1, -1); // Remove { and }
    if (data.hasOwnProperty(key)) {
      result = result.replace(variable, data[key]);
    }
  });

  return result;
};

export const formatDownloadsData = (activities, formats) => {
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
      formattedData[format.name] = processTemplate(format.template, baseData);
    });

    return {
      ...baseData,
      formatted: formattedData,
    };
  });
};
