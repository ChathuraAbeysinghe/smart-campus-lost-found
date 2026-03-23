const items = [];

export const getFallbackItems = () => items;

export const addFallbackItem = (item) => {
  items.push(item);
  return item;
};
