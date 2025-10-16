# Python

## 虚拟环境

```bash
python -m venv venv_name      # 创建虚拟环境
source venv_name/bin/activate # 激活 (Linux/Mac)
venv_name\Scripts\activate    # 激活 (Windows)
deactivate                    # 退出虚拟环境
```

## pip包管理

```bash
pip install -r requirements.txt     # 从配置文件安装依赖
pip install package_name            # 安装包
pip install package_name -i https://pypi.tuna.tsinghua.edu.cn/simple # 临时切换源
pip install package_name==1.2.3     # 安装指定版本
pip install -U package_name         # 升级包
pip uninstall package_name          # 卸载包
pip list                            # 列出已安装包
pip config list                     # 检查当前源
pip show package_name               # 查看包信息
pip freeze > requirements.txt       # 导出依赖
```

### python源码构建

```bash
python -m pip install build
python -m build


# 安装
pip install module.whl
pip install --upgrade xxx.whl # 升级安装
/path/to/python -m pip install xxx.whl # 指定python解释器
pip install xxx.whl --no-deps # 不自动安装依赖
pip install --force-reinstall xxx.whl # 强制安装，适用于版本号一样，需要强制更新
```



## 日志包 loguru

```python
from loguru import logger
import time
import os

def setup_logging():
    """
    设置日志配置，输出到monitor_log文件夹中的单个文件
    """
    # 使用已存在的monitor_log目录
    log_dir = os.path.join(os.path.dirname(__file__), "monitor_log")

    # 移除默认的stderr输出
    logger.remove()

    # 按日期命名的单个日志文件
    today = datetime.now().strftime("%Y%m%d")

    # 添加所有级别的日志到单个文件
    logger.add(
        os.path.join(log_dir, f"sip_monitor_{today}.log"),
        rotation="1 day",  # 每天轮转
        retention="30 days",  # 保留30天
        level="INFO",  # 包含info以上级别
        format="{time:YYYY-MM-DD HH:mm:ss} | {level} | {name}:{function}:{line} | {message}",
        encoding="utf-8"
    )

    # 同时在控制台输出
    logger.add(
        lambda msg: print(msg, end=""),
        level="INFO",
        format="<green>{time:HH:mm:ss}</green> | <level>{level}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> | <level>{message}</level>"
    )
```

## jupyter

### 安装

```bash

```

## Linux配置anaconda

链接：[https://repo.anaconda.com/archive/](https://repo.anaconda.com/archive/)

```bash
# 例如下载 Python 3.12 版本的 64 位安装包
wget https://repo.anaconda.com/archive/Anaconda3-2025.06-1-Linux-x86_64.sh
bash Anaconda3-2025.06-1-Linux-x86_64.sh

conda update -n base -c defaults conda
```

### 启动

```bash
jupyter lab
```

## Windows anaconda安装及配置

链接：https://repo.anaconda.com/archive/

### Windows配置jupyter lab默认打开路径

要让 **JupyterLab 在 D 盘根目录** 打开，简要步骤如下：

1. **生成配置文件（如果没生成过）**

```bash
jupyter lab --generate-config
```

2. **编辑配置文件**
- 配置文件路径：`C:\Users\<用户名>\.jupyter\jupyter_lab_config.py`

- 找到并修改这一行：

```python
c.LabApp.notebook_dir = 'D:/'
```

3. **启动 JupyterLab**
- 通过 **Anaconda Navigator** 或命令行启动，默认打开 D 盘根目录
4. **可选快捷方式**
- 创建桌面快捷方式，目标写：

```bash
jupyter lab --notebook-dir="D:/"
```

- 双击即可直接打开 D 盘根目录。
