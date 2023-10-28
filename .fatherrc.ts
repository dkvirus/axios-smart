import { defineConfig } from 'father';

export default defineConfig({
  esm: {},
  // 以下为 umd 配置项启用时的默认值，有自定义需求时才需配置
  umd: {
    entry: 'src/index', // 默认构建入口文件
  },
});
