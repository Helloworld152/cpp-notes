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
pip install package_name==1.2.3     # 安装指定版本
pip install -U package_name         # 升级包
pip uninstall package_name          # 卸载包
pip list                            # 列出已安装包
pip show package_name               # 查看包信息
pip freeze > requirements.txt       # 导出依赖
```


