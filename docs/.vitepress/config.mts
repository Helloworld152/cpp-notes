import { defineConfig } from 'vitepress'

export default defineConfig({
  base: '/cpp-notes/',
  title: "我的知识库",
  description: "Quant IT Notes",
  themeConfig: {
    nav: [
      { text: '首页', link: '/' }
    ],

    sidebar: [
      {
        text: 'C++',
        items: [
          { text: 'C++高性能知识', link: '/README'},
          { text: 'C++', link: '/cpp' },
          { text: 'C++量化高性能优化指南', link: '/cpp-hft' }
        ]
      },
      {
        text: 'Linux',
        items: [
          { text: 'Linux', link: '/Linux' },
          { text: 'Linux常见命令', link: '/Linux常见命令' },
          { text: 'Linux运维常见问题', link: '/Linux运维常见问题' },
          { text: '操作系统配置', link: '/操作系统配置' }
        ]
      },
      {
        text: '系统架构',
        items: [
          { text: '交易系统架构', link: '/交易系统架构' },
          { text: '高频交易系统优化指南', link: '/高频交易系统优化指南' }
        ]
      },
      {
        text: '其他',
        items: [
          { text: 'Python', link: '/Python' },
          { text: 'Git', link: '/Git' },
          { text: 'quantaxis', link: '/quantaxis' },
          { text: '开源项目搭建文档', link: '/开源项目搭建文档' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/Helloworld152/cpp-notes' }
    ]
  }
})

