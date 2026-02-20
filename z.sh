#!/bin/bash

# 使用 shopt 包含隱藏檔案，並讓 * 匹配所有檔案
shopt -s dotglob

for name in src; do
  # 排除目錄（cat 不能讀取目錄）、排除特定檔案、排除 . 和 ..
  if [ -f "$name" ] && [ "$name" != "pnpm-lock.yaml" ] && [ "$name" != "z.sh" ]; then
    printf "File: %s\n" "$name"
    printf "=====================\n"
    cat "$name"
    printf "\n\n"
  fi
done
