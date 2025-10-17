# Git

---

![git.jpg](C:\Users\ruanying\Pictures\git.jpg)

## 📂 仓库操作

```bash
git init                  # 初始化本地仓库
git clone <url>           # 从远程仓库克隆项目
```

---

## 📌 查看状态

```bash
git status                # 查看当前状态（改了哪些文件）
git log                   # 查看提交历史
git log --oneline --graph # 精简显示提交历史（推荐）
```

---

## ✍️ 提交代码

```bash
git add <file>            # 把文件放到暂存区
git add .                 # 把所有修改的文件放到暂存区
git commit -m "说明"       # 提交到本地仓库
```

---

## 🚀 推送与更新

```bash
git push origin main      # 推送到远端 main 分支
git push -u origin main   # 第一次推送并绑定分支
git pull origin main      # 从远端拉取更新
```

---

## 🔄 分支操作

```bash
git branch                # 查看本地分支
git branch -a             # 查看本地 + 远程分支
git checkout -b dev       # 新建并切换到 dev 分支
git checkout main         # 切换回 main 分支
git merge dev             # 把 dev 分支合并到当前分支
```

---

## 🛠️ 撤销/恢复

```bash
git checkout -- <file>    # 撤销文件改动（回到最后一次提交）
git reset --hard HEAD     # 撤销所有改动，回到最新提交
git reset --hard <commit> # 回退到某个历史版本
```

---

## 📦 远程仓库

```bash
git remote -v             # 查看远程仓库地址
git remote add origin <url> # 绑定远程仓库
```

---

## 💡 日常最常用的组合

1. 克隆项目：
   
   ```bash
   git clone <url>
   cd 项目目录
   ```

2. 更新代码：
   
   ```bash
   git pull
   ```

3. 提交推送：
   
   ```bash
   git add .
   git commit -m "更新了某某功能"
   git push
   ```

4. 切换远程仓库地址：
   
   ```bash
   git remote set-url origin <url>   
   git remote add upstream <origin_url> # 给原连接添加别名
   git remote -v # 查看结果
   ```

---

## 💡 其他

### 设置代理

```bash
# 设置代理
git config --global http.proxy http://127.0.0.1:7890
git config --global https.proxy http://127.0.0.1:7890
# 查看当前配置
git config --global --get http.proxy
git config --global --get https.proxy
# 取消代理
git config --global --unset http.proxy
git config --global --unset https.proxy
```

### 设置用户名

```bash
git config --global user.name "你的用户名"
git config --global user.email"你的邮箱"
```
