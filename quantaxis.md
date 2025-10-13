# Quantaxis开源项目

## 项目结构

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

## QUANTAXIS 全链路模块调用示例

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





我先打开并阅读 `myexamples/test.py` 的内容，梳理其导入模块、调用的函数与执行流程。
Ran tool

我将检索 QUANTAXIS 代码库中这几个关键符号的定义与实现位置，以便准确梳理该脚本涉及的模块与函数调用流程。随后我会给出结构化、逐步的执行链路说明。
Ran tool
Ran tool
Ran tool
Ran tool
Ran tool

我先精确定位 `QACTABase`、`QA_backtest` 等符号的定义位置和调用栈，以确保流程梳理准确无误。接着我会给出结构化的模块/函数清单与执行顺序。
Ran tool
Ran tool

Ran tool

Ran tool

Ran tool

Ran tool

Ran tool

Ran tool

Ran tool

Ran tool

Ran tool

我已阅读 `myexamples/test.py` 并检索关联符号定义，现在给出模块/函数清单与执行链路，指出潜在问题并给出最小修正建议。

### 涉及模块与关键函数

- 数据获取
  - QUANTAXIS.QAFetch.QAQuery_Advance: `QA_fetch_stock_day_adv(code, start, end)` → 返回 `QA_DataStruct_Stock_day`
    
    ```108:150:QUANTAXIS/QAFetch/QAQuery_Advance.py
    def QA_fetch_stock_day_adv(
    code,
    start='all',
    end=None,
    if_drop_index=True,
    collections=DATABASE.stock_day
    ):
    '获取股票日线'
    ...
    res = QA_fetch_stock_day(code, start, end, format='pd', collections= collections)
    ...
    return QA_DataStruct_Stock_day(res_reset_index)
    ```
- 数据结构
  - QUANTAXIS.QAData.QADataStruct: `QA_DataStruct_Stock_day(init_data_by_df)`
    
    ```114:146:QUANTAXIS/QAData/QADataStruct.py
    class QA_DataStruct_Stock_day(_quotation_base):
    '''
        股票日线数据
    '''
    def __init__(self, init_data_by_df, dtype='stock_day', if_fq='bfq'):
        super().__init__(init_data_by_df, dtype, if_fq)
    ```
- 技术指标
  - QUANTAXIS.QAIndicator.base: `MA(Series, N)`（简单滚动均线）
    
    ```44:46:QUANTAXIS/QAIndicator/base.py
    def MA(Series, N):
    return pd.Series.rolling(Series, N).mean()
    ```
- 策略基类与回测
  - 当前代码库导出的是 `QAStrategyCtaBase`（未发现名为 `QACTABase` 的类别名）
    
    ```279:286:QUANTAXIS/__init__.py
    from QUANTAXIS.QAStrategy.qactabase import QAStrategyCtaBase
    ...
    from QUANTAXIS.QAFactor.featureAnalysis import QAFeatureAnalysis
    ```
  - `QAStrategyCtaBase` 提供回测入口 `run_backtest()`（以及 on_bar 回调等）
    
    ```181:197:QUANTAXIS/QAStrategy/qactabase.py
    def run_backtest(self):
    self.debug()
    self.acc.save()
    risk = QA_Risk(self.acc)
    risk.save()
    ...
    ```

### `test.py` 实际调用链（逐步）

1. `import QUANTAXIS as QA`
   - 触发导入 `QAWebServer/QIFI/QAStrategy` 等；若本机 MongoDB 未启动，会在导入阶段尝试连接 `127.0.0.1:27017` 并报错（你已遇到）。
2. `data = QA.QA_fetch_stock_day_adv('000001', '2020-01-01', '2020-12-31')`
   - 走 MongoDB `stock_day` 集合读取，返回 `QA_DataStruct_Stock_day`。
3. `stock_data = QA.QA_DataStruct_Stock_day(data)`
   - 多余且不正确：`QA_fetch_stock_day_adv` 已返回数据结构，不是 DataFrame；再次构造会类型不匹配。
4. `ma20 = QA.MA(stock_data.close, 20)`
   - 使用滚动均线函数，`stock_data.close` 为单标的时是 Series，计算 20 日均线。
5. 定义策略 `class MyStrategy(QA.QACTABase): ...`
   - 当前版本并无 `QA.QACTABase` 别名，应改为 `QAStrategyCtaBase`。
   - `on_bar(self, bar)` 中调用 `self.buy(...)`；在 CTA 基类里更常用的是 `buy_open/sell_open/...` 等方法，未检到 `buy` 简写。
6. `result = QA.QA_backtest(MyStrategy, stock_data)`
   - 代码库中未找到 `QA_backtest` 函数；CTA 基类提供的是 `run_backtest()` 流程，或文档里的 `QA_Backtest` 类。

### 关键外部依赖/环境

- MongoDB：导入 QUANTAXIS 即会引用 QIFI/Mongo 组件，需本地 `mongod` 可用或改为不触发相关模块。
- 数据源：`QA_fetch_stock_day_adv` 默认读 Mongo 中的 `stock_day` 集合。
- 指标/分析：`pyfolio/alphalens/seaborn` 等在其他示例中会提示告警，与本脚本无关。

### 存在问题与修正建议

- 名称不匹配：`QACTABase` → 使用 `QAStrategyCtaBase`（或在你代码里加别名）。
- 回测入口不存在：`QA_backtest` → 使用 CTA 基类自带的 `run_backtest()` 流程。
- 重复包装：删除第二次 `QA_DataStruct_Stock_day(...)` 构造，直接用 `data`。
- 下单方法：将 `self.buy(...)` 改为 `self.buy_open(...)`（并传入价格/时间等所需参数）。

### 最小修改示意（仅供参考）

```python:/home/rying/QUANTAXIS/myexamples/test.py
import QUANTAXIS as QA
from QUANTAXIS.QAStrategy.qactabase import QAStrategyCtaBase as QACTABase
from QUANTAXIS.QAIndicator.base import MA

data = QA.QA_fetch_stock_day_adv('000001', '2020-01-01', '2020-12-31')
stock_data = data  # 已是 QA_DataStruct_Stock_day
ma20 = MA(stock_data.close, 20)

class MyStrategy(QACTABase):
    def on_bar(self, bar):
        if bar.close > ma20.iloc[-1]:
            self.buy_open(bar.code, 100, str(bar.date), bar.close)

# 需要按 CTA 基类要求初始化并调用 run_backtest()
# MyStrategy(code='000001', start='2020-01-01', end='2020-12-31').run_backtest()
```

如需，我可以把脚本改成可运行版本（含 Mongo 启动/连接参数与回测调用）。
