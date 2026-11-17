module.exports = function (api) {
  api.cache(true);
  // babel-preset-expo در SDK 58 پلاگین‌های worklets و reanimated را
  // به‌طور خودکار تزریق می‌کند؛ افزودن دستی باعث Duplicate plugin می‌شود.
  return {
    presets: ["babel-preset-expo"],
  };
};
