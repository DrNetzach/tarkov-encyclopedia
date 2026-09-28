[![License: CC BY-NC-SA 4.0](https://img.shields.io/badge/License-CC_BY--NC--SA_4.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)

# 逃离塔科夫百科

> **七卷结构化数据参考 —— 写给玩家，也写给 AI 智能体。**

**v2.1 ｜ 2026-09-25 ｜ 游戏版本基准：1.1.5.0**

**🌐 在线阅读**：https://tarkov-encyclopedia-site.pages.dev/
**📚 配套手册**：https://tarkov-pve-guide.pages.dev/ —— 13 章 PVE 萌新教程

---

## 这是什么

一套面向中文玩家的《逃离塔科夫》结构化资料库，共七卷。

和"任务在哪做"式的查询工具不同，这里的每一条都尽量**追溯到一手来源**（官方 Wiki、tarkov.dev、官方 lore 叙述、RAID 短片），**存疑的内容明确标注**，而不是含糊过去。

**和配套手册的分工**：

| | 定位 | 回答的问题 |
|---|---|---|
| [PVE 萌新手册](https://tarkov-pve-guide.pages.dev/) | 教程向 | **怎么玩** —— 上手流程、配装、避坑 |
| **本百科** | 资料向 | **是什么** —— 设定、派系、商人、Boss、地图、词条、剧情 |

## 七卷目录

| 卷 | 内容 |
|---|---|
| [卷一 · 世界历史与背景](docs/tarkov-encyclopedia-01-history_zh.md) | Norvinsk 特区、TerraGroup、合同战争时间线、Russia 2028 宇宙 |
| [卷二 · 派系势力](docs/tarkov-encyclopedia-02-factions_zh.md) | USEC / BEAR / Scavs / Raiders / Rogues / 教派 / 三狗 / Black Division |
| [卷三 · 商人档案](docs/tarkov-encyclopedia-03-traders_zh.md) | 九商人全档案、忠诚度机制、关系网络 |
| [卷四 · Boss 图鉴](docs/tarkov-encyclopedia-04-bosses_zh.md) | 全 Boss 数值、刷新与战术 |
| [卷五 · 地图全档案](docs/tarkov-encyclopedia-05-maps_zh.md) | 13 个地点详档 + 中转系统全表 |
| [卷六 · 词条与附录](docs/tarkov-encyclopedia-06-appendix_zh.md) | 经济、术语表、社区俗称对照、引用说明与未决项 |
| [卷七 · 关键剧情人物与主线](docs/tarkov-encyclopedia-07-story_zh.md) | 1.0 主线结构、Kerman 与克鲁格洛夫、四大结局 |

## 数据口径

- **静态事实**（历史、派系、世界观）对照一手来源逐条核验
- **动态数值**（Boss 刷新率、市场价格、撤离点细则）随赛季变动，引用时以游戏内与 [tarkov.dev](https://tarkov.dev) 实时数据为准
- **存疑与未核内容**集中标注在[卷六](docs/tarkov-encyclopedia-06-appendix_zh.md)的"已知未决项"清单，引用建议回避或挂"存疑"注
- 术语检索以官方名 / 英文名为锚点，社区俗称（大妈、机哥、三狗、小鹿……）对照见卷六

## 本地预览

```bash
pip install -r requirements.txt
mkdocs serve
```

然后打开 http://localhost:8000

## 贡献

发现问题（数值过期、事实错误、表述不清）欢迎提 [Issue](https://github.com/DrNetzach/tarkov-encyclopedia/issues) 或 Pull Request。

提数值类问题时请**标注游戏版本号**，方便核对。

## 许可协议

[CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh-Hans) —— 欢迎自由转载、翻译、改编（请署名并保留相同协议），但**禁止商业性使用**。

---

**维护者**：[DrNetzach](https://github.com/DrNetzach)
**最后更新**：2026 年 9 月
