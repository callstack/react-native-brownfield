export const getRandomValue = () => Math.round(Math.random() * 255);
export const getRandomTheme = () => {
  const primary = [getRandomValue(), getRandomValue(), getRandomValue()];
  const secondary = [
    255 - (primary?.[0] || 0),
    255 - (primary?.[1] || 0),
    255 - (primary?.[2] || 0),
  ];

  return {
    primary: `rgb(${primary[0]}, ${primary[1]}, ${primary[2]})`,
    secondary: `rgb(${secondary[0]}, ${secondary[1]}, ${secondary[2]})`,
  };
};
