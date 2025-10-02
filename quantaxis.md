我先快速查阅项目的 README 和核心 docs，并语义搜索数据获取、回测与实盘流程的位置。随后给出结构梳理与全链路说明。
Ran tool
Ran tool
Ran tool
Ran tool
Ran tool
Ran tool
Ran tool
Ran tool

已查阅核心文档与源码入口，下面直接给出模块职能与端到端链路。

### 顶层结构速览
- `QUANTAXIS/`：Python 核心框架（数据、指标、因子、策略、账户、引擎、消息、Web、调度等）
- `qapro-rs/`：Rust 高性能子系统（数据/账户/回测/实时执行/消息）
- `docker/`：容器与编排
- `config/`：安装/更新脚本与批处理
- `doc/`、`STU/`：文档与教程
- `examples/`：示例脚本
- `README.md`：总体说明与模块清单

### 核心模块与职责
- 数据侧
  - `QAFetch/`：统一数据获取适配（TDX/Tushare/东方财富/交易所API/ClickHouse 等）
  - `QASU/`：数据入库与更新（MongoDB/ClickHouse 同步、批量更新脚本）
  - `QAData/`：标准化数据容器（股票/指数/期货/加密，重采样、复权、市值、面板结构等）
- 分析侧
  - `QAIndicator/`：技术指标库（MA/RSI/MACD 等，支持批量 apply）
  - `QAFactor/`：因子研究/因子回测/因子管理（含 `featurebacktest.py`）
  - `QAAnalysis/`：信号/板块分析工具
- 交易侧
  - `QIFI/`：统一账户系统与协议（跨市场仓位/权益/交易记录；SIM/REAL；持久化）
  - `QAMarket/`：市场预设/订单/持仓（保证金/手续费/方向与开平）
  - `QAStrategy/`：策略框架（CTA/套利/因子，多策略管理；回测/模拟/实盘统一生命周期）
- 基础设施
  - `QAEngine/`：任务引擎（多线程/异步/事件/调度）
  - `QAPubSub/`：消息发布订阅（基于 MQ，1-1/1-N/N-N 分发；数据/订单/事件总线）
  - `QAWebServer/`：Tornado Web 服务（中台 API/微服务）
  - `QASchedule/`：调度中心（基于 WebServer 的后台任务/远程调度）
  - `QAUtil/`：时间/交易日历/数据转换/参数/日志等通用工具
  - `QASetting/`：配置与执行器
  - `QACmd/`：命令行入口
- Rust 子系统（`qapro-rs/`）
  - 连接器：`qaconnector/`（Mongo/Redis/ClickHouse/RabbitMQ/Parquet）
  - 数据/结构：`qadata/`、`qadatastruct/`
  - 策略与回测：`qastrategy/`、`qafactor/`
  - 账户与协议：`qaprotocol/`（QIFI/MIFI）、`qaportfolio/`
  - 运行时：`qaruntime/`（实时重采样、订单发布、QIFI 切片存储）
  - 日志/宏/环境：`qalog/`、`qamacros/`、`qaenv/`

### 端到端全链路（两条典型路径）
- 回测链路（历史数据 → 信号 → 交易 → 绩效）
  1) 数据：`QAFetch` 拉取 → `QASU` 入库（Mongo/ClickHouse）
  2) 加工：`QAData` 载入结构化数据（重采样/复权/面板）
  3) 指标/因子：`QAIndicator`、`QAFactor` 生成特征与信号
  4) 策略：`QAStrategy` 按 `on_bar/on_tick` 消费数据流
  5) 账户：`QIFI` 仿真账户撮合/计费/权益/持仓
  6) 分析：`QAAnalysis` 与风险评估，结果持久化与可视化
  7) 高性能选项：同链路可由 `qapro-rs` 回测器执行（更快的迭代与I/O）
- 实盘/模拟链路（行情 → 策略 → 订单 → 经纪商/网关 → 回写账户）
  1) 行情：数据源/撮合网关 → `QAPubSub` 推流（或 Rust 实时重采样）
  2) 策略：`QAStrategy` 订阅行情，生成订单
  3) 下单：通过 `QAPubSub`/OMS → 经纪商接口/交易网关（CTP/QMT/交易所API）
  4) 回报：成交/持仓/资金回写至 `QIFI`，落库（Mongo/ClickHouse）
  5) 服务化：`QAWebServer` 提供查询与操作 API，`QASchedule` 负责任务编排
  6) 运行时：`QAEngine` 管理并行/异步任务，`QAUtil/QASetting` 提供通用支撑
  7) Rust 实时：`qapro-rs` 的 `Monitor` 将 K 线切片、订单发布与 QIFI 切片持久化

