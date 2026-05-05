@echo off
chcp 65001 >nul
title 玄女AI - 启动中...

echo ================================
echo   玄女AI - 开发服务器启动
echo ================================
echo.

:: 检查 node_modules 是否存在
if not exist "node_modules\" (
    echo [1/2] 首次运行，正在安装依赖...
    call npm install
    echo.
)

echo [2/2] 启动 Vite 开发服务器...
echo.
echo 浏览器将自动打开
echo 按 Ctrl+C 停止服务器
echo.

call npm start

pause