### 部署与运维
- 容器：`docker/qa-service*`、`qa-jupyter*`、`qa-web-rust2` 等镜像与编排
- 脚本：`config/*.sh/*.py` 一键安装、更新与数据同步
- 教程：`STU/` 分阶段说明；`examples/` 直接可运行示例

### 关键协议与数据格式
- `QIFI`：账户/订单/成交/持仓/权益的统一结构，解耦策略与账户实现；跨 Python/Rust/CPP 同构
- 存储：MongoDB（账户/历史切片/配置）、ClickHouse（行情/特征/明细高吞吐）

### 常用入口
- 交互：`QUANTAXIS/__main__.py`（CLI）、`QAWebServer`（HTTP API）、Jupyter（`examples/`）
- 文档：`doc/*.md`、`README.md`、`STU/*.md`

我已完成结构梳理与全链路说明。如需，我可以按你的业务重点画一张更具体的流程图或给出最小可跑示例脚本。


好，我们用一个**完整的量化交易全链路例子**，结合 QUANTAXIS 的各个模块，把**模块调用关系、函数、数据流、交易流**都梳理清楚。这样你就能看到“从抓数据 → 回测 → 实盘 → 风控”整个运作流程，而不仅仅是单独看一个模块。

---

# QUANTAXIS 全链路模块调用示例

假设场景：你想写一个策略，**买入最近一周涨幅最大的股票，持有 5 天卖出**，整个流程从数据抓取到模拟交易再到风控。

---

## 1️⃣ 数据获取（Data Fetch + Save）

**目标**：获取股票日线数据，并存到数据库

### 调用流程

```python
from QUANTAXIS.QASU.save_stock_day import QA_SU_save_stock_day

# 外部调用 QASU 接口
QA_SU_save_stock_day('000001')
```

* **内部调用**：

  1. `QA_SU_save_stock_day()` → 负责抓数据并存库
  2. 调用 `QAFetch.QATdx.QA_fetch_get_stock_day('000001')` → 抓取原始日线
  3. 数据转成统一结构 `QA_DataStruct_Stock_day`
  4. 调用 `QA_util_sql_mongo_insert()` → 存入 MongoDB

📌 数据流：
`QAFetch抓数据 → QADataStruct标准化 → MongoDB落库`

---

## 2️⃣ 数据查询（Query）

**目标**：策略用到数据时，优先从数据库查

```python
from QUANTAXIS.QAQuery.QAQuery import QA_fetch_stock_day_adv

data = QA_fetch_stock_day_adv('000001', '2025-01-01', '2025-03-01')
```

* 内部先查 MongoDB
* 如果缺失数据，fallback 调用 QAFetch 抓取
* 输出 `QA_DataStruct_Stock_day` → 可以直接给策略用

---

## 3️⃣ 策略开发（Strategy）

**策略逻辑**：

```python
from QUANTAXIS.QAStrategy import StrategyTemplate

class MyStrategy(StrategyTemplate):
    def on_bar(self, event):
        df = self.data  # QA_DataStruct
        # 选出最近一周涨幅最大的股票
        target = df.select_top_gain(days=5)
        for code in target:
            self.buy(code, 100)  # 发买入信号
```

* **调用模块**：

  * `QAStrategy.on_bar()` → 每收到新 bar 执行策略逻辑
  * `QAIndicator` 或自定义因子计算
  * 最终生成交易信号（`buy()` / `sell()`）

---

## 4️⃣ 回测（Backtest）

```python
from QUANTAXIS.QABacktest import run_backtest

run_backtest(MyStrategy, start='2025-01-01', end='2025-03-01')
```

* **内部调用**：

  1. 回测引擎读取历史数据（QA_fetch / QAQuery）
  2. 调用策略 `on_bar()` → 生成交易信号
  3. `QAMarket.match()` → 撮合成交，考虑手续费、滑点
  4. `QAAccount.update()` → 更新账户持仓、资金

📌 数据流 + 交易流：
`历史数据 → 策略 → 交易信号 → 撮合成交 → 更新账户`

---

## 5️⃣ 模拟 / 实盘交易

```python
from QUANTAXIS.QASim import QASim

sim = QASim()
sim.run(strategy=MyStrategy)
```

* **内部调用**：

  * 策略信号生成 → `QAAccount.update()` 模拟账户更新
  * 如果实盘：`QIFI.send_order()` → 发单到券商
* **client**：

  * 模拟交易：内部 client 对象模拟下单
  * 实盘交易：QIFIClient 或券商 API 客户端

---

## 6️⃣ 风控（Risk）

* `QAAccount.risk_control()` → 每次账户更新时检查资金占用、最大回撤
* `QARisk.compute()` → 定期计算风险指标

---

## 🔗 全链路总结（函数级）

```
# 数据端
QA_SU_save_stock_day(code)
    └─ QA_fetch_get_stock_day(code)
        └─ QADataStruct → QA_util_sql_mongo_insert → MongoDB

# 查询数据
QA_fetch_stock_day_adv(code)
    └─ MongoDB 查数据
    └─ 缺失部分 fallback → QA_fetch_get_stock_day

# 策略端
StrategyTemplate.on_bar()
    └─ 选股 / 因子计算 (QAIndicator / QAFactor)
    └─ buy()/sell() 生成交易信号

# 回测端
run_backtest(strategy)
    └─ 调用策略 on_bar()
    └─ QAMarket.match() 撮合成交
    └─ QAAccount.update() 更新账户

# 模拟/实盘
QASim.run(strategy)
    └─ QAAccount.update() / QIFI.send_order()
    └─ client 执行下单

# 风控
QAAccount.risk_control()
QARisk.compute()
```

---

💡 **理解要点**

1. **数据线**：QAFetch → QADataStruct → MongoDB → QAQuery → 策略
2. **交易线**：策略 on_bar → 交易信号 → 撮合 / 模拟 / 实盘 → QAAccount → 风控
3. **client 角色**：负责“跟外部服务交互”，包括数据抓取、数据库、实盘交易

---

我可以帮你画一张 **全链路函数调用图**，把模块、函数、数据流和交易流都标出来，像流水线一样直观展示。

你希望我画这个图吗？


完美，我们把整个 QUANTAXIS 全链路用一张**函数级流水线图**来表示，标明每个模块、函数以及数据/交易流的关系。

---

## QUANTAXIS 全链路函数调用图（示意）

```
┌───────────────────────────────┐
│         数据抓取端             │
│                               │
│  QA_SU_save_stock_day(code)    │
│      └─ QA_fetch_get_stock_day │
│          └─ client (TdxHq/Tushare)抓数据
│      └─ QADataStruct标准化数据
│      └─ QA_util_sql_mongo_insert → MongoDB
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│         数据查询端             │
│                               │
│  QA_fetch_stock_day_adv(code) │
│      └─ 查询 MongoDB 数据      │
│      └─ 缺失 fallback → QA_fetch_get_stock_day
│      └─ 返回 QA_DataStruct    │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│         策略开发端             │
│                               │
│ StrategyTemplate.on_bar()      │
│      └─ QAIndicator / QAFactor│
│      └─ buy()/sell()生成交易信号 │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│         回测端                 │
│                               │
│ run_backtest(strategy)        │
│      └─ 调用策略 on_bar()     │
│      └─ QAMarket.match()      │
│      └─ QAAccount.update()    │
│      └─ performance()         │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│     模拟/实盘交易端            │
│                               │
│ QASim.run(strategy)            │
│      └─ QAAccount.update()     │
│      └─ QIFI.send_order()      │
│      └─ client (券商API)执行下单 │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│         风控端                 │
│                               │
│ QAAccount.risk_control()       │
│ QARisk.compute()               │
│      └─ 最大回撤、资金占用、VaR │
└───────────────────────────────┘
```

---

### 🔹 图解说明

1. **数据线（左上 → 中）**

   * QAFetch 抓数据 → QADataStruct 标准化 → MongoDB → QAQuery 查询
   * 所有策略/回测都用这个标准化数据

2. **策略线（中 → 右上）**

   * 策略 `on_bar` / `on_tick` → 生成交易信号 → 回测/实盘处理

3. **交易线（右中 → 下）**

   * 回测：`QAMarket.match()` → `QAAccount.update()`
   * 实盘：`QIFI.send_order()` → client 执行订单

4. **风控线（最下）**

   * QAAccount/ QARisk 定期检查账户、风控指标

5. **client 角色**

   * 数据抓取（TdxHq/Tushare）
   * 实盘交易（券商 API）
   * 封装外部通信，策略无需关心底层细节

---

💡 这个图展示了 **从数据抓取到交易执行再到风控**的完整链路，每个模块对应的函数和作用都明确。

如果你愿意，我可以帮你画一张 **可视化流程图**，用彩色箭头区分 **数据流 / 交易流 / 风控流**，更直观好理解。

你希望我画这个可视化版本吗？
